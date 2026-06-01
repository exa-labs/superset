import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { settings } from "@superset/local-db";
import {
	app,
	BrowserWindow,
	dialog,
	Notification,
	net,
	protocol,
	session,
} from "electron";
import { makeAppSetup } from "lib/electron-app/factories/app/setup";
import {
	handleAuthCallback,
	loadToken,
	parseAuthDeepLink,
} from "lib/trpc/routers/auth/utils/auth-functions";
import { applyShellEnvToProcess } from "lib/trpc/routers/workspaces/utils/shell-env";
import { env as mainEnv } from "main/env.main";
import {
	DEFAULT_CONFIRM_ON_QUIT,
	DESKTOP_BROWSER_PARTITION,
	NATIVE_AGENT_ASSET_PROTOCOL_SCHEME,
	PLATFORM,
	PROTOCOL_SCHEME,
} from "shared/constants";
import { setupAgentHooks } from "./lib/agent-setup";
import { initAppState } from "./lib/app-state";
import { requestAppleEventsAccess } from "./lib/apple-events-permission";
import { isUpdateReadyToInstall, setupAutoUpdater } from "./lib/auto-updater";
import { installBundledCliShim } from "./lib/bundled-cli";
import { resolveDevWorkspaceName } from "./lib/dev-workspace-name";
import { setWorkspaceDockIcon } from "./lib/dock-icon";
import { loadWebviewBrowserExtension } from "./lib/extensions";
import { getHostServiceCoordinator } from "./lib/host-service-coordinator";
import { localDb } from "./lib/local-db";
import { requestLocalNetworkAccess } from "./lib/local-network-permission";
import {
	initTanstackDbPersistence,
	shutdownTanstackDbPersistence,
} from "./lib/persistence/persistence";
import { ensureProjectIconsDir, getProjectIconPath } from "./lib/project-icons";
import { initSentry } from "./lib/sentry";
import {
	prewarmTerminalRuntime,
	reconcileDaemonSessions,
} from "./lib/terminal";
import {
	disposeTerminalHostClient,
	getTerminalHostClient,
} from "./lib/terminal-host/client";
import { disposeTray, initTray } from "./lib/tray";
import { startNetworkLogger, stopNetworkLogger } from "./network-logger";
import { MainWindow } from "./windows/main";

console.log("[main] Local database ready:", !!localDb);
const IS_DEV = process.env.NODE_ENV === "development";

function configureUserDataProfile(devWorkspaceName?: string): void {
	const legacyProfileName = devWorkspaceName
		? `Superset (${devWorkspaceName})`
		: "Superset";
	const legacyUserDataPath = path.join(
		app.getPath("appData"),
		legacyProfileName,
	);

	if (!existsSync(legacyUserDataPath)) return;

	const currentUserDataPath = app.getPath("userData");
	if (currentUserDataPath === legacyUserDataPath) return;

	// Keep the rebranded app on the existing Chromium profile so cookies,
	// IndexedDB, service workers, and OAuth sessions survive the rename.
	app.setPath("userData", legacyUserDataPath);
	console.log(
		`[main] Reusing legacy Superset user data profile for Clankee: ${legacyUserDataPath}`,
	);
}

void applyShellEnvToProcess().catch((error) => {
	console.error("[main] Failed to apply shell environment:", error);
});

// Dev mode: label the app with the workspace name so multiple worktrees are distinguishable
let devWorkspaceName: string | undefined;
if (IS_DEV) {
	devWorkspaceName = resolveDevWorkspaceName();
	if (devWorkspaceName) {
		app.setName(`Clankee (${devWorkspaceName})`);
	}
}
configureUserDataProfile(devWorkspaceName);

// Dev mode: register with execPath + app script so macOS launches Electron with our entry point
if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
			path.resolve(process.argv[1]),
		]);
	}
} else {
	app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

async function processDeepLink(url: string): Promise<void> {
	console.log("[main] Processing deep link:", url);

	const authParams = parseAuthDeepLink(url);
	if (authParams) {
		const result = await handleAuthCallback(authParams);
		if (result.success) {
			focusMainWindow();
		} else {
			console.error("[main] Auth deep link failed:", result.error);
		}
		return;
	}

	// Non-auth deep links: extract path and navigate in renderer
	// e.g. superset://tasks/my-slug -> /tasks/my-slug
	const path = `/${url.split("://")[1]}`;
	focusMainWindow();

	const windows = BrowserWindow.getAllWindows();
	if (windows.length > 0) {
		windows[0].webContents.send("deep-link-navigate", path);
	}
}

function findDeepLinkInArgv(argv: string[]): string | undefined {
	return argv.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`));
}

export function focusMainWindow(): void {
	const windows = BrowserWindow.getAllWindows();
	if (windows.length > 0) {
		const mainWindow = windows[0];
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.show();
		mainWindow.focus();
	} else {
		// Triggers window creation via makeAppSetup's activate handler
		app.emit("activate");
	}
}

function registerWithMacOSNotificationCenter() {
	if (!PLATFORM.IS_MAC || !Notification.isSupported()) return;

	const registrationNotification = new Notification({
		title: app.name,
		body: " ",
		silent: true,
	});

	let handled = false;
	const cleanup = () => {
		if (handled) return;
		handled = true;
		registrationNotification.close();
	};

	registrationNotification.on("show", () => {
		cleanup();
		console.log("[notifications] Registered with Notification Center");
	});

	// Fallback timeout in case macOS doesn't fire events
	setTimeout(cleanup, 1000);

	registrationNotification.show();
}

// macOS open-url can fire before the window exists (cold-start via protocol link).
// Queue the URL and process it after initialization.
let pendingDeepLinkUrl: string | null = null;
let appReady = false;

app.on("open-url", async (event, url) => {
	event.preventDefault();
	if (appReady) {
		await processDeepLink(url);
	} else {
		pendingDeepLinkUrl = url;
	}
});

let isQuitting = false;
let skipQuitConfirmation = false;
let forceFullCleanup = false;

export function setSkipQuitConfirmation(): void {
	skipQuitConfirmation = true;
}

export function quitApp(): void {
	setSkipQuitConfirmation();
	app.quit();
}

/** Quit + also stop background services. Tray "Quit Completely". */
export function quitAppCompletely(): void {
	forceFullCleanup = true;
	setSkipQuitConfirmation();
	app.quit();
}

/** Bypasses before-quit. Host-service children self-exit via the parent watchdog. */
export function exitImmediately(): void {
	app.exit(0);
}

function getConfirmOnQuitSetting(): boolean {
	try {
		const row = localDb.select().from(settings).get();
		return row?.confirmOnQuit ?? DEFAULT_CONFIRM_ON_QUIT;
	} catch {
		return DEFAULT_CONFIRM_ON_QUIT;
	}
}

async function flushDesktopBrowserSession(reason: string): Promise<void> {
	try {
		await session.fromPartition(DESKTOP_BROWSER_PARTITION).cookies.flushStore();
	} catch (error) {
		console.warn(
			`[main] Failed to flush browser cookies during ${reason}:`,
			error,
		);
	}
}

app.on("before-quit", async (event) => {
	if (isQuitting) return;

	const isDev = process.env.NODE_ENV === "development";
	if (!skipQuitConfirmation && !isDev && getConfirmOnQuitSetting()) {
		event.preventDefault();

		try {
			const { response } = await dialog.showMessageBox({
				type: "question",
				buttons: ["Quit", "Cancel"],
				defaultId: 0,
				cancelId: 1,
				title: "Quit Clankee",
				message: "Are you sure you want to quit?",
			});

			if (response === 1) {
				return;
			}
		} catch (error) {
			console.error("[main] Quit confirmation dialog failed:", error);
		}
	}

	isQuitting = true;
	try {
		await flushDesktopBrowserSession("quit");
		getHostServiceCoordinator().stopAll();
		if (isDev || forceFullCleanup) {
			await teardownTerminalHost();
		} else if (isUpdateReadyToInstall()) {
			disposeTerminalHostClient();
		}
		shutdownTanstackDbPersistence();
		disposeTray();
	} catch (error) {
		console.error("[main] Cleanup during quit failed:", error);
	} finally {
		await stopNetworkLogger();
	}
	app.exit(0);
});

/**
 * Fully stop the v1 terminal-host process. Do not call this for update
 * installs: terminal-host owns the PTY subprocesses, so shutdown is
 * destructive and prevents reattach on next launch.
 */
async function teardownTerminalHost(): Promise<void> {
	try {
		await getTerminalHostClient().shutdownIfRunning({ killSessions: true });
	} catch (err) {
		console.warn("[main] terminal-host dev shutdown failed:", err);
	}
	disposeTerminalHostClient();
}

process.on("uncaughtException", (error) => {
	if (isQuitting) return;
	console.error("[main] Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
	if (isQuitting) return;
	console.error("[main] Unhandled rejection:", reason);
});

// Without these handlers, Electron may not quit when electron-vite sends SIGTERM
if (process.env.NODE_ENV === "development") {
	let signalHandled = false;
	const handleTerminationSignal = (signal: string) => {
		if (signalHandled) return;
		signalHandled = true;
		console.log(`[main] Received ${signal}, quitting...`);
		getHostServiceCoordinator().stopAll();
		void Promise.allSettled([
			flushDesktopBrowserSession(signal),
			teardownTerminalHost(),
			stopNetworkLogger(),
		]).finally(() => app.exit(0));
	};

	process.on("SIGTERM", () => handleTerminationSignal("SIGTERM"));
	process.on("SIGINT", () => handleTerminationSignal("SIGINT"));

	// Fallback: electron-vite may exit without signaling the child Electron process
	const parentPid = process.ppid;
	const isParentAlive = (): boolean => {
		try {
			process.kill(parentPid, 0);
			return true;
		} catch {
			return false;
		}
	};

	const parentCheckInterval = setInterval(() => {
		if (!isParentAlive()) {
			console.log("[main] Parent process exited, quitting...");
			clearInterval(parentCheckInterval);
			handleTerminationSignal("parent-exit");
		}
	}, 1000);
	parentCheckInterval.unref();
}

protocol.registerSchemesAsPrivileged([
	{
		scheme: "superset-icon",
		privileges: {
			standard: true,
			secure: true,
			bypassCSP: true,
			supportFetchAPI: true,
		},
	},
	{
		scheme: "superset-font",
		privileges: {
			standard: true,
			secure: true,
			bypassCSP: true,
			supportFetchAPI: true,
		},
	},
	{
		scheme: NATIVE_AGENT_ASSET_PROTOCOL_SCHEME,
		privileges: {
			standard: true,
			secure: true,
			bypassCSP: true,
			supportFetchAPI: true,
		},
	},
]);

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.exit(0);
} else {
	// Windows/Linux: protocol URL arrives as argv on the second instance
	app.on("second-instance", async (_event, argv) => {
		focusMainWindow();
		const url = findDeepLinkInArgv(argv);
		if (url) {
			await processDeepLink(url);
		}
	});

	(async () => {
		await app.whenReady();
		registerWithMacOSNotificationCenter();
		requestAppleEventsAccess();
		requestLocalNetworkAccess();

		// Must register on both default session and the app's custom partition
		const iconProtocolHandler = (request: Request) => {
			const url = new URL(request.url);
			const projectId = url.pathname.replace(/^\//, "");
			const iconPath = getProjectIconPath(projectId);
			if (!iconPath) {
				return new Response("Not found", { status: 404 });
			}
			return net.fetch(pathToFileURL(iconPath).toString());
		};
		protocol.handle("superset-icon", iconProtocolHandler);
		session
			.fromPartition(DESKTOP_BROWSER_PARTITION)
			.protocol.handle("superset-icon", iconProtocolHandler);

		const nativeAgentAssetProtocolHandler = async (request: Request) => {
			const url = new URL(request.url);
			const rawAssetUrl = url.searchParams.get("url")?.trim();
			if (!rawAssetUrl) {
				return new Response("Missing asset URL", { status: 400 });
			}

			let assetUrl: URL;
			try {
				assetUrl = new URL(rawAssetUrl);
			} catch {
				return new Response("Invalid asset URL", { status: 400 });
			}

			const allowedHosts = new Set(["app.devin.ai", "capy.ai", "www.capy.ai"]);
			if (assetUrl.protocol !== "https:" || !allowedHosts.has(assetUrl.host)) {
				return new Response("Unsupported asset URL", { status: 400 });
			}

			try {
				const browserSession = session.fromPartition(DESKTOP_BROWSER_PARTITION);
				const response = await browserSession.fetch(assetUrl.toString(), {
					headers: {
						accept:
							"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
					},
				});
				const headers = new Headers(response.headers);
				headers.delete("content-encoding");
				headers.delete("content-length");
				headers.set("access-control-allow-origin", "*");
				headers.set("cache-control", "private, max-age=300");
				if (!headers.get("content-type")) {
					const pathname = assetUrl.pathname.toLowerCase();
					if (pathname.endsWith(".png")) {
						headers.set("content-type", "image/png");
					} else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
						headers.set("content-type", "image/jpeg");
					} else if (pathname.endsWith(".gif")) {
						headers.set("content-type", "image/gif");
					} else if (pathname.endsWith(".webp")) {
						headers.set("content-type", "image/webp");
					} else if (pathname.endsWith(".svg")) {
						headers.set("content-type", "image/svg+xml");
					}
				}
				const body = await response.arrayBuffer();
				return new Response(body, {
					headers,
					status: response.status,
					statusText: response.statusText,
				});
			} catch (error) {
				console.warn(
					"[native-agent-asset] Failed to fetch asset",
					assetUrl.toString(),
					error,
				);
				return new Response("Failed to fetch asset", { status: 502 });
			}
		};
		protocol.handle(
			NATIVE_AGENT_ASSET_PROTOCOL_SCHEME,
			nativeAgentAssetProtocolHandler,
		);

		// Serve system fonts (e.g. SF Mono on macOS) via custom protocol
		// so the renderer can use @font-face with font-src 'self' CSP
		if (process.platform === "darwin") {
			const SYSTEM_FONT_DIRS = [
				"/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts",
				"/System/Library/Fonts",
				"/Library/Fonts",
			];
			const fontProtocolHandler = async (request: Request) => {
				const url = new URL(request.url);
				const filename = path.basename(url.pathname);
				if (!/\.(otf|ttf|woff2?)$/i.test(filename)) {
					return new Response("Not found", { status: 404 });
				}
				for (const dir of SYSTEM_FONT_DIRS) {
					const fontPath = path.join(dir, filename);
					try {
						return await net.fetch(pathToFileURL(fontPath).toString());
					} catch {
						// Not in this directory
					}
				}
				return new Response("Not found", { status: 404 });
			};
			protocol.handle("superset-font", fontProtocolHandler);
			session
				.fromPartition(DESKTOP_BROWSER_PARTITION)
				.protocol.handle("superset-font", fontProtocolHandler);
		}

		ensureProjectIconsDir();
		setWorkspaceDockIcon();
		initSentry();
		await initAppState();
		initTanstackDbPersistence();

		try {
			await startNetworkLogger();
		} catch (error) {
			console.error("[main] Failed to start network logger:", error);
		}

		await loadWebviewBrowserExtension();

		// Must happen before renderer restore runs
		await reconcileDaemonSessions();
		prewarmTerminalRuntime();

		try {
			setupAgentHooks();
		} catch (error) {
			console.error("[main] Failed to set up agent hooks:", error);
		}
		try {
			installBundledCliShim();
		} catch (error) {
			console.error("[main] Failed to install bundled CLI shim:", error);
		}

		if (IS_DEV) {
			getHostServiceCoordinator().enableDevReload(async () => {
				const { token } = await loadToken();
				if (!token) return null;
				return { authToken: token, cloudApiUrl: mainEnv.NEXT_PUBLIC_API_URL };
			});
		}

		await makeAppSetup(() => MainWindow());
		setupAutoUpdater();
		initTray();

		const coldStartUrl = findDeepLinkInArgv(process.argv);
		if (coldStartUrl) {
			await processDeepLink(coldStartUrl);
		}
		if (pendingDeepLinkUrl) {
			await processDeepLink(pendingDeepLinkUrl);
			pendingDeepLinkUrl = null;
		}

		appReady = true;
	})();
}
