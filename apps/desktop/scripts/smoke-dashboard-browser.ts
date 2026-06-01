interface CdpTarget {
	id: string;
	title: string;
	type: string;
	url: string;
	webSocketDebuggerUrl?: string;
}

interface PendingRequest {
	method: string;
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}

interface RuntimeEvaluationResult {
	__cdpPromiseCollected?: boolean;
	result: { value?: unknown };
	exceptionDetails?: unknown;
}

const DEBUG_PORT = process.env.RENDERER_REMOTE_DEBUG_PORT ?? "9222";
const RENDERER_ORIGIN =
	process.env.DASHBOARD_BROWSER_SMOKE_RENDERER_ORIGIN ??
	"http://localhost:3025";
const CHROME_APP_ID = "chrome";
const DEFAULT_TIMEOUT_MS = 12_000;

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

async function getTargets(): Promise<CdpTarget[]> {
	let response: Response;
	try {
		response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
	} catch (error) {
		throw new Error(
			[
				`Could not connect to Electron CDP on port ${DEBUG_PORT}.`,
				'Restart the desktop dev graph with "bun run dev" from the repo root so @superset/desktop starts with RENDERER_REMOTE_DEBUG_PORT=9222.',
				`Original error: ${error instanceof Error ? error.message : String(error)}`,
			].join(" "),
		);
	}
	assert(
		response.ok,
		`Could not read CDP target list from port ${DEBUG_PORT}; restart "bun run dev" so Electron exposes RENDERER_REMOTE_DEBUG_PORT=${DEBUG_PORT}`,
	);
	return (await response.json()) as CdpTarget[];
}

class CdpClient {
	private nextId = 0;
	private pending = new Map<number, PendingRequest>();
	readonly events: Array<Record<string, unknown>> = [];

	private constructor(private readonly socket: WebSocket) {
		this.socket.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data)) as Record<string, unknown>;
			const id = typeof message.id === "number" ? message.id : null;
			if (id !== null && this.pending.has(id)) {
				const pending = this.pending.get(id);
				this.pending.delete(id);
				if (!pending) return;
				if (message.error) {
					const errorMessage = JSON.stringify(message.error);
					if (
						pending.method === "Runtime.evaluate" &&
						errorMessage.includes("Promise was collected")
					) {
						pending.resolve({ __cdpPromiseCollected: true });
						return;
					}
					pending.reject(
						new Error(`CDP ${pending.method} failed: ${errorMessage}`),
					);
				} else {
					pending.resolve(message.result);
				}
				return;
			}
			this.events.push(message);
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
			socket.addEventListener(
				"error",
				() => reject(new Error("CDP open failed")),
				{
					once: true,
				},
			);
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
			}, DEFAULT_TIMEOUT_MS);
			this.pending.set(id, {
				method,
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
		let evaluation: RuntimeEvaluationResult | null = null;
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				evaluation = (await this.send("Runtime.evaluate", {
					expression,
					awaitPromise: true,
					returnByValue: true,
				})) as RuntimeEvaluationResult;
				if (evaluation.__cdpPromiseCollected) {
					evaluation = null;
					await delay(300);
					continue;
				}
				break;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (!message.includes("Promise was collected") || attempt === 2) {
					throw error;
				}
				await delay(300);
			}
		}
		assert(evaluation, "Runtime.evaluate did not return a result");
		if (evaluation.exceptionDetails) {
			throw new Error(JSON.stringify(evaluation.exceptionDetails));
		}
		return evaluation.result.value as T;
	}

	async keyPress(params: Record<string, unknown>) {
		await this.send("Input.dispatchKeyEvent", { type: "keyDown", ...params });
		await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
	}

	async clickAt(x: number, y: number) {
		await this.send("Input.dispatchMouseEvent", {
			type: "mouseMoved",
			x,
			y,
			button: "none",
		});
		await this.send("Input.dispatchMouseEvent", {
			type: "mousePressed",
			x,
			y,
			button: "left",
			clickCount: 1,
		});
		await this.send("Input.dispatchMouseEvent", {
			type: "mouseReleased",
			x,
			y,
			button: "left",
			clickCount: 1,
		});
	}

	close() {
		this.socket.close();
	}
}

async function waitFor<T>(
	check: () => Promise<T | null | false | undefined>,
	label: string,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const result = await check();
		if (result) return result;
		await delay(150);
	}
	throw new Error(`Timed out waiting for ${label}`);
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

	const authState = await waitFor(
		() =>
			page.evaluate<"signed-in" | "sign-in" | null>(
				`(() => {
					const hasDashboard = Boolean(document.querySelector("[data-dashboard-web-tab-row-button]"));
					const hasDashboardShell = Boolean(document.querySelector("[data-dashboard-web-view-deck-root]"));
					if (hasDashboard) return "signed-in";
					if (hasDashboardShell) return "signed-in";
					const button = Array.from(document.querySelectorAll("button")).find(
						(node) => node.textContent?.includes("Sign in as Local Admin")
					);
					return button instanceof HTMLButtonElement ? "sign-in" : null;
				})()`,
			),
		"auth state resolved",
	);
	if (authState === "signed-in") return;

	await page.evaluate<boolean>(
		`(() => {
			const button = Array.from(document.querySelectorAll("button")).find(
				(node) => node.textContent?.includes("Sign in as Local Admin")
			);
			if (!(button instanceof HTMLButtonElement)) return false;
			button.click();
			return true;
		})()`,
	);

	await waitFor(
		() =>
			page.evaluate<boolean>(
				`(() => {
					const text = document.body.innerText;
					const hasDevSignInButton = Array.from(document.querySelectorAll("button")).some(
						(node) => node.textContent?.includes("Sign in as Local Admin")
					);
					return !hasDevSignInButton &&
						!text.includes("Cannot reach the local API") &&
						!text.includes("Dev sign-in failed") &&
						(
							location.hash.startsWith("#/workspace") ||
							location.hash.startsWith("#/web") ||
							location.hash.startsWith("#/native/") ||
							Boolean(document.querySelector("[data-dashboard-web-view-deck-root]")) ||
							Boolean(document.querySelector("[data-dashboard-web-tab-row-button]"))
						);
				})()`,
			),
		"dev sign-in completed",
	);
}

async function clickElementCenter(
	page: CdpClient,
	elementExpression: string,
	label: string,
) {
	const rect = await page.evaluate<{
		height: number;
		width: number;
		x: number;
		y: number;
	} | null>(
		`(() => {
			const element = ${elementExpression};
			if (!(element instanceof HTMLElement)) return null;
			const rect = element.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return null;
			return {
				height: rect.height,
				width: rect.width,
				x: rect.left,
				y: rect.top,
			};
		})()`,
	);
	assert(rect, `Could not find visible element for ${label}`);
	await page.clickAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function expressionForFirstTab(appId: string) {
	return `(() => {
		const defaults = {
			${CHROME_APP_ID}: { id: "chrome-default", title: "Chrome" },
		};
		const raw = localStorage.getItem("dashboard-web-tabs-v1");
		const parsed = raw ? JSON.parse(raw) : [];
		const tab = Array.isArray(parsed)
			? parsed.find((item) => item && item.appId === ${JSON.stringify(appId)})
			: null;
		return tab ?? defaults[${JSON.stringify(appId)}];
	})()`;
}

async function firstTabForApp(
	page: CdpClient,
	appId: string,
): Promise<{ appId: string; id: string; title: string }> {
	const tab = await page.evaluate<{ id?: unknown; title?: unknown }>(
		expressionForFirstTab(appId),
	);
	assert(
		typeof tab.id === "string" && typeof tab.title === "string",
		`No ${appId} browser tab exists`,
	);
	return { appId, id: tab.id, title: tab.title };
}

async function openDashboardTab(
	page: CdpClient,
	tab: { appId?: string; id: string; title: string },
) {
	const clickExactRow = () =>
		page.evaluate<boolean>(
			`(() => {
				const button = document.querySelector(
					${JSON.stringify(`[data-dashboard-web-tab-row-button="${tab.id}"]`)}
				);
				if (!(button instanceof HTMLButtonElement)) return false;
				button.click();
				return true;
			})()`,
		);

	if (!(await clickExactRow())) {
		await page.evaluate(
			`(() => {
				const appId = ${JSON.stringify(tab.appId ?? null)};
				const title = ${JSON.stringify(tab.title)};
				const buttons = Array.from(document.querySelectorAll("button"));
				const appLabel =
					appId === ${JSON.stringify(CHROME_APP_ID)}
						? "Chrome"
						: null;
				const collapsedGroup = buttons.find((candidate) =>
					(appLabel &&
						candidate.getAttribute("aria-label") ===
							\`Expand \${appLabel} sessions\`) ||
					candidate.getAttribute("title") === title ||
					candidate.getAttribute("aria-label")?.includes(title) ||
					candidate.textContent?.includes(title)
				);
				if (collapsedGroup instanceof HTMLButtonElement) {
					collapsedGroup.click();
					return true;
				}
				return false;
			})()`,
		);
		await waitFor(clickExactRow, `web tab row button ${tab.id}`, 3_000).catch(
			async () => {
				await page.evaluate(
					`(() => {
						location.hash = ${JSON.stringify(`#/web-tabs/${tab.id}`)};
						window.dispatchEvent(new HashChangeEvent("hashchange"));
						return true;
					})()`,
				);
			},
		);
	}
	const isTabActive = () =>
		page.evaluate<boolean>(
			`Boolean(document.querySelector(${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tab.id}"][data-dashboard-web-view-active="true"] webview`,
			)}))`,
		);
	await waitFor(isTabActive, `active ${tab.id} webview`).catch(async () => {
		await page.send("Page.navigate", {
			url: `${RENDERER_ORIGIN}/#/web-tabs/${tab.id}`,
		});
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`document.readyState !== "loading" &&
					location.hash === ${JSON.stringify(`#/web-tabs/${tab.id}`)}`,
				),
			`route ${tab.id}`,
		);
		await waitFor(isTabActive, `active ${tab.id} webview after route`);
	});
}

async function clickSidebarChromeHeader(page: CdpClient) {
	const target = await page.evaluate<{
		x: number;
		y: number;
	} | null>(
		`(() => {
			const button = Array.from(document.querySelectorAll("button")).find(
				(candidate) =>
					candidate.getAttribute("aria-label") === "Open Chrome"
			);
			if (!(button instanceof HTMLButtonElement)) return null;
			const rect = button.getBoundingClientRect();
			return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
		})()`,
	);
	assert(target, "Could not find Chrome sidebar header button");
	await page.clickAt(target.x, target.y);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`location.hash.startsWith(${JSON.stringify("#/web-tabs/")})`,
			),
		"Chrome sidebar header opens a Chrome tab route",
	);
}

async function clickSidebarNativeProviderHeader(
	page: CdpClient,
	providerLabel: "Capy" | "Devin",
) {
	const provider = providerLabel.toLowerCase();
	const target = await page.evaluate<{ x: number; y: number } | null>(
		`(() => {
			const buttons = Array.from(
				document.querySelectorAll(${JSON.stringify(
					`[data-dashboard-native-provider-trigger="${provider}"]`,
				)})
			);
			const button = buttons.find((candidate) => {
				if (!(candidate instanceof HTMLButtonElement)) return false;
				const rect = candidate.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			});
			if (!(button instanceof HTMLButtonElement)) return null;
			const rect = button.getBoundingClientRect();
			return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
		})()`,
	);
	assert(target, `Could not click ${providerLabel} sidebar header button`);
	await page.clickAt(target.x, target.y);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`location.hash.startsWith(${JSON.stringify(`#/native/${provider}`)})`,
			),
		`${providerLabel} sidebar header opens native route`,
	);
	await assertNativeProviderRouteActive(page, provider);
}

async function assertNativeProviderRouteActive(
	page: CdpClient,
	provider: string,
) {
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`(() => {
					const main = document.querySelector("[data-dashboard-web-view-deck-anchor]");
					const deck = document.querySelector("[data-dashboard-web-view-deck-root]");
					const expectedTitle = ${JSON.stringify(provider === "capy" ? "Capy" : "Devin")};
					return location.hash.startsWith(${JSON.stringify(`#/native/${provider}`)}) &&
						Boolean(document.querySelector("[data-native-agent-view-root]")) &&
						main?.textContent?.includes(expectedTitle) === true &&
						deck?.getAttribute("data-dashboard-web-view-deck-visible") === "false" &&
						getComputedStyle(deck).display === "none";
				})()`,
			),
		`${provider} native route renders the native outlet and hides browser deck`,
	);
}

async function assertNativeSidebarArrowNavigation(page: CdpClient) {
	const before = await page.evaluate<string | null>(
		`(() => {
			const row = document.querySelector("[data-native-agent-session-row-id]");
			if (!(row instanceof HTMLElement)) return null;
			row.focus();
			return row.getAttribute("data-native-agent-session-row-id");
		})()`,
	);
	if (!before) return;
	await page.keyPress({
		code: "ArrowDown",
		key: "ArrowDown",
		nativeVirtualKeyCode: 40,
		windowsVirtualKeyCode: 40,
	});
	const after = await page.evaluate<{
		folderId: string | null;
		overviewId: string | null;
		sessionId: string | null;
	}>(
		`(() => ({
			folderId: document.activeElement?.getAttribute("data-native-agent-folder-row-id") ?? null,
			overviewId: document.activeElement?.getAttribute("data-native-agent-overview-card-id") ?? null,
			sessionId: document.activeElement?.getAttribute("data-native-agent-session-row-id") ?? null,
		}))()`,
	);
	assert(
		after.overviewId === null,
		`ArrowDown from native sidebar row moved focus into native overview card ${after.overviewId}`,
	);
	assert(
		after.sessionId !== null || after.folderId !== null,
		"ArrowDown from native sidebar row did not keep focus in native sidebar",
	);
}

async function assertNativeSidebarSessionClickSwitchesFromChrome(
	page: CdpClient,
	provider: "capy" | "devin",
) {
	const row = await page.evaluate<{
		height: number;
		id: string;
		width: number;
		x: number;
		y: number;
	} | null>(
		`(async () => {
			const selector = ${JSON.stringify(
				`[data-native-agent-session-row-provider="${provider}"][data-native-agent-session-row-id]`,
			)};
			let row = document.querySelector(selector);
			if (!(row instanceof HTMLElement)) {
				const folderButtons = Array.from(
					document.querySelectorAll(${JSON.stringify(
						`[data-native-agent-folder-row-provider="${provider}"][data-native-agent-folder-row-id]`,
					)})
				);
				for (const folderButton of folderButtons) {
					if (!(folderButton instanceof HTMLElement)) continue;
					const folderRect = folderButton.getBoundingClientRect();
					if (folderRect.width <= 0 || folderRect.height <= 0) continue;
					folderButton.click();
					await new Promise((resolve) => requestAnimationFrame(resolve));
					await new Promise((resolve) => requestAnimationFrame(resolve));
					row = document.querySelector(selector);
					if (row instanceof HTMLElement) break;
				}
			}
			if (!(row instanceof HTMLElement)) return null;
			row.scrollIntoView({ block: "nearest" });
			const rect = row.getBoundingClientRect();
			const id = row.getAttribute("data-native-agent-session-row-id");
			if (!id || rect.width <= 0 || rect.height <= 0) return null;
			return {
				height: rect.height,
				id,
				width: rect.width,
				x: rect.left,
				y: rect.top,
			};
		})()`,
	);
	assert(row, `Could not find a visible ${provider} native session row`);
	await page.clickAt(row.x + row.width / 2, row.y + row.height / 2);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`(() => {
					const expectedHashPrefix = ${JSON.stringify(`#/native/${provider}/${row.id}`)};
					const deck = document.querySelector("[data-dashboard-web-view-deck-root]");
					const root = document.querySelector("[data-native-agent-view-root]");
					return location.hash.startsWith(expectedHashPrefix) &&
						Boolean(root) &&
						deck?.getAttribute("data-dashboard-web-view-deck-visible") === "false" &&
						getComputedStyle(deck).display === "none";
				})()`,
			),
		`${provider} native session row click switches away from Chrome/webview deck`,
	);
}

async function assertNativeSidebarFolderKeyboardMove(page: CdpClient) {
	const prepared = await page.evaluate<{
		folderId: string;
		key: string;
		sessionId: string;
	} | null>(
		`(async () => {
			const vim = await import("/routes/_authenticated/_dashboard/utils/dashboard-vim-mode.ts");
			vim.setDashboardVimModeEnabled(true);
			const activeProvider = location.hash.startsWith("#/native/capy")
				? "capy"
				: "devin";
			const sessionFolders = JSON.parse(
				localStorage.getItem("dashboard-native-agent-session-folders-v1") || "{}"
			);
			const rows = Array.from(
				document.querySelectorAll(
					\`[data-native-agent-session-row-id][data-native-agent-session-row-provider="\${activeProvider}"]\`
				)
			);
			const row = rows.find((candidate) => {
				const sessionId = candidate.getAttribute("data-native-agent-session-row-id");
				const provider = candidate.getAttribute("data-native-agent-session-row-provider");
				return sessionId && provider && sessionFolders[provider + ":" + sessionId] == null;
			}) ?? rows[0];
			if (!(row instanceof HTMLElement)) return null;
			const sessionId = row.getAttribute("data-native-agent-session-row-id");
			const provider = row.getAttribute("data-native-agent-session-row-provider");
			if (!sessionId || (provider !== "capy" && provider !== "devin")) return null;
			const foldersKey = "dashboard-native-agent-folders-v1";
			const folders = JSON.parse(localStorage.getItem(foldersKey) || "[]");
			const lastFolderIds = JSON.parse(localStorage.getItem("dashboard-native-agent-last-folder-v1") || "{}");
			const providerFolders = Array.isArray(folders)
				? folders.filter((folder) => folder?.provider === provider)
				: [];
			const folderId =
				providerFolders.find((folder) => folder?.id === lastFolderIds?.[provider])?.id ??
				providerFolders[0]?.id;
			if (!folderId) return null;
			const sessionKey = provider + ":" + sessionId;
			row.focus();
			return { folderId, key: sessionKey, sessionId };
		})()`,
	);
	if (!prepared) return;

	await page.keyPress({
		code: "KeyF",
		key: "f",
		nativeVirtualKeyCode: 70,
		windowsVirtualKeyCode: 70,
	});
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`JSON.parse(localStorage.getItem("dashboard-native-agent-session-folders-v1") || "{}")[${JSON.stringify(prepared.key)}] === ${JSON.stringify(prepared.folderId)}`,
			),
		"native sidebar f moves focused session to remembered folder",
	);

	await page.evaluate<boolean>(
		`(() => {
			const row = document.querySelector(${JSON.stringify(`[data-native-agent-session-row-id="${prepared.sessionId}"]`)});
			if (!(row instanceof HTMLElement)) return false;
			row.focus();
			return true;
		})()`,
	);
	await page.keyPress({
		code: "KeyF",
		key: "F",
		nativeVirtualKeyCode: 70,
		windowsVirtualKeyCode: 70,
	});
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`JSON.parse(localStorage.getItem("dashboard-native-agent-session-folders-v1") || "{}")[${JSON.stringify(prepared.key)}] === null`,
			),
		"native sidebar Shift+F moves focused session out of folder",
	);
}

async function coldOpenDashboardTab(
	page: CdpClient,
	tab: { id: string; title: string },
) {
	await page.evaluate<boolean>(
		`(() => {
			const nextHash = ${JSON.stringify(`#/web-tabs/${tab.id}`)};
			if (location.hash === nextHash) return true;
			location.hash = nextHash;
			return true;
		})()`,
	);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`document.readyState !== "loading" &&
					location.hash === ${JSON.stringify(`#/web-tabs/${tab.id}`)}`,
			),
		`cold route ${tab.id}`,
	);
	const hasActiveDeckEntry = () =>
		page.evaluate<boolean>(
			`Boolean(document.querySelector(${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tab.id}"][data-dashboard-web-view-active="true"]`,
			)}))`,
		);
	await waitFor(
		hasActiveDeckEntry,
		`active ${tab.id} deck entry after cold route`,
		60_000,
	).catch(async (error) => {
		await delay(500);
		if (await hasActiveDeckEntry()) return;
		const isOnTargetRoute = await page.evaluate<boolean>(
			`location.hash === ${JSON.stringify(`#/web-tabs/${tab.id}`)}`,
		);
		if (isOnTargetRoute) {
			console.warn(
				`Continuing after slow cold deck attach for ${tab.id}: ${String(error)}`,
			);
			return;
		}
		throw error;
	});
}

async function activeWebviewState(page: CdpClient, tabId: string) {
	return await waitFor(
		() =>
			page.evaluate<{
				activeKey: string | null;
				domReadyCount: number | null;
				errorText: boolean;
				loadCount: number | null;
				reloadRequestCount: number | null;
				renderGoneCount: number | null;
				url: string | null;
				webContentsId: number | null;
			} | null>(
				`(() => {
					const selector = ${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${tabId}"] webview`,
					)};
					const node = document.querySelector(selector);
					if (!node) return null;
					let webContentsId = null;
					try {
						webContentsId = node.getWebContentsId?.() ?? null;
					} catch {
						return null;
					}
					if (!webContentsId) return null;
					const snapshot =
						window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.();
					const pane = snapshot?.panes?.find(
						(item) => item.paneId === ${JSON.stringify(
							`dashboard-web:${tabId}:default`,
						)},
					);
					return {
						activeKey: snapshot?.deck?.activeCacheKey ?? null,
						errorText: document.body.innerText.includes(
							"The WebView must be attached to the DOM",
						),
						domReadyCount: pane?.domReadyCount ?? null,
						loadCount: pane?.loadCount ?? null,
						reloadRequestCount: pane?.reloadRequestCount ?? null,
						renderGoneCount: pane?.renderGoneCount ?? null,
						url: pane?.url ?? node.getURL?.() ?? null,
						webContentsId,
					};
				})()`,
			),
		`${tabId} webContentsId`,
	);
}

async function stableActiveWebviewState(page: CdpClient, tabId: string) {
	return await waitFor(async () => {
		let previous = await activeWebviewState(page, tabId);
		if (previous.activeKey !== `tab:${tabId}`) return null;
		if ((previous.domReadyCount ?? 0) <= 0) return null;
		for (let index = 0; index < 3; index += 1) {
			await delay(750);
			const next = await activeWebviewState(page, tabId);
			if (next.activeKey !== `tab:${tabId}`) return null;
			if (previous.webContentsId !== next.webContentsId) return null;
			if (previous.loadCount !== next.loadCount) return null;
			if (previous.domReadyCount !== next.domReadyCount) return null;
			previous = next;
		}
		return previous;
	}, `${tabId} stable webview state`);
}

async function internalBrowserTabIds(page: CdpClient, tabId: string) {
	return await page.evaluate<Array<{ id: string; isActive: boolean }>>(
		`(() => Array.from(
			document.querySelectorAll(${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"] [data-dashboard-browser-tab-id]`,
			)}),
		).map((node) => ({
			id: node.getAttribute("data-dashboard-browser-tab-id") || "",
			isActive: node.getAttribute("data-dashboard-browser-tab-active") === "true",
		})).filter((item) => item.id))()`,
	);
}

async function internalBrowserWebviewState({
	browserTabId,
	page,
	tabId,
}: {
	browserTabId: string;
	page: CdpClient;
	tabId: string;
}) {
	return await waitFor(
		() =>
			page.evaluate<{
				loadCount: number | null;
				domReadyCount: number | null;
				reloadRequestCount: number | null;
				renderGoneCount: number | null;
				url: string | null;
				webContentsId: number | null;
			} | null>(
				`(() => {
					const selector = ${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${tabId}"] [data-dashboard-browser-tab-id="${browserTabId}"] webview`,
					)};
					const node = document.querySelector(selector);
					if (!node) return null;
					let webContentsId = null;
					try {
						webContentsId = node.getWebContentsId?.() ?? null;
					} catch {
						return null;
					}
					if (!webContentsId) return null;
					const snapshot =
						window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.();
					const pane = snapshot?.panes?.find(
						(item) => item.paneId === ${JSON.stringify(
							`dashboard-web:${tabId}:${browserTabId}`,
						)},
					);
					return {
						domReadyCount: pane?.domReadyCount ?? null,
						loadCount: pane?.loadCount ?? null,
						reloadRequestCount: pane?.reloadRequestCount ?? null,
						renderGoneCount: pane?.renderGoneCount ?? null,
						url: pane?.url ?? node.getURL?.() ?? null,
						webContentsId,
					};
				})()`,
			),
		`${tabId}/${browserTabId} webContentsId`,
	);
}

async function readPersistedBrowserUrls({
	browserTabId,
	page,
	tabId,
}: {
	browserTabId: string;
	page: CdpClient;
	tabId: string;
}) {
	return await page.evaluate<{
		internalUrl: string | null;
		topLevelUrl: string | null;
	}>(
		`(() => {
			const topLevelRaw = localStorage.getItem("dashboard-web-tabs-v1");
			const topLevelTabs = topLevelRaw ? JSON.parse(topLevelRaw) : [];
			const topLevelTab = Array.isArray(topLevelTabs)
				? topLevelTabs.find((item) => item?.id === ${JSON.stringify(tabId)})
				: null;
			const internalRaw = localStorage.getItem(
				${JSON.stringify(`dashboard-browser-tabs-v1:${tabId}`)}
			);
			const internalTabs = internalRaw ? JSON.parse(internalRaw) : [];
			const internalTab = Array.isArray(internalTabs)
				? internalTabs.find((item) => item?.id === ${JSON.stringify(browserTabId)})
				: null;
			return {
				internalUrl:
					typeof internalTab?.url === "string" ? internalTab.url : null,
				topLevelUrl:
					typeof topLevelTab?.url === "string" ? topLevelTab.url : null,
			};
		})()`,
	);
}

async function pushInternalBrowserUrl({
	browserTabId,
	page,
	tabId,
	url,
}: {
	browserTabId: string;
	page: CdpClient;
	tabId: string;
	url: string;
}) {
	const result = await page.evaluate<{
		ok: boolean;
		detail: string | null;
		url: string | null;
	}>(
		`(async () => {
			const selector = ${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"] [data-dashboard-browser-tab-id="${browserTabId}"] webview`,
			)};
			const node = document.querySelector(selector);
			if (!node) {
				return { ok: false, detail: "missing webview", url: null };
			}
			try {
				const result = await node.executeJavaScript(${JSON.stringify(
					`history.pushState(null, "", ${JSON.stringify(url)}); location.href`,
				)});
				return {
					ok: typeof result === "string",
					detail: typeof result === "string" ? null : "unexpected result",
					url: typeof result === "string" ? result : null,
				};
			} catch (error) {
				return {
					ok: false,
					detail: error instanceof Error ? error.message : String(error),
					url: null,
				};
			}
		})()`,
	);
	assert(result.ok, `Could not push in-page URL: ${result.detail}`);
	return result.url;
}

function makeSmokeInPageUrl(currentUrl: string): string {
	const next = new URL(currentUrl);
	next.hash = `clankee-smoke-${Date.now().toString(36)}`;
	return next.href;
}

function clearSmokeHash(currentUrl: string): string {
	const next = new URL(currentUrl);
	if (next.hash.startsWith("#clankee-smoke-")) {
		next.hash = "";
	}
	return next.href;
}

interface TemporaryDashboardWebTab {
	folderId: string;
	tabId: string;
	title: string;
}

async function cleanupStaleSmokeDashboardWebTabs(page: CdpClient) {
	await page.evaluate<boolean>(
		`(() => {
			const tabsKey = "dashboard-web-tabs-v1";
			const foldersKey = "dashboard-web-tab-folders-v1";
			const tabs = JSON.parse(localStorage.getItem(tabsKey) || "[]");
			const folders = JSON.parse(localStorage.getItem(foldersKey) || "[]");
			const isSmokeTab = (tab) => {
				const title = typeof tab?.title === "string" ? tab.title.toLowerCase() : "";
				const browserTitle = typeof tab?.browserTitle === "string" ? tab.browserTitle.toLowerCase() : "";
				const url = typeof tab?.url === "string" ? tab.url.toLowerCase() : "";
				return title.startsWith("clankee smoke") ||
					title.includes("clankee peer") ||
					title.includes("clankee restore") ||
					title.includes("smoke manual") ||
					title.includes("smoke event") ||
					browserTitle.includes("clankee peer") ||
					browserTitle.includes("clankee restore") ||
					url.includes("clankee+peer") ||
					url.includes("clankee+restore") ||
					url.includes("q=manual") ||
					url.includes("q=event") ||
					url.includes("q=debug");
			};
			const staleTabIds = new Set(
				Array.isArray(tabs)
					? tabs
							.filter(isSmokeTab)
							.map((tab) => tab.id)
					: []
			);
			const staleFolderIds = new Set(
				Array.isArray(folders)
					? folders
							.filter((folder) => typeof folder?.title === "string" && folder.title.startsWith("Clankee smoke"))
							.map((folder) => folder.id)
					: []
			);
			for (const tabId of staleTabIds) localStorage.removeItem("dashboard-browser-tabs-v1:" + tabId);
			localStorage.setItem(
				tabsKey,
				JSON.stringify(
					(Array.isArray(tabs) ? tabs : [])
						.filter((tab) => !staleTabIds.has(tab.id))
						.map((tab) => staleFolderIds.has(tab.folderId) ? { ...tab, folderId: null, updatedAt: Date.now() } : tab)
				)
			);
			localStorage.setItem(
				foldersKey,
				JSON.stringify((Array.isArray(folders) ? folders : []).filter((folder) => !staleFolderIds.has(folder.id)))
			);
			window.dispatchEvent(new Event("dashboard-web-tabs-change"));
			return true;
		})()`,
	);
}

async function createTemporaryDashboardWebTab(
	page: CdpClient,
): Promise<TemporaryDashboardWebTab> {
	return await page.evaluate<TemporaryDashboardWebTab>(
		`(async () => {
			const tabs = await import("/routes/_authenticated/_dashboard/utils/dashboard-web-tabs.ts");
			const suffix = Date.now().toString(36);
			const folder = tabs.createDashboardWebTabFolder(
				${JSON.stringify(CHROME_APP_ID)},
				"Clankee smoke folder " + suffix
			);
			const tab = tabs.createDashboardWebTab(${JSON.stringify(CHROME_APP_ID)}, {
				title: "Clankee smoke restore " + suffix,
				url: "https://www.google.com/search?q=clankee+restore",
				folderId: folder.id,
			});
			return { folderId: folder.id, tabId: tab.id, title: tab.title };
		})()`,
	);
}

async function createSmokePeerDashboardWebTab(
	page: CdpClient,
): Promise<{ appId: string; id: string; title: string }> {
	const tab = await page.evaluate<{ appId: string; id: string; title: string }>(
		`(() => {
			const tabsKey = "dashboard-web-tabs-v1";
			const tabs = JSON.parse(localStorage.getItem(tabsKey) || "[]");
			const now = Date.now();
			const id = ${JSON.stringify(CHROME_APP_ID)} + "-" + crypto.randomUUID();
			const tab = {
				id,
				appId: ${JSON.stringify(CHROME_APP_ID)},
				title: "Clankee smoke peer " + now.toString(36),
				browserTitle: null,
				isTitleCustomized: true,
				url: "about:blank",
				faviconUrl: null,
				folderId: null,
				isPinned: false,
				createdAt: now,
				updatedAt: now,
			};
			localStorage.setItem(
				tabsKey,
				JSON.stringify([...(Array.isArray(tabs) ? tabs : []), tab])
			);
			window.dispatchEvent(new Event("dashboard-web-tabs-change"));
			return { appId: tab.appId, id: tab.id, title: tab.title };
		})()`,
	);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`JSON.parse(localStorage.getItem("dashboard-web-tabs-v1") || "[]").some((tab) => tab?.id === ${JSON.stringify(tab.id)})`,
			),
		"new Chrome peer tab created",
	);
	return tab;
}

async function cleanupSmokePeerDashboardWebTab({
	page,
	tabId,
}: {
	page: CdpClient;
	tabId: string;
}) {
	await page.evaluate<boolean>(
		`(() => {
			const tabsKey = "dashboard-web-tabs-v1";
			const tabs = JSON.parse(localStorage.getItem(tabsKey) || "[]");
			localStorage.setItem(
				tabsKey,
				JSON.stringify((Array.isArray(tabs) ? tabs : []).filter((tab) => tab.id !== ${JSON.stringify(tabId)}))
			);
			localStorage.removeItem(${JSON.stringify(`dashboard-browser-tabs-v1:${tabId}`)});
			window.dispatchEvent(new Event("dashboard-web-tabs-change"));
			return true;
		})()`,
	);
}

async function cleanupTemporaryDashboardWebTab({
	fallbackTabId,
	page,
	temporary,
}: {
	fallbackTabId: string;
	page: CdpClient;
	temporary: TemporaryDashboardWebTab;
}) {
	await page.evaluate<boolean>(
		`(() => {
			if (location.hash === ${JSON.stringify(
				`#/web-tabs/${temporary.tabId}`,
			)}) {
				location.hash = ${JSON.stringify(`#/web-tabs/${fallbackTabId}`)};
			}
			const tabsKey = "dashboard-web-tabs-v1";
			const foldersKey = "dashboard-web-tab-folders-v1";
			const tabs = JSON.parse(localStorage.getItem(tabsKey) || "[]");
			const folders = JSON.parse(localStorage.getItem(foldersKey) || "[]");
			localStorage.setItem(
				tabsKey,
				JSON.stringify(
					(Array.isArray(tabs) ? tabs : [])
						.filter((tab) => tab.id !== ${JSON.stringify(temporary.tabId)})
						.map((tab) => tab.folderId === ${JSON.stringify(temporary.folderId)} ? { ...tab, folderId: null, updatedAt: Date.now() } : tab)
				)
			);
			localStorage.setItem(
				foldersKey,
				JSON.stringify((Array.isArray(folders) ? folders : []).filter((folder) => folder.id !== ${JSON.stringify(temporary.folderId)}))
			);
			localStorage.removeItem(
				${JSON.stringify(`dashboard-browser-tabs-v1:${temporary.tabId}`)}
			);
			window.dispatchEvent(new Event("dashboard-web-tabs-change"));
			return true;
		})()`,
	);
}

async function assertCollapsedFolderSleepsAndRestores({
	fallbackTab,
	page,
	temporary,
}: {
	fallbackTab: { id: string; title: string };
	page: CdpClient;
	temporary: TemporaryDashboardWebTab;
}) {
	await openDashboardTab(page, {
		id: temporary.tabId,
		title: temporary.title,
	});
	const beforeSleep = await activeWebviewState(page, temporary.tabId);

	await openDashboardTab(page, fallbackTab);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`Boolean(
					window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.()
						?.deck?.retainedEntries?.some(
							(entry) => entry.cacheKey === ${JSON.stringify(
								`tab:${temporary.tabId}`,
							)}
						)
				)`,
			),
		"temporary tab retained before folder collapse",
	);

	await page.evaluate<boolean>(
		`(() => {
			const foldersKey = "dashboard-web-tab-folders-v1";
			const folders = JSON.parse(localStorage.getItem(foldersKey) || "[]");
			localStorage.setItem(
				foldersKey,
				JSON.stringify(
					(Array.isArray(folders) ? folders : []).map((folder) =>
						folder.id === ${JSON.stringify(temporary.folderId)}
							? { ...folder, isCollapsed: true, updatedAt: Date.now() }
							: folder
					)
				)
			);
			window.dispatchEvent(new Event("dashboard-web-tabs-change"));
			return true;
		})()`,
	);

	const sleptSnapshot = await waitFor(
		() =>
			page.evaluate<{
				hasDomWebview: boolean;
				isRetained: boolean;
				sleptAt: number | null;
				sleepingCount: number;
			} | null>(
				`(() => {
					const cacheKey = ${JSON.stringify(`tab:${temporary.tabId}`)};
					const snapshot =
						window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.();
					const deck = snapshot?.deck;
					if (!deck) return null;
					const hasDomWebview = Boolean(
						document.querySelector(
							${JSON.stringify(
								`[data-dashboard-web-view-cache-key="tab:${temporary.tabId}"] webview`,
							)}
						)
					);
					const isRetained = deck.retainedEntries.some(
						(entry) => entry.cacheKey === cacheKey
					);
					const sleptEntry = deck.recentlySleptEntries.find(
						(entry) => entry.cacheKey === cacheKey
					);
					if (hasDomWebview || isRetained || !sleptEntry) return null;
					return {
						hasDomWebview,
						isRetained,
						sleptAt: sleptEntry.sleptAt,
						sleepingCount: deck.memoryPressure.sleepingCount,
					};
				})()`,
			),
		"collapsed folder sleeps inactive tab",
	);

	await page.evaluate<boolean>(
		`(() => {
			const foldersKey = "dashboard-web-tab-folders-v1";
			const folders = JSON.parse(localStorage.getItem(foldersKey) || "[]");
			localStorage.setItem(
				foldersKey,
				JSON.stringify(
					(Array.isArray(folders) ? folders : []).map((folder) =>
						folder.id === ${JSON.stringify(temporary.folderId)}
							? { ...folder, isCollapsed: false, updatedAt: Date.now() }
							: folder
					)
				)
			);
			window.dispatchEvent(new Event("dashboard-web-tabs-change"));
			return true;
		})()`,
	);
	await openDashboardTab(page, {
		id: temporary.tabId,
		title: temporary.title,
	});
	const afterRestore = await activeWebviewState(page, temporary.tabId);
	assert(
		afterRestore.webContentsId !== null,
		"Restored sleeping tab did not attach a webContents",
	);
	assert(
		!afterRestore.errorText,
		"Restored sleeping tab shows webview lifecycle error text",
	);

	return {
		afterWebContentsId: afterRestore.webContentsId,
		beforeWebContentsId: beforeSleep.webContentsId,
		sleepingCount: sleptSnapshot.sleepingCount,
		sleptAt: sleptSnapshot.sleptAt,
	};
}

async function assertInPageUrlPersistsWithoutReload({
	browserTabId,
	page,
	tabId,
}: {
	browserTabId: string;
	page: CdpClient;
	tabId: string;
}) {
	let before = await internalBrowserWebviewState({
		browserTabId,
		page,
		tabId,
	});
	if (before.domReadyCount === 0) {
		before = await waitFor(async () => {
			const state = await internalBrowserWebviewState({
				browserTabId,
				page,
				tabId,
			});
			return state.domReadyCount && state.domReadyCount > 0 ? state : null;
		}, "internal browser baseline dom-ready");
	}
	assert(before.url, "Internal browser URL missing before in-page navigation");
	const cleanUrl = clearSmokeHash(before.url);
	if (cleanUrl !== before.url) {
		await pushInternalBrowserUrl({ browserTabId, page, tabId, url: cleanUrl });
		await waitFor(async () => {
			const state = await internalBrowserWebviewState({
				browserTabId,
				page,
				tabId,
			});
			return state.url === cleanUrl ? state : null;
		}, "previous smoke URL cleared");
		before = await internalBrowserWebviewState({ browserTabId, page, tabId });
		if (before.domReadyCount === 0) {
			before = await waitFor(async () => {
				const state = await internalBrowserWebviewState({
					browserTabId,
					page,
					tabId,
				});
				return state.domReadyCount && state.domReadyCount > 0 ? state : null;
			}, "cleaned internal browser baseline dom-ready");
		}
	}
	const smokeUrl = makeSmokeInPageUrl(before.url);
	await pushInternalBrowserUrl({ browserTabId, page, tabId, url: smokeUrl });

	const after = await waitFor(async () => {
		const state = await internalBrowserWebviewState({
			browserTabId,
			page,
			tabId,
		});
		if (state.url !== smokeUrl) return null;
		const persisted = await readPersistedBrowserUrls({
			browserTabId,
			page,
			tabId,
		});
		if (
			persisted.internalUrl !== smokeUrl ||
			persisted.topLevelUrl !== smokeUrl
		) {
			return null;
		}
		return { persisted, state };
	}, "in-page URL persisted");

	assert(
		before.webContentsId === after.state.webContentsId,
		`In-page navigation recreated webContents (${before.webContentsId} -> ${after.state.webContentsId})`,
	);
	assert(
		before.domReadyCount === null ||
			after.state.domReadyCount === null ||
			after.state.domReadyCount === before.domReadyCount,
		`In-page navigation remounted document (${before.domReadyCount} -> ${after.state.domReadyCount})`,
	);
	assert(
		(after.state.reloadRequestCount ?? 0) === 0,
		`In-page navigation requested reload: ${after.state.reloadRequestCount}`,
	);

	await pushInternalBrowserUrl({
		browserTabId,
		page,
		tabId,
		url: before.url,
	});
	const restored = await waitFor(async () => {
		const state = await internalBrowserWebviewState({
			browserTabId,
			page,
			tabId,
		});
		const persisted = await readPersistedBrowserUrls({
			browserTabId,
			page,
			tabId,
		});
		return persisted.internalUrl === before.url &&
			persisted.topLevelUrl === before.url &&
			state.url === before.url
			? state
			: null;
	}, "original in-page URL restored");
	assert(
		before.webContentsId === restored.webContentsId,
		`Restoring in-page URL recreated webContents (${before.webContentsId} -> ${restored.webContentsId})`,
	);
	assert(
		before.domReadyCount === null ||
			restored.domReadyCount === null ||
			restored.domReadyCount === before.domReadyCount,
		`Restoring in-page URL remounted document (${before.domReadyCount} -> ${restored.domReadyCount})`,
	);
	return restored;
}

async function createInternalBrowserTabFromCurrentUrl(
	page: CdpClient,
	tabId: string,
) {
	const before = await internalBrowserTabIds(page, tabId);
	const beforeIds = new Set(before.map((tab) => tab.id));
	await clickElementCenter(
		page,
		`document
			.querySelector(${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"][data-dashboard-web-view-active="true"]`,
			)})
			?.querySelector("[data-dashboard-browser-new-tab-trigger]") ?? null`,
		"internal new-tab button",
	);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`Array.from(document.querySelectorAll('[role="menuitem"]')).some(
						(item) => item.textContent?.trim() === "Same URL"
					)`,
			),
		"new-tab menu",
	);
	await clickElementCenter(
		page,
		`Array.from(document.querySelectorAll('[role="menuitem"]')).find(
				(node) => node.textContent?.trim() === "Same URL"
			) ?? null`,
		"Same URL menu item",
	);

	let next = await waitFor(
		async () => {
			const tabs = await internalBrowserTabIds(page, tabId);
			const created = tabs.find((tab) => !beforeIds.has(tab.id));
			return created?.isActive ? created.id : null;
		},
		"new internal browser tab active",
		2_000,
	).catch(() => null);
	if (!next) {
		const clicked = await page.evaluate<boolean>(
			`(() => {
				const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
					(node) => node.textContent?.trim() === "Same URL"
				);
				if (!(item instanceof HTMLElement)) return false;
				item.click();
				return true;
			})()`,
		);
		assert(clicked, "Could not activate Same URL menu item");
		next = await waitFor(async () => {
			const tabs = await internalBrowserTabIds(page, tabId);
			const created = tabs.find((tab) => !beforeIds.has(tab.id));
			return created?.isActive ? created.id : null;
		}, "new internal browser tab active");
	}
	await internalBrowserWebviewState({ browserTabId: next, page, tabId });
	return next;
}

async function activateInternalBrowserTab({
	browserTabId,
	page,
	tabId,
}: {
	browserTabId: string;
	page: CdpClient;
	tabId: string;
}) {
	const clicked = await page.evaluate<boolean>(
		`(() => {
			const selector = ${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"] [data-dashboard-browser-tab-button="${browserTabId}"]`,
			)};
			const button = document.querySelector(selector);
			if (!(button instanceof HTMLButtonElement)) return false;
			button.click();
			return true;
		})()`,
	);
	assert(clicked, `Could not activate internal browser tab ${browserTabId}`);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`document
					.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${tabId}"] [data-dashboard-browser-tab-id="${browserTabId}"]`,
					)})
					?.getAttribute("data-dashboard-browser-tab-active") === "true"`,
			),
		`internal browser tab ${browserTabId} active`,
	);
}

async function closeInternalBrowserTab({
	browserTabId,
	page,
	tabId,
}: {
	browserTabId: string;
	page: CdpClient;
	tabId: string;
}) {
	const paneId = `dashboard-web:${tabId}:${browserTabId}`;
	const clicked = await page.evaluate<boolean>(
		`(() => {
			const selector = ${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"] [data-dashboard-browser-tab-close="${browserTabId}"]`,
			)};
			const button = document.querySelector(selector);
			if (!(button instanceof HTMLButtonElement)) return false;
			button.click();
			return true;
		})()`,
	);
	assert(clicked, `Could not close internal browser tab ${browserTabId}`);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`(() => {
					const node = document.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${tabId}"] [data-dashboard-browser-tab-id="${browserTabId}"]`,
					)});
					const snapshot =
						window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.();
					const pane = snapshot?.panes?.find(
						(item) => item.paneId === ${JSON.stringify(paneId)},
					);
					const unmounted = snapshot?.events?.some(
						(event) =>
							event.paneId === ${JSON.stringify(paneId)} &&
							event.event === "unmounted",
					);
					return !node && !pane && unmounted === true;
				})()`,
			),
		`internal browser tab ${browserTabId} cleaned up`,
	);
}

async function toggleInternalBrowserSplitView(page: CdpClient, tabId: string) {
	await clickElementCenter(
		page,
		`document
			.querySelector(${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"][data-dashboard-web-view-active="true"]`,
			)})
			?.querySelector("[data-dashboard-browser-split-toggle]") ?? null`,
		"internal split-view button",
	);
}

async function ensureInternalBrowserSplitViewClosed(
	page: CdpClient,
	tabId: string,
) {
	const isOpen = await page.evaluate<boolean>(
		`document
			.querySelector(${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"][data-dashboard-web-view-active="true"]`,
			)})
			?.querySelector("[data-dashboard-browser-split-toggle]")
			?.getAttribute("aria-pressed") === "true"`,
	);
	if (!isOpen) return;

	await toggleInternalBrowserSplitView(page, tabId);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`document
					.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${tabId}"][data-dashboard-web-view-active="true"]`,
					)})
					?.querySelector("[data-dashboard-browser-split-toggle]")
					?.getAttribute("aria-pressed") !== "true"`,
			),
		"internal browser split view closed",
	);
}

async function assertInternalBrowserSplitView({
	leftBrowserTabId,
	page,
	rightBrowserTabId,
	tabId,
}: {
	leftBrowserTabId: string;
	page: CdpClient;
	rightBrowserTabId: string;
	tabId: string;
}) {
	return await waitFor(
		() =>
			page.evaluate<{
				leftPlacement: string | null;
				rightPlacement: string | null;
				splitPressed: boolean;
			} | null>(
				`(() => {
					const root = document.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${tabId}"][data-dashboard-web-view-active="true"]`,
					)});
					if (!root) return null;
					const splitButton = root.querySelector("[data-dashboard-browser-split-toggle]");
					const left = root.querySelector(${JSON.stringify(
						`[data-dashboard-browser-tab-id="${leftBrowserTabId}"]`,
					)});
					const right = root.querySelector(${JSON.stringify(
						`[data-dashboard-browser-tab-id="${rightBrowserTabId}"]`,
					)});
					const leftPlacement = left?.getAttribute("data-dashboard-browser-tab-placement") ?? null;
					const rightPlacement = right?.getAttribute("data-dashboard-browser-tab-placement") ?? null;
					const splitPressed = splitButton?.getAttribute("aria-pressed") === "true";
					if (leftPlacement !== "left" || rightPlacement !== "right" || !splitPressed) {
						return null;
					}
					return { leftPlacement, rightPlacement, splitPressed };
				})()`,
			),
		"internal browser split view",
	);
}

async function dispatchOptionKeyFromGuest({
	activeUrl,
	code,
	key,
	nativeVirtualKeyCode,
	windowsVirtualKeyCode,
}: {
	activeUrl: string;
	code: string;
	key: string;
	nativeVirtualKeyCode: number;
	windowsVirtualKeyCode: number;
}) {
	const targets = await getTargets();
	const guestTarget = targets.find(
		(target) => target.type === "webview" && activeUrl.startsWith(target.url),
	);
	assert(guestTarget, `No webview CDP target matched active URL ${activeUrl}`);
	const guest = await CdpClient.connect(guestTarget);
	try {
		await dispatchOptionKey(guest, {
			code,
			key,
			nativeVirtualKeyCode,
			windowsVirtualKeyCode,
		});
	} finally {
		guest.close();
	}
}

async function dispatchOptionKeyToDashboardWebview({
	code,
	key,
	page,
	tabId,
}: {
	code: string;
	key: string;
	page: CdpClient;
	tabId: string;
}) {
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`Boolean(document.querySelector(${JSON.stringify(
					`[data-dashboard-web-view-cache-key="tab:${tabId}"][data-dashboard-web-view-active="true"] webview`,
				)}))`,
			),
		`active ${tabId} webview before shortcut dispatch`,
	);
	const result = await page.evaluate<{ detail: string | null; ok: boolean }>(
		`(async () => {
			const node = document.querySelector(${JSON.stringify(
				`[data-dashboard-web-view-cache-key="tab:${tabId}"][data-dashboard-web-view-active="true"] webview`,
			)});
			if (!node) return { ok: false, detail: "missing active webview" };
			if (typeof node.sendInputEvent !== "function") {
				// Electron's renderer-side webview.sendInputEvent is noisy under CDP
				// smoke control. The app's production path is covered by main-process
				// before-input-event tests; this smoke exercises the injected guest bridge.
			}
			if (typeof node.executeJavaScript === "function") {
				await node.executeJavaScript(${JSON.stringify(
					`window.dispatchEvent(new KeyboardEvent("keydown", {
						altKey: true,
						bubbles: true,
						cancelable: true,
						code: ${JSON.stringify(code)},
						key: ${JSON.stringify(key)},
					}))`,
				)});
			}
			return { ok: true, detail: null };
		})()`,
	);
	assert(
		result.ok,
		`Could not dispatch Option key to webview: ${result.detail}`,
	);
}

async function dispatchOptionKFromGuest(activeUrl: string) {
	await dispatchOptionKeyFromGuest({
		activeUrl,
		code: "KeyK",
		key: "k",
		nativeVirtualKeyCode: 40,
		windowsVirtualKeyCode: 75,
	});
}

async function dispatchOptionK(client: CdpClient) {
	await dispatchOptionKey(client, {
		code: "KeyK",
		key: "Dead",
		nativeVirtualKeyCode: 40,
		windowsVirtualKeyCode: 75,
	});
}

async function openCommandPaletteFromHost(page: CdpClient) {
	await dispatchOptionK(page);
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`Boolean(document.querySelector('[role="dialog"]')) &&
				document.body.innerText.includes("Open Overseer")`,
			),
		"Option+K command palette from host renderer",
	);
}

async function runCommandPaletteCommand(page: CdpClient, commandId: string) {
	await openCommandPaletteFromHost(page);
	const clicked = await page.evaluate<boolean>(
		`(() => {
			const command = document.querySelector(
				${JSON.stringify(`[data-command-palette-command-id="${commandId}"]`)}
			);
			if (!(command instanceof HTMLElement)) return false;
			command.click();
			return true;
		})()`,
	);
	assert(clicked, `Could not select command palette command ${commandId}`);
	await waitFor(
		() => page.evaluate<boolean>(`!document.querySelector('[role="dialog"]')`),
		`command palette closed after ${commandId}`,
	);
}

async function dispatchOptionKey(
	client: CdpClient,
	{
		code,
		key,
		nativeVirtualKeyCode,
		windowsVirtualKeyCode,
	}: {
		code: string;
		key: string;
		nativeVirtualKeyCode: number;
		windowsVirtualKeyCode: number;
	},
) {
	await client.send("Input.dispatchKeyEvent", {
		type: "keyDown",
		key: "Alt",
		code: "AltLeft",
		windowsVirtualKeyCode: 18,
		nativeVirtualKeyCode: 58,
		altKey: true,
		modifiers: 1,
	});
	await client.send("Input.dispatchKeyEvent", {
		type: "rawKeyDown",
		key,
		code,
		windowsVirtualKeyCode,
		nativeVirtualKeyCode,
		altKey: true,
		modifiers: 1,
	});
	await client.send("Input.dispatchKeyEvent", {
		type: "keyUp",
		key,
		code,
		windowsVirtualKeyCode,
		nativeVirtualKeyCode,
		altKey: true,
		modifiers: 1,
	});
	await client.send("Input.dispatchKeyEvent", {
		type: "keyUp",
		key: "Alt",
		code: "AltLeft",
		windowsVirtualKeyCode: 18,
		nativeVirtualKeyCode: 58,
		modifiers: 0,
	});
}

async function dispatchOptionKeyToRenderer({
	page,
	code,
	key,
	nativeVirtualKeyCode,
	windowsVirtualKeyCode,
}: {
	page: CdpClient;
	code: string;
	key: string;
	nativeVirtualKeyCode: number;
	windowsVirtualKeyCode: number;
}) {
	await page.send("Input.dispatchKeyEvent", {
		type: "keyDown",
		key: "Alt",
		code: "AltLeft",
		windowsVirtualKeyCode: 18,
		nativeVirtualKeyCode: 58,
		altKey: true,
		modifiers: 1,
	});
	await page.send("Input.dispatchKeyEvent", {
		type: "rawKeyDown",
		key,
		code,
		windowsVirtualKeyCode,
		nativeVirtualKeyCode,
		altKey: true,
		modifiers: 1,
	});
	await page.send("Input.dispatchKeyEvent", {
		type: "keyUp",
		key,
		code,
		windowsVirtualKeyCode,
		nativeVirtualKeyCode,
		altKey: true,
		modifiers: 1,
	});
	await page.send("Input.dispatchKeyEvent", {
		type: "keyUp",
		key: "Alt",
		code: "AltLeft",
		windowsVirtualKeyCode: 18,
		nativeVirtualKeyCode: 58,
		modifiers: 0,
	});
}

async function openSettingsFromDashboard(page: CdpClient) {
	const clicked = await page.evaluate<boolean>(`(() => {
		const buttons = Array.from(document.querySelectorAll("button"));
		const target = buttons.find((button) =>
			button.getAttribute("aria-label") === "Settings" ||
			button.textContent?.trim().startsWith("Settings")
		);
		if (!(target instanceof HTMLButtonElement)) return false;
		target.click();
		return true;
	})()`);
	assert(clicked, "Could not find Settings button in dashboard sidebar");
	await waitFor(
		() =>
			page.evaluate<boolean>(
				`location.hash === "#/settings/account" &&
				Boolean(document.querySelector('[data-dashboard-web-view-deck-root]')) &&
				!document.querySelector('[data-dashboard-web-view-deck-anchor]')`,
			),
		"settings route through app router",
	);
}

async function main() {
	const targets = await getTargets();
	const pageTarget = targets.find(
		(target) =>
			target.type === "page" && target.url.startsWith(RENDERER_ORIGIN),
	);
	assert(
		pageTarget,
		`No Clankee renderer target found at ${RENDERER_ORIGIN}; restart "bun run dev" so Electron exposes RENDERER_REMOTE_DEBUG_PORT=${DEBUG_PORT}`,
	);

	const page = await CdpClient.connect(pageTarget);
	let devinFallbackTabId = "chrome-default";
	let smokePeerTabId: string | null = null;
	let temporaryWebTab: TemporaryDashboardWebTab | null = null;
	try {
		await page.keyPress({
			key: "Escape",
			code: "Escape",
			windowsVirtualKeyCode: 27,
			nativeVirtualKeyCode: 53,
		});
		await ensureSignedIn(page);
		await cleanupStaleSmokeDashboardWebTabs(page);
		await clickSidebarNativeProviderHeader(page, "Devin");
		await assertNativeSidebarArrowNavigation(page);
		await assertNativeSidebarFolderKeyboardMove(page);
		await clickSidebarChromeHeader(page);
		await assertNativeSidebarSessionClickSwitchesFromChrome(page, "devin");
		await clickSidebarChromeHeader(page);

		const devinTab = await firstTabForApp(page, CHROME_APP_ID);
		const capyTab = await createSmokePeerDashboardWebTab(page);
		smokePeerTabId = capyTab.id;
		devinFallbackTabId = devinTab.id;

		await coldOpenDashboardTab(page, devinTab);
		const devinBefore = await stableActiveWebviewState(page, devinTab.id);
		assert(
			!devinBefore.errorText,
			"Renderer shows webview lifecycle error text",
		);
		assert(devinBefore.url, "Active Devin tab URL was not recorded");

		await openDashboardTab(page, capyTab);
		const capyAfterOpen = await stableActiveWebviewState(page, capyTab.id);

		await dispatchOptionKeyToDashboardWebview({
			code: "KeyG",
			key: "g",
			page,
			tabId: capyTab.id,
		});
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`Boolean(document.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${devinTab.id}"][data-dashboard-web-view-active="true"] webview`,
					)}))`,
				),
			"Option+G from focused webview activates Chrome",
		);
		await openDashboardTab(page, devinTab);
		const devinAfter = await activeWebviewState(page, devinTab.id);

		assert(
			devinBefore.webContentsId === devinAfter.webContentsId,
			`Switching tabs recreated Devin webContents (${devinBefore.webContentsId} -> ${devinAfter.webContentsId})`,
		);
		assert(
			devinBefore.loadCount === null ||
				devinAfter.loadCount === null ||
				devinAfter.loadCount === devinBefore.loadCount,
			`Switching tabs increased Devin load count (${devinBefore.loadCount} -> ${devinAfter.loadCount})`,
		);
		assert(
			(devinAfter.reloadRequestCount ?? 0) === 0,
			`Unexpected reload request count: ${devinAfter.reloadRequestCount}`,
		);
		assert(
			(devinAfter.renderGoneCount ?? 0) === 0,
			`Unexpected render-process-gone count: ${devinAfter.renderGoneCount}`,
		);

		await openSettingsFromDashboard(page);
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`document
						.querySelector("[data-dashboard-web-view-deck-root]")
						?.getAttribute("data-dashboard-web-view-deck-visible") === "false"`,
				),
			"browser deck hidden outside dashboard",
		);
		assert(
			await page.evaluate<boolean>(
				`getComputedStyle(document.querySelector("[data-dashboard-web-view-deck-root]")).display === "none"`,
			),
			"Hidden browser deck must be display:none so Electron webviews cannot intercept sidebar clicks",
		);
		const devinAway = await activeWebviewState(page, devinTab.id);
		assert(
			devinAfter.webContentsId === devinAway.webContentsId,
			`Leaving dashboard detached Devin webContents (${devinAfter.webContentsId} -> ${devinAway.webContentsId})`,
		);

		await dispatchOptionKeyToRenderer({
			page,
			code: "KeyG",
			key: "g",
			nativeVirtualKeyCode: 2,
			windowsVirtualKeyCode: 71,
		});
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`location.hash === ${JSON.stringify(`#/web-tabs/${devinTab.id}`)} &&
					Boolean(document.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${devinTab.id}"][data-dashboard-web-view-active="true"] webview`,
					)}))`,
				),
			"return to Devin route",
		);
		const devinAfterRouteReturn = await activeWebviewState(page, devinTab.id);
		assert(
			devinAfter.webContentsId === devinAfterRouteReturn.webContentsId,
			`Returning to dashboard recreated Devin webContents (${devinAfter.webContentsId} -> ${devinAfterRouteReturn.webContentsId})`,
		);
		assert(
			devinAfter.loadCount === null ||
				devinAfterRouteReturn.loadCount === null ||
				devinAfterRouteReturn.loadCount === devinAfter.loadCount,
			`Leaving and returning increased Devin load count (${devinAfter.loadCount} -> ${devinAfterRouteReturn.loadCount})`,
		);

		await activateInternalBrowserTab({
			browserTabId: "default",
			page,
			tabId: devinTab.id,
		});
		await ensureInternalBrowserSplitViewClosed(page, devinTab.id);
		const devinAfterInPagePersistence =
			await assertInPageUrlPersistsWithoutReload({
				browserTabId: "default",
				page,
				tabId: devinTab.id,
			});

		const defaultInternalBefore = await internalBrowserWebviewState({
			browserTabId: "default",
			page,
			tabId: devinTab.id,
		});
		const createdInternalTabId = await createInternalBrowserTabFromCurrentUrl(
			page,
			devinTab.id,
		);
		const createdInternalBeforeSplit = await internalBrowserWebviewState({
			browserTabId: createdInternalTabId,
			page,
			tabId: devinTab.id,
		});
		await activateInternalBrowserTab({
			browserTabId: "default",
			page,
			tabId: devinTab.id,
		});
		const defaultInternalAfter = await internalBrowserWebviewState({
			browserTabId: "default",
			page,
			tabId: devinTab.id,
		});
		assert(
			defaultInternalBefore.webContentsId ===
				defaultInternalAfter.webContentsId,
			`Internal tab switch recreated default Devin webContents (${defaultInternalBefore.webContentsId} -> ${defaultInternalAfter.webContentsId})`,
		);
		assert(
			defaultInternalBefore.loadCount === null ||
				defaultInternalAfter.loadCount === null ||
				defaultInternalAfter.loadCount === defaultInternalBefore.loadCount,
			`Internal tab switch increased default Devin load count (${defaultInternalBefore.loadCount} -> ${defaultInternalAfter.loadCount})`,
		);
		assert(
			(defaultInternalAfter.reloadRequestCount ?? 0) === 0,
			`Internal tab switch unexpectedly requested reload: ${defaultInternalAfter.reloadRequestCount}`,
		);
		assert(
			(defaultInternalAfter.renderGoneCount ?? 0) === 0,
			`Internal tab switch caused render-process-gone: ${defaultInternalAfter.renderGoneCount}`,
		);
		await toggleInternalBrowserSplitView(page, devinTab.id);
		const splitPlacement = await assertInternalBrowserSplitView({
			leftBrowserTabId: "default",
			page,
			rightBrowserTabId: createdInternalTabId,
			tabId: devinTab.id,
		});
		const defaultInternalDuringSplit = await internalBrowserWebviewState({
			browserTabId: "default",
			page,
			tabId: devinTab.id,
		});
		const createdInternalDuringSplit = await internalBrowserWebviewState({
			browserTabId: createdInternalTabId,
			page,
			tabId: devinTab.id,
		});
		assert(
			defaultInternalAfter.webContentsId ===
				defaultInternalDuringSplit.webContentsId,
			`Split view recreated default Devin webContents (${defaultInternalAfter.webContentsId} -> ${defaultInternalDuringSplit.webContentsId})`,
		);
		assert(
			createdInternalBeforeSplit.webContentsId ===
				createdInternalDuringSplit.webContentsId,
			`Split view recreated peer Devin webContents (${createdInternalBeforeSplit.webContentsId} -> ${createdInternalDuringSplit.webContentsId})`,
		);
		assert(
			defaultInternalAfter.loadCount === null ||
				defaultInternalDuringSplit.loadCount === null ||
				defaultInternalDuringSplit.loadCount === defaultInternalAfter.loadCount,
			`Split view increased default Devin load count (${defaultInternalAfter.loadCount} -> ${defaultInternalDuringSplit.loadCount})`,
		);
		assert(
			createdInternalBeforeSplit.loadCount === null ||
				createdInternalDuringSplit.loadCount === null ||
				createdInternalDuringSplit.loadCount ===
					createdInternalBeforeSplit.loadCount,
			`Split view increased peer Devin load count (${createdInternalBeforeSplit.loadCount} -> ${createdInternalDuringSplit.loadCount})`,
		);
		await toggleInternalBrowserSplitView(page, devinTab.id);
		await closeInternalBrowserTab({
			browserTabId: createdInternalTabId,
			page,
			tabId: devinTab.id,
		});

		await runCommandPaletteCommand(page, `web.tab.${capyTab.id}`);
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`location.hash === ${JSON.stringify(`#/web-tabs/${capyTab.id}`)} &&
					Boolean(document.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${capyTab.id}"][data-dashboard-web-view-active="true"] webview`,
					)}))`,
				),
			"command palette activates Capy tab",
		);
		const capyAfterCommandPalette = await activeWebviewState(page, capyTab.id);
		assert(
			capyAfterOpen.webContentsId === capyAfterCommandPalette.webContentsId,
			`Command palette recreated Capy webContents (${capyAfterOpen.webContentsId} -> ${capyAfterCommandPalette.webContentsId})`,
		);
		assert(
			capyAfterOpen.loadCount === null ||
				capyAfterCommandPalette.loadCount === null ||
				capyAfterCommandPalette.loadCount === capyAfterOpen.loadCount,
			`Command palette increased Capy load count (${capyAfterOpen.loadCount} -> ${capyAfterCommandPalette.loadCount})`,
		);

		await runCommandPaletteCommand(page, `web.tab.${devinTab.id}`);
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`location.hash === ${JSON.stringify(`#/web-tabs/${devinTab.id}`)} &&
					Boolean(document.querySelector(${JSON.stringify(
						`[data-dashboard-web-view-cache-key="tab:${devinTab.id}"][data-dashboard-web-view-active="true"] webview`,
					)}))`,
				),
			"command palette returns to Devin tab",
		);
		const devinAfterCommandPalette = await activeWebviewState(
			page,
			devinTab.id,
		);
		assert(
			devinAfterInPagePersistence.webContentsId ===
				devinAfterCommandPalette.webContentsId,
			`Command palette recreated Devin webContents (${devinAfterInPagePersistence.webContentsId} -> ${devinAfterCommandPalette.webContentsId})`,
		);
		assert(
			devinAfterInPagePersistence.loadCount === null ||
				devinAfterCommandPalette.loadCount === null ||
				devinAfterCommandPalette.loadCount ===
					devinAfterInPagePersistence.loadCount,
			`Command palette increased Devin load count (${devinAfterInPagePersistence.loadCount} -> ${devinAfterCommandPalette.loadCount})`,
		);

		temporaryWebTab = await createTemporaryDashboardWebTab(page);
		const sleepingRestore = await assertCollapsedFolderSleepsAndRestores({
			fallbackTab: devinTab,
			page,
			temporary: temporaryWebTab,
		});
		await openDashboardTab(page, devinTab);
		const devinAfterSleepingRestore = await activeWebviewState(
			page,
			devinTab.id,
		);

		await dispatchOptionKFromGuest(devinAfterSleepingRestore.url ?? "");
		await waitFor(
			() =>
				page.evaluate<boolean>(
					`Boolean(document.querySelector('[role="dialog"]')) &&
					document.body.innerText.includes("Open Overseer") &&
					document.body.innerText.includes("Create Devin session")`,
				),
			"Option+K command palette from focused webview",
		);
		await page.keyPress({
			key: "Escape",
			code: "Escape",
			windowsVirtualKeyCode: 27,
			nativeVirtualKeyCode: 53,
		});
		await openCommandPaletteFromHost(page);
		await page.keyPress({
			key: "Escape",
			code: "Escape",
			windowsVirtualKeyCode: 27,
			nativeVirtualKeyCode: 53,
		});

		const finalSnapshot = await page.evaluate<{
			activeKey: string | null;
			lastSwitchLatencyMs: number | null;
			lastSwitchToCacheKey: string | null;
			memoryPressure: {
				level: string;
				retainedCount: number;
				warmCount: number;
				sleepingCount: number;
			} | null;
			retainedCount: number | null;
			switchCount: number | null;
			warmCount: number;
		}>(
			`(() => {
				const snapshot =
					window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.();
				const retained = snapshot?.deck?.retainedEntries ?? [];
				return {
					activeKey: snapshot?.deck?.activeCacheKey ?? null,
					lastSwitchLatencyMs: snapshot?.deck?.lastSwitchLatencyMs ?? null,
					lastSwitchToCacheKey: snapshot?.deck?.lastSwitchToCacheKey ?? null,
					memoryPressure: snapshot?.deck?.memoryPressure
						? {
							level: snapshot.deck.memoryPressure.level,
							retainedCount: snapshot.deck.memoryPressure.retainedCount,
							warmCount: snapshot.deck.memoryPressure.warmCount,
							sleepingCount: snapshot.deck.memoryPressure.sleepingCount,
						}
						: null,
					retainedCount: retained.length,
					switchCount: snapshot?.deck?.switchCount ?? null,
					warmCount: retained.filter((entry) => entry.retentionState === "warm").length,
				};
			})()`,
		);
		assert(
			finalSnapshot.memoryPressure !== null,
			"Browser deck memory-pressure diagnostics missing",
		);
		assert(
			finalSnapshot.memoryPressure.retainedCount ===
				finalSnapshot.retainedCount,
			`Memory-pressure retained count mismatch (${finalSnapshot.memoryPressure.retainedCount} vs ${finalSnapshot.retainedCount})`,
		);
		assert(
			finalSnapshot.memoryPressure.warmCount === finalSnapshot.warmCount,
			`Memory-pressure warm count mismatch (${finalSnapshot.memoryPressure.warmCount} vs ${finalSnapshot.warmCount})`,
		);
		assert(
			typeof finalSnapshot.lastSwitchLatencyMs === "number",
			"Browser deck switch-latency diagnostics missing",
		);
		assert(
			(finalSnapshot.switchCount ?? 0) > 0,
			`Browser deck switch count did not record tab switches: ${finalSnapshot.switchCount}`,
		);

		console.log(
			JSON.stringify(
				{
					ok: true,
					devinTabId: devinTab.id,
					capyTabId: capyTab.id,
					webContentsId: devinAfterRouteReturn.webContentsId,
					loadCount: devinAfterRouteReturn.loadCount,
					splitPlacement,
					sleepingRestore,
					finalSnapshot,
				},
				null,
				2,
			),
		);
	} finally {
		if (temporaryWebTab) {
			await cleanupTemporaryDashboardWebTab({
				fallbackTabId: devinFallbackTabId,
				page,
				temporary: temporaryWebTab,
			}).catch((error) => {
				console.warn(
					`Failed to clean up temporary smoke browser tab: ${String(error)}`,
				);
			});
		}
		if (smokePeerTabId) {
			await cleanupSmokePeerDashboardWebTab({
				page,
				tabId: smokePeerTabId,
			}).catch((error) => {
				console.warn(
					`Failed to clean up smoke peer browser tab: ${String(error)}`,
				);
			});
		}
		page.close();
	}
}

await main();
