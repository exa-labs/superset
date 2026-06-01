import { execFile, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

interface CdpTarget {
	id: string;
	title: string;
	type: string;
	url: string;
	webSocketDebuggerUrl?: string;
}

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}

interface RuntimeEvaluationResult {
	result: { value?: unknown };
	exceptionDetails?: unknown;
}

const execFileAsync = promisify(execFile);
const DEBUG_PORT = process.env.RENDERER_REMOTE_DEBUG_PORT ?? "9222";
const RENDERER_ORIGIN =
	process.env.DASHBOARD_BROWSER_SMOKE_RENDERER_ORIGIN ??
	"http://localhost:3025";
const DEVIN_APP_ID = "devin";
const DEFAULT_TIMEOUT_MS = 120_000;
const WORKSPACE_ROOT = path.resolve(import.meta.dir, "../../..");
const DESKTOP_DIR = path.join(WORKSPACE_ROOT, "apps/desktop");
const ROOT_ENV_PATH = path.join(WORKSPACE_ROOT, ".env");
const LOG_PATH = path.join(
	WORKSPACE_ROOT,
	"superset-dev-data/dashboard-browser-cookie-restart.log",
);
let managedDesktopChild: ReturnType<typeof spawn> | null = null;

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function unquoteEnvValue(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function getConfiguredApiUrl(): string {
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL;
	}

	try {
		const rootEnv = readFileSync(ROOT_ENV_PATH, "utf8");
		let apiUrl: string | null = null;
		for (const line of rootEnv.split(/\r?\n/)) {
			const match = /^NEXT_PUBLIC_API_URL\s*=\s*(.*)$/.exec(line.trim());
			if (!match) continue;
			apiUrl = unquoteEnvValue(match[1] ?? "");
		}
		if (apiUrl) return apiUrl;
	} catch {}

	return "http://localhost:3001";
}

const API_URL = getConfiguredApiUrl().replace(/\/$/, "");

async function waitFor<T>(
	check: () => Promise<T | null | false | undefined>,
	label: string,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const result = await check();
		if (result) return result;
		await delay(250);
	}
	throw new Error(`Timed out waiting for ${label}`);
}

async function isLocalApiReachable(): Promise<boolean> {
	try {
		const response = await fetch(`${API_URL}/api/auth/session`, {
			signal: AbortSignal.timeout(3_000),
		});
		return response.status < 500;
	} catch {
		return false;
	}
}

async function waitForLocalApi(): Promise<void> {
	try {
		await waitFor(isLocalApiReachable, `local API at ${API_URL}`, 30_000);
	} catch (error) {
		throw new Error(
			[
				`Local API is not reachable at ${API_URL}.`,
				'Start the full root dev graph with "bun run dev" or "superset-dev" from the repo root, then retry.',
				"The desktop-only dev server cannot complete local sign-in or cookie persistence smoke tests.",
			].join(" "),
			{ cause: error },
		);
	}
}

async function getTargets(): Promise<CdpTarget[]> {
	const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
	if (!response.ok) return [];
	return (await response.json()) as CdpTarget[];
}

async function getRendererTarget(): Promise<CdpTarget | null> {
	try {
		const targets = await getTargets();
		return (
			targets.find(
				(target) =>
					target.type === "page" && target.url.startsWith(RENDERER_ORIGIN),
			) ?? null
		);
	} catch {
		return null;
	}
}

class CdpClient {
	private nextId = 0;
	private pending = new Map<number, PendingRequest>();

	private constructor(private readonly socket: WebSocket) {
		this.socket.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data)) as Record<string, unknown>;
			const id = typeof message.id === "number" ? message.id : null;
			if (id === null || !this.pending.has(id)) return;
			const pending = this.pending.get(id);
			this.pending.delete(id);
			if (!pending) return;
			if (message.error) {
				pending.reject(new Error(JSON.stringify(message.error)));
			} else {
				pending.resolve(message.result);
			}
		});
	}

	static async connect(target: CdpTarget): Promise<CdpClient> {
		assert(
			target.webSocketDebuggerUrl,
			`CDP target ${target.id} has no websocket URL`,
		);
		const socket = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise<void>((resolve, reject) => {
			socket.addEventListener("open", () => resolve(), { once: true });
			socket.addEventListener("error", () => reject(new Error("CDP failed")), {
				once: true,
			});
		});
		const client = new CdpClient(socket);
		await client.send("Runtime.enable");
		await client.send("Page.enable").catch(() => undefined);
		return client;
	}

	send(method: string, params: Record<string, unknown> = {}) {
		return new Promise<unknown>((resolve, reject) => {
			const id = ++this.nextId;
			const timeoutId = setTimeout(() => {
				if (!this.pending.has(id)) return;
				this.pending.delete(id);
				reject(new Error(`Timed out waiting for CDP ${method}`));
			}, 12_000);
			this.pending.set(id, {
				resolve: (value) => {
					clearTimeout(timeoutId);
					resolve(value);
				},
				reject: (error) => {
					clearTimeout(timeoutId);
					reject(error);
				},
			});
			this.socket.send(JSON.stringify({ id, method, params }));
		});
	}

	async evaluate<T>(expression: string): Promise<T> {
		const evaluation = (await this.send("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		})) as RuntimeEvaluationResult;
		if (evaluation.exceptionDetails) {
			throw new Error(JSON.stringify(evaluation.exceptionDetails));
		}
		return evaluation.result.value as T;
	}

	close() {
		this.socket.close();
	}
}

async function connectRenderer(): Promise<CdpClient> {
	const target = await waitFor(getRendererTarget, "renderer CDP target");
	return CdpClient.connect(target);
}

async function findDesktopProcessIds(): Promise<number[]> {
	const { stdout } = await execFileAsync("ps", ["-axo", "pid=,command="]);
	return stdout
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.includes(WORKSPACE_ROOT))
		.filter((line) => {
			if (line.includes("smoke-dashboard-browser-cookie-restart")) return false;
			if (line.includes("electron-vite dev --watch")) return true;
			if (line.includes("apps/desktop/node_modules/.bin/cross-env"))
				return true;
			if (!line.includes("Clankee (devenv-setup).app")) return false;
			if (line.includes("Electron Helper")) return false;
			if (line.includes("terminal-host.js")) return false;
			if (line.includes("host-service.js")) return false;
			return line.endsWith(" Electron .") || line.endsWith("/Electron .");
		})
		.map((line) => Number.parseInt(line.split(/\s+/, 1)[0] ?? "", 10))
		.filter(Number.isFinite);
}

async function stopDesktopDev(): Promise<void> {
	const pids = await findDesktopProcessIds();
	for (const pid of pids) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {}
	}
	await delay(2_000);
	for (const pid of await findDesktopProcessIds()) {
		try {
			process.kill(pid, "SIGKILL");
		} catch {}
	}
	await waitFor(
		async () => ((await getRendererTarget()) ? null : true),
		"desktop stopped",
	);
}

function startDesktopDev(): void {
	mkdirSync(path.dirname(LOG_PATH), { recursive: true });
	const logFd = openSync(LOG_PATH, "a");
	const child = spawn(process.execPath, ["run", "dev"], {
		cwd: DESKTOP_DIR,
		env: {
			...process.env,
			RENDERER_REMOTE_DEBUG_PORT: DEBUG_PORT,
		},
		stdio: ["ignore", logFd, logFd],
	});
	managedDesktopChild = child;
	closeSync(logFd);
}

async function ensureDesktopRunning(): Promise<void> {
	if (await getRendererTarget()) return;
	startDesktopDev();
	await waitFor(getRendererTarget, "desktop started");
}

async function ensureSignedIn(page: CdpClient): Promise<void> {
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`(() => {
					try {
						return location.origin === ${JSON.stringify(RENDERER_ORIGIN)} &&
							document.readyState !== "loading" &&
							typeof localStorage !== "undefined";
					} catch {
						return false;
					}
				})()`,
			),
		"renderer document ready",
	);
	const clicked = await page.evaluate<boolean>(
		`(() => {
			if (!location.hash.startsWith("#/sign-in")) return false;
			const button = Array.from(document.querySelectorAll("button")).find(
				(node) => node.textContent?.includes("Sign in as Local Admin")
			);
			if (!(button instanceof HTMLButtonElement)) return false;
			button.click();
			return true;
		})()`,
	);
	if (clicked) {
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`!location.hash.startsWith("#/sign-in") && !document.body.innerText.includes("Cannot reach the local API")`,
				),
			"dev sign-in completed",
		);
	}
}

async function openDevinDefaultWebview(page: CdpClient): Promise<void> {
	await page.evaluate(
		`(() => {
			const raw = localStorage.getItem("dashboard-web-tabs-v1");
			const parsed = raw ? JSON.parse(raw) : [];
			const tab = Array.isArray(parsed)
				? parsed.find((item) => item?.appId === ${JSON.stringify(DEVIN_APP_ID)})
				: null;
			const tabId = typeof tab?.id === "string" ? tab.id : "devin-default";
			location.hash = "#/web-tabs/" + tabId;
		})()`,
	);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`Boolean(document.querySelector('[data-dashboard-web-view-cache-key="tab:devin-default"] [data-dashboard-browser-tab-id="default"] webview'))`,
			),
		"Devin default webview",
	);
}

async function executeInDevinDefaultWebview<T>(
	page: CdpClient,
	code: string,
): Promise<T> {
	const result = await page.evaluate<{
		ok: boolean;
		result?: T;
		error?: string;
	}>(
		`(async () => {
			const node = document.querySelector('[data-dashboard-web-view-cache-key="tab:devin-default"] [data-dashboard-browser-tab-id="default"] webview');
			if (!node) return { ok: false, error: "missing webview" };
			try {
				const result = await node.executeJavaScript(${JSON.stringify(code)});
				return { ok: true, result };
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		})()`,
	);
	assert(result.ok, result.error ?? "webview JavaScript failed");
	return result.result as T;
}

async function prepareRenderer(): Promise<CdpClient> {
	await waitForLocalApi();
	await ensureDesktopRunning();
	const page = await connectRenderer();
	await ensureSignedIn(page);
	await openDevinDefaultWebview(page);
	return page;
}

async function main() {
	const cookieName = `clankee_restart_smoke_${Date.now().toString(36)}`;
	const cookieValue = crypto.randomUUID();

	let page = await prepareRenderer();
	try {
		const before = await executeInDevinDefaultWebview<string>(
			page,
			`document.cookie = ${JSON.stringify(
				`${cookieName}=${cookieValue}; path=/; max-age=3600; SameSite=Lax`,
			)}; document.cookie;`,
		);
		assert(
			before.includes(`${cookieName}=${cookieValue}`),
			"cookie was not set",
		);
		await delay(1_500);
	} finally {
		page.close();
	}

	await stopDesktopDev();
	page = await prepareRenderer();
	try {
		const after = await executeInDevinDefaultWebview<string>(
			page,
			"document.cookie",
		);
		assert(
			after.includes(`${cookieName}=${cookieValue}`),
			"cookie did not survive desktop restart",
		);
		await executeInDevinDefaultWebview(
			page,
			`document.cookie = ${JSON.stringify(
				`${cookieName}=; path=/; max-age=0; SameSite=Lax`,
			)}; document.cookie;`,
		);
		console.log(
			JSON.stringify(
				{
					ok: true,
					cookieName,
					verifiedIn: "dashboard-web:devin-default:default",
				},
				null,
				2,
			),
		);
	} finally {
		page.close();
	}
}

await main();
managedDesktopChild?.unref();
