import { EventEmitter } from "node:events";
import { clipboard, Menu, webContents } from "electron";
import { isOpenControlPlaneShortcutInput } from "main/lib/control-plane-shortcut";
import { isControlPlaneShortcutEventHandled } from "main/lib/control-plane-shortcut-event";
import {
	type DashboardWebShortcut,
	dashboardWebCreateShortcutFromInput,
	dashboardWebIndexedShortcut,
	dashboardWebPendingDigitIndexFromInput,
	dashboardWebShortcutFromInput,
} from "main/lib/dashboard-web-shortcut";
import {
	type GlobalKeyboardAction,
	globalKeyboardActionFromInput,
	shouldPreventDefaultForGlobalKeyboardAction,
} from "main/lib/global-keyboard-shortcut";
import { safeOpenExternal } from "main/lib/safe-url";

interface ConsoleEntry {
	level: "log" | "warn" | "error" | "info" | "debug";
	message: string;
	timestamp: number;
}

const MAX_CONSOLE_ENTRIES = 500;
const DASHBOARD_WEB_SHORTCUT_CONSOLE_PREFIX =
	"__CLANKEE_DASHBOARD_WEB_SHORTCUT__:";
const DASHBOARD_WEB_SHORTCUT_URL_PROTOCOL = "clankee-dashboard-shortcut:";
const DASHBOARD_WEB_SHORTCUTS = new Set<DashboardWebShortcut>([
	"OPEN_CONTROL_PLANE",
	"OPEN_WEB_PAGE_1",
	"OPEN_WEB_PAGE_2",
	"OPEN_WEB_PAGE_3",
	"OPEN_WEB_PAGE_4",
	"OPEN_WEB_PAGE_5",
	"OPEN_WEB_PAGE_6",
	"OPEN_CAPY",
	"OPEN_DEVIN",
	"CREATE_CAPY",
	"CREATE_DEVIN",
	"OPEN_CHROME",
	"OPEN_WORKSPACES",
	"TOGGLE_DASHBOARD_SIDEBAR",
	"TOGGLE_NATIVE_BROWSER_VIEW",
	"TOGGLE_NATIVE_SPLIT_VIEW",
	"FOCUS_DASHBOARD_SHELL",
	"OPEN_CAPY_1",
	"OPEN_CAPY_2",
	"OPEN_CAPY_3",
	"OPEN_CAPY_4",
	"OPEN_CAPY_5",
	"OPEN_CAPY_6",
	"OPEN_CAPY_7",
	"OPEN_CAPY_8",
	"OPEN_CAPY_9",
	"OPEN_DEVIN_1",
	"OPEN_DEVIN_2",
	"OPEN_DEVIN_3",
	"OPEN_DEVIN_4",
	"OPEN_DEVIN_5",
	"OPEN_DEVIN_6",
	"OPEN_DEVIN_7",
	"OPEN_DEVIN_8",
	"OPEN_DEVIN_9",
	"SHOW_DASHBOARD_KEYBOARD_HELP",
	"BROWSER_NEW_TAB",
	"BROWSER_RELOAD",
	"BROWSER_TOGGLE_SPLIT",
	"BROWSER_CLOSE_SPLIT",
	"BROWSER_SWAP_SPLIT",
	"BROWSER_NARROW_SPLIT",
	"BROWSER_WIDEN_SPLIT",
	"BROWSER_EQUALIZE_SPLIT",
	"BROWSER_CLOSE_TAB",
	"BROWSER_TOGGLE_PIN",
	"BROWSER_PREVIOUS_TAB",
	"BROWSER_NEXT_TAB",
]);

function sanitizeUrl(url: string): string {
	if (/^https?:\/\//i.test(url) || url.startsWith("about:")) {
		return url;
	}
	if (url.startsWith("localhost") || url.startsWith("127.0.0.1")) {
		return `http://${url}`;
	}
	if (url.includes(".")) {
		return `https://${url}`;
	}
	return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
}

function dashboardWebShortcutFromBridgeUrl(
	url: string,
): DashboardWebShortcut | null {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== DASHBOARD_WEB_SHORTCUT_URL_PROTOCOL) return null;
		const shortcut = parsed.searchParams.get(
			"shortcut",
		) as DashboardWebShortcut | null;
		return shortcut && DASHBOARD_WEB_SHORTCUTS.has(shortcut) ? shortcut : null;
	} catch {
		return null;
	}
}

class BrowserManager extends EventEmitter {
	private paneWebContentsIds = new Map<string, number>();
	private consoleLogs = new Map<string, ConsoleEntry[]>();
	private consoleListeners = new Map<string, () => void>();
	private contextMenuListeners = new Map<string, () => void>();
	private beforeInputListeners = new Map<string, () => void>();
	private shortcutNavigationListeners = new Map<string, () => void>();
	private pendingDashboardWebAppShortcut: {
		shortcut: DashboardWebShortcut;
		timeout: NodeJS.Timeout;
	} | null = null;

	register(paneId: string, webContentsId: number): void {
		// Clean even when prevId === webContentsId so BrowserManager owns
		// listener idempotency; callers can re-register without duplicating.
		const prevId = this.paneWebContentsIds.get(paneId);
		if (prevId != null) {
			for (const map of [
				this.consoleListeners,
				this.contextMenuListeners,
				this.beforeInputListeners,
				this.shortcutNavigationListeners,
			]) {
				const cleanup = map.get(paneId);
				if (cleanup) {
					cleanup();
					map.delete(paneId);
				}
			}
		}
		this.paneWebContentsIds.set(paneId, webContentsId);
		const wc = webContents.fromId(webContentsId);
		if (wc) {
			// Keep throttling enabled so parked/offscreen persistent webviews don't
			// run at full speed in the background.
			wc.setBackgroundThrottling(true);
			wc.setWindowOpenHandler(({ url }) => {
				const dashboardWebShortcut = dashboardWebShortcutFromBridgeUrl(url);
				if (dashboardWebShortcut) {
					this.openDashboardWebShortcut(dashboardWebShortcut);
					return { action: "deny" as const };
				}
				if (url && url !== "about:blank") {
					this.emit(`new-window:${paneId}`, url);
				}
				return { action: "deny" as const };
			});
			this.setupConsoleCapture(paneId, wc);
			this.setupContextMenu(paneId, wc);
			this.setupBeforeInput(paneId, wc);
			this.setupShortcutNavigation(paneId, wc);
		}
	}

	unregister(paneId: string): void {
		for (const map of [
			this.consoleListeners,
			this.contextMenuListeners,
			this.beforeInputListeners,
			this.shortcutNavigationListeners,
		]) {
			const cleanup = map.get(paneId);
			if (cleanup) {
				cleanup();
				map.delete(paneId);
			}
		}
		this.paneWebContentsIds.delete(paneId);
		this.consoleLogs.delete(paneId);
	}

	unregisterAll(): void {
		for (const paneId of [...this.paneWebContentsIds.keys()]) {
			this.unregister(paneId);
		}
	}

	openControlPlane(): void {
		this.emit("open-control-plane");
	}

	openDashboardWebShortcut(shortcut: DashboardWebShortcut): void {
		this.emit("dashboard-web-shortcut", shortcut);
	}

	dispatchGlobalKeyboardAction(action: GlobalKeyboardAction): void {
		this.emit("global-keyboard-action", action);
	}

	private openPageActionHints(wc: Electron.WebContents): void {
		void wc
			.executeJavaScript(
				"Boolean(window.__clankeeOpenDashboardActionHints?.())",
				true,
			)
			.then((opened) => {
				if (opened === true) return;
				this.dispatchGlobalKeyboardAction("SHOW_DASHBOARD_ACTION_HINTS");
			})
			.catch(() => {
				this.dispatchGlobalKeyboardAction("SHOW_DASHBOARD_ACTION_HINTS");
			});
	}

	private clearPendingDashboardWebAppShortcut(): void {
		const pending = this.pendingDashboardWebAppShortcut;
		if (!pending) return;
		clearTimeout(pending.timeout);
		this.pendingDashboardWebAppShortcut = null;
	}

	private armPendingDashboardWebAppShortcut(
		shortcut: DashboardWebShortcut,
	): void {
		this.clearPendingDashboardWebAppShortcut();
		this.pendingDashboardWebAppShortcut = {
			shortcut,
			timeout: setTimeout(() => {
				this.pendingDashboardWebAppShortcut = null;
			}, 1500),
		};
	}

	private dashboardWebShortcutFromInput(
		input: Electron.Input,
	): DashboardWebShortcut | null {
		const pending = this.pendingDashboardWebAppShortcut;
		if (pending) {
			const createShortcut = dashboardWebCreateShortcutFromInput(
				pending.shortcut,
				input,
			);
			if (createShortcut) {
				this.clearPendingDashboardWebAppShortcut();
				return createShortcut;
			}

			const digitIndex = dashboardWebPendingDigitIndexFromInput(input);
			if (digitIndex !== null) {
				this.clearPendingDashboardWebAppShortcut();
				return dashboardWebIndexedShortcut(pending.shortcut, digitIndex);
			}
		}

		const digitShortcut = dashboardWebShortcutFromInput(input);
		if (digitShortcut === "OPEN_CAPY" || digitShortcut === "OPEN_DEVIN") {
			this.armPendingDashboardWebAppShortcut(digitShortcut);
			return digitShortcut;
		}

		if (digitShortcut) this.clearPendingDashboardWebAppShortcut();
		return digitShortcut;
	}

	getWebContents(paneId: string): Electron.WebContents | null {
		const id = this.paneWebContentsIds.get(paneId);
		if (id == null) return null;
		const wc = webContents.fromId(id);
		if (!wc || wc.isDestroyed()) return null;
		return wc;
	}

	navigate(paneId: string, url: string): void {
		const wc = this.getWebContents(paneId);
		if (!wc) throw new Error(`No webContents for pane ${paneId}`);
		wc.loadURL(sanitizeUrl(url));
	}

	async screenshot(paneId: string): Promise<string> {
		const wc = this.getWebContents(paneId);
		if (!wc) throw new Error(`No webContents for pane ${paneId}`);
		const image = await wc.capturePage();
		clipboard.writeImage(image);
		return image.toPNG().toString("base64");
	}

	async evaluateJS(paneId: string, code: string): Promise<unknown> {
		const wc = this.getWebContents(paneId);
		if (!wc) throw new Error(`No webContents for pane ${paneId}`);
		return wc.executeJavaScript(code);
	}

	getConsoleLogs(paneId: string): ConsoleEntry[] {
		return this.consoleLogs.get(paneId) ?? [];
	}

	openDevTools(paneId: string): void {
		const wc = this.getWebContents(paneId);
		if (!wc) return;
		wc.openDevTools({ mode: "detach" });
	}

	private setupContextMenu(paneId: string, wc: Electron.WebContents): void {
		const handler = (
			_event: Electron.Event,
			params: Electron.ContextMenuParams,
		) => {
			const { linkURL, pageURL, selectionText, editFlags } = params;

			const menuItems: Electron.MenuItemConstructorOptions[] = [];

			if (linkURL) {
				menuItems.push(
					{
						label: "Open Link in Default Browser",
						click: () => {
							void safeOpenExternal(linkURL);
						},
					},
					{
						label: "Open Link as New Split",
						click: () =>
							this.emit(`context-menu-action:${paneId}`, {
								action: "open-in-split" as const,
								url: linkURL,
							}),
					},
					{
						label: "Copy Link Address",
						click: () => clipboard.writeText(linkURL),
					},
					{ type: "separator" },
				);
			}

			if (selectionText) {
				menuItems.push({
					label: "Copy",
					enabled: editFlags.canCopy,
					click: () => wc.copy(),
				});
			}

			if (editFlags.canPaste) {
				menuItems.push({
					label: "Paste",
					click: () => wc.paste(),
				});
			}

			if (editFlags.canSelectAll) {
				menuItems.push({
					label: "Select All",
					click: () => wc.selectAll(),
				});
			}

			if (selectionText || editFlags.canPaste || editFlags.canSelectAll) {
				menuItems.push({ type: "separator" });
			}

			menuItems.push(
				{
					label: "Back",
					enabled: wc.canGoBack(),
					click: () => wc.goBack(),
				},
				{
					label: "Forward",
					enabled: wc.canGoForward(),
					click: () => wc.goForward(),
				},
				{
					label: "Reload",
					click: () => wc.reload(),
				},
			);

			if (!linkURL) {
				menuItems.push(
					{ type: "separator" },
					{
						label: "Open Page in Default Browser",
						click: () => {
							if (pageURL && pageURL !== "about:blank") {
								void safeOpenExternal(pageURL);
							}
						},
						enabled: !!pageURL && pageURL !== "about:blank",
					},
					{
						label: "Copy Page URL",
						click: () => {
							if (pageURL) clipboard.writeText(pageURL);
						},
						enabled: !!pageURL && pageURL !== "about:blank",
					},
				);
			}

			const menu = Menu.buildFromTemplate(menuItems);
			menu.popup();
		};

		wc.on("context-menu", handler);
		this.contextMenuListeners.set(paneId, () => {
			try {
				wc.off("context-menu", handler);
			} catch {
				// webContents may be destroyed
			}
		});
	}

	// When a webview has focus, keystrokes route to the guest renderer — host
	// `react-hotkeys-hook` listeners never see them and the menu's CmdOrCtrl+W
	// accelerator closes the whole window. `before-input-event` fires in the
	// main process before both, and `preventDefault()` suppresses both.
	//
	// keyDown guard prevents a second fire on keyUp. Shift guard preserves
	// Cmd+Shift+W (CLOSE_TAB) and Cmd+Shift+R (forceReload).
	private setupBeforeInput(paneId: string, wc: Electron.WebContents): void {
		const handler = (event: Electron.Event, input: Electron.Input): void => {
			if (
				(event as { defaultPrevented?: boolean }).defaultPrevented ||
				isControlPlaneShortcutEventHandled(event)
			) {
				return;
			}

			if (isOpenControlPlaneShortcutInput(input)) {
				event.preventDefault();
				this.openControlPlane();
				return;
			}

			const pendingDashboardWebShortcut = this.pendingDashboardWebAppShortcut
				? this.dashboardWebShortcutFromInput(input)
				: null;
			if (pendingDashboardWebShortcut) {
				event.preventDefault();
				this.openDashboardWebShortcut(pendingDashboardWebShortcut);
				return;
			}

			const globalKeyboardAction = globalKeyboardActionFromInput(input);
			if (globalKeyboardAction) {
				if (shouldPreventDefaultForGlobalKeyboardAction(globalKeyboardAction)) {
					event.preventDefault();
				}
				this.clearPendingDashboardWebAppShortcut();
				if (globalKeyboardAction === "SHOW_DASHBOARD_ACTION_HINTS") {
					this.openPageActionHints(wc);
					return;
				}
				this.dispatchGlobalKeyboardAction(globalKeyboardAction);
				return;
			}

			const dashboardWebShortcut = this.dashboardWebShortcutFromInput(input);
			if (dashboardWebShortcut) {
				event.preventDefault();
				this.openDashboardWebShortcut(dashboardWebShortcut);
				return;
			}

			if (input.type !== "keyDown") return;

			if (input.shift || input.alt) return;
			if (!(input.meta || input.control)) return;

			const key = input.key.toLowerCase();
			if (key === "w") {
				event.preventDefault();
				this.emit(`close-pane:${paneId}`);
				return;
			}
			if (key === "r") {
				event.preventDefault();
				this.emit(`reload-pane:${paneId}`);
				return;
			}
		};

		wc.on("before-input-event", handler);
		this.beforeInputListeners.set(paneId, () => {
			try {
				wc.off("before-input-event", handler);
			} catch {
				// webContents may be destroyed
			}
		});
	}

	private setupConsoleCapture(paneId: string, wc: Electron.WebContents): void {
		const LEVEL_MAP: Record<number, ConsoleEntry["level"]> = {
			0: "log",
			1: "warn",
			2: "error",
			3: "info",
		};

		const handler = (
			_event: Electron.Event,
			level: number,
			message: string,
		) => {
			if (message.startsWith(DASHBOARD_WEB_SHORTCUT_CONSOLE_PREFIX)) {
				const shortcut = message.slice(
					DASHBOARD_WEB_SHORTCUT_CONSOLE_PREFIX.length,
				) as DashboardWebShortcut;
				if (shortcut === "OPEN_CONTROL_PLANE") {
					this.openControlPlane();
					return;
				}
				if (DASHBOARD_WEB_SHORTCUTS.has(shortcut)) {
					this.openDashboardWebShortcut(shortcut);
					return;
				}
			}

			const entries = this.consoleLogs.get(paneId) ?? [];
			entries.push({
				level: LEVEL_MAP[level] ?? "log",
				message,
				timestamp: Date.now(),
			});
			if (entries.length > MAX_CONSOLE_ENTRIES) {
				entries.splice(0, entries.length - MAX_CONSOLE_ENTRIES);
			}
			this.consoleLogs.set(paneId, entries);
			this.emit(`console:${paneId}`, entries[entries.length - 1]);
		};

		wc.on("console-message", handler);
		this.consoleListeners.set(paneId, () => {
			try {
				wc.off("console-message", handler);
			} catch {
				// webContents may be destroyed
			}
		});
	}

	private setupShortcutNavigation(
		paneId: string,
		wc: Electron.WebContents,
	): void {
		const handler = (event: Electron.Event, url: string) => {
			const dashboardWebShortcut = dashboardWebShortcutFromBridgeUrl(url);
			if (!dashboardWebShortcut) return;
			event.preventDefault();
			this.openDashboardWebShortcut(dashboardWebShortcut);
		};

		wc.on("will-navigate", handler);
		this.shortcutNavigationListeners.set(paneId, () => {
			try {
				wc.off("will-navigate", handler);
			} catch {
				// webContents may be destroyed
			}
		});
	}
}

export const browserManager = new BrowserManager();
