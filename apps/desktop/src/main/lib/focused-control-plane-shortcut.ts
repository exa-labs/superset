import { app, BrowserWindow, globalShortcut } from "electron";
import { openControlPlaneAccelerator } from "./control-plane-shortcut";
import type { DashboardWebShortcut } from "./dashboard-web-shortcut";
import type { GlobalKeyboardAction } from "./global-keyboard-shortcut";

type FocusedControlPlaneShortcutEvent =
	| "browser-window-blur"
	| "browser-window-focus"
	| "will-quit";

interface FocusedControlPlaneShortcutBackend {
	getFocusedWindow: () => unknown | null;
	off: (
		event: FocusedControlPlaneShortcutEvent,
		listener: (...args: unknown[]) => void,
	) => void;
	on: (
		event: FocusedControlPlaneShortcutEvent,
		listener: (...args: unknown[]) => void,
	) => void;
	register: (accelerator: string, callback: () => void) => boolean;
	unregister: (accelerator: string) => void;
}

interface FocusedControlPlaneShortcutControllerOptions {
	accelerator: string;
	additionalShortcuts?: FocusedDashboardShortcutRegistration[];
	backend: FocusedControlPlaneShortcutBackend;
	onOpenControlPlane: () => void;
	scheduleFocusCheck?: (callback: () => void) => void;
}

interface FocusedControlPlaneShortcutController {
	dispose: () => void;
	install: () => void;
	isRegistered: () => boolean;
}

interface FocusedDashboardShortcutRegistration {
	accelerator: string;
	callback: () => void;
}

export interface FocusedDashboardGlobalActionShortcut {
	accelerator: string;
	action: GlobalKeyboardAction;
}

export interface FocusedDashboardWebShortcut {
	accelerator: string;
	shortcut: DashboardWebShortcut;
}

const defaultScheduleFocusCheck = (callback: () => void) => {
	setTimeout(callback, 0);
};

function onAppShortcutEvent(
	event: FocusedControlPlaneShortcutEvent,
	listener: (...args: unknown[]) => void,
): void {
	if (event === "browser-window-focus") {
		app.on("browser-window-focus", listener);
		return;
	}
	if (event === "browser-window-blur") {
		app.on("browser-window-blur", listener);
		return;
	}
	app.on("will-quit", listener);
}

function offAppShortcutEvent(
	event: FocusedControlPlaneShortcutEvent,
	listener: (...args: unknown[]) => void,
): void {
	if (event === "browser-window-focus") {
		app.off("browser-window-focus", listener);
		return;
	}
	if (event === "browser-window-blur") {
		app.off("browser-window-blur", listener);
		return;
	}
	app.off("will-quit", listener);
}

export function createFocusedControlPlaneShortcutController({
	accelerator,
	additionalShortcuts = [],
	backend,
	onOpenControlPlane,
	scheduleFocusCheck = defaultScheduleFocusCheck,
}: FocusedControlPlaneShortcutControllerOptions): FocusedControlPlaneShortcutController {
	let installed = false;
	const registeredAccelerators = new Set<string>();
	let disposed = false;
	const shortcuts: FocusedDashboardShortcutRegistration[] = [
		{ accelerator, callback: onOpenControlPlane },
		...additionalShortcuts,
	];

	const register = () => {
		if (disposed) return;
		for (const shortcut of shortcuts) {
			if (registeredAccelerators.has(shortcut.accelerator)) continue;
			if (backend.register(shortcut.accelerator, shortcut.callback)) {
				registeredAccelerators.add(shortcut.accelerator);
				continue;
			}
			console.warn(
				`[keyboard] Failed to register focused dashboard shortcut: ${shortcut.accelerator}`,
			);
		}
	};

	const unregister = () => {
		for (const registeredAccelerator of [...registeredAccelerators]) {
			backend.unregister(registeredAccelerator);
			registeredAccelerators.delete(registeredAccelerator);
		}
	};

	const syncRegistrationToFocus = () => {
		if (backend.getFocusedWindow()) {
			register();
			return;
		}
		unregister();
	};

	const handleWindowFocus = () => {
		register();
	};
	const handleWindowBlur = () => {
		scheduleFocusCheck(syncRegistrationToFocus);
	};
	const handleWillQuit = () => {
		unregister();
	};

	return {
		dispose: () => {
			if (!installed) return;
			backend.off("browser-window-focus", handleWindowFocus);
			backend.off("browser-window-blur", handleWindowBlur);
			backend.off("will-quit", handleWillQuit);
			unregister();
			disposed = true;
			installed = false;
		},
		install: () => {
			if (installed || disposed) return;
			installed = true;
			backend.on("browser-window-focus", handleWindowFocus);
			backend.on("browser-window-blur", handleWindowBlur);
			backend.on("will-quit", handleWillQuit);
			syncRegistrationToFocus();
		},
		isRegistered: () =>
			shortcuts.every((shortcut) =>
				registeredAccelerators.has(shortcut.accelerator),
			),
	};
}

function dashboardGlobalAcceleratorPrefix(
	platform: NodeJS.Platform = process.platform,
): string {
	return platform === "darwin" ? "Alt" : "Ctrl+Alt";
}

export function focusedDashboardGlobalActionShortcuts(
	platform: NodeJS.Platform = process.platform,
): FocusedDashboardGlobalActionShortcut[] {
	const prefix = dashboardGlobalAcceleratorPrefix(platform);
	return [
		{ accelerator: `${prefix}+V`, action: "TOGGLE_VIM_MODE" },
		{
			accelerator: `${prefix}+Slash`,
			action: "SHOW_DASHBOARD_KEYBOARD_HELP",
		},
		{ accelerator: `${prefix}+F`, action: "SHOW_DASHBOARD_ACTION_HINTS" },
		{ accelerator: `${prefix}+N`, action: "OPEN_UNREAD_NATIVE_REPLY" },
		{
			accelerator: `${prefix}+Shift+N`,
			action: "MARK_LATEST_NATIVE_REPLY_READ",
		},
		{ accelerator: `${prefix}+Tab`, action: "SWITCH_DASHBOARD_VIEW_NEXT" },
		{
			accelerator: `${prefix}+Shift+Tab`,
			action: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
		},
	];
}

export function focusedDashboardWebShortcuts(
	platform: NodeJS.Platform = process.platform,
): FocusedDashboardWebShortcut[] {
	const prefix = dashboardGlobalAcceleratorPrefix(platform);
	return [
		{ accelerator: `${prefix}+1`, shortcut: "OPEN_WEB_PAGE_1" },
		{ accelerator: `${prefix}+2`, shortcut: "OPEN_WEB_PAGE_2" },
		{ accelerator: `${prefix}+3`, shortcut: "OPEN_WEB_PAGE_3" },
		{ accelerator: `${prefix}+4`, shortcut: "OPEN_WEB_PAGE_4" },
		{ accelerator: `${prefix}+5`, shortcut: "OPEN_WEB_PAGE_5" },
		{ accelerator: `${prefix}+6`, shortcut: "OPEN_WEB_PAGE_6" },
		{ accelerator: `${prefix}+C`, shortcut: "OPEN_CAPY" },
		{ accelerator: `${prefix}+Shift+C`, shortcut: "CREATE_CAPY" },
		{ accelerator: `${prefix}+D`, shortcut: "OPEN_DEVIN" },
		{ accelerator: `${prefix}+Shift+D`, shortcut: "CREATE_DEVIN" },
		{ accelerator: `${prefix}+G`, shortcut: "OPEN_CHROME" },
		{ accelerator: `${prefix}+W`, shortcut: "OPEN_WORKSPACES" },
		{
			accelerator: `${prefix}+Shift+S`,
			shortcut: "OPEN_ROOT_TERMINAL_STAG",
		},
		{
			accelerator: `${prefix}+Shift+P`,
			shortcut: "OPEN_ROOT_TERMINAL_PROD",
		},
		{
			accelerator: `${prefix}+Shift+H`,
			shortcut: "OPEN_ROOT_TERMINAL_HEPH",
		},
		{ accelerator: `${prefix}+B`, shortcut: "TOGGLE_NATIVE_BROWSER_VIEW" },
		{ accelerator: `${prefix}+S`, shortcut: "TOGGLE_NATIVE_SPLIT_VIEW" },
		{ accelerator: `${prefix}+T`, shortcut: "BROWSER_NEW_TAB" },
		{ accelerator: `${prefix}+R`, shortcut: "BROWSER_RELOAD" },
		{ accelerator: `${prefix}+Left`, shortcut: "BROWSER_GO_BACK" },
		{ accelerator: `${prefix}+Right`, shortcut: "BROWSER_GO_FORWARD" },
		{ accelerator: `${prefix}+Shift+Left`, shortcut: "BROWSER_PREVIOUS_TAB" },
		{ accelerator: `${prefix}+Shift+Right`, shortcut: "BROWSER_NEXT_TAB" },
		{ accelerator: `${prefix}+Shift+W`, shortcut: "BROWSER_CLOSE_TAB" },
		{ accelerator: `${prefix}+Shift+I`, shortcut: "BROWSER_TOGGLE_PIN" },
		{ accelerator: `${prefix}+Shift+O`, shortcut: "BROWSER_OPEN_EXTERNAL" },
		{ accelerator: `${prefix}+Shift+B`, shortcut: "BROWSER_TOGGLE_SPLIT" },
		{ accelerator: `${prefix}+Shift+X`, shortcut: "BROWSER_CLOSE_SPLIT" },
		{ accelerator: `${prefix}+Shift+F`, shortcut: "BROWSER_SWAP_SPLIT" },
		{ accelerator: `${prefix}+Shift+Comma`, shortcut: "BROWSER_NARROW_SPLIT" },
		{ accelerator: `${prefix}+Shift+Period`, shortcut: "BROWSER_WIDEN_SPLIT" },
		{ accelerator: `${prefix}+Shift+0`, shortcut: "BROWSER_EQUALIZE_SPLIT" },
	];
}

let focusedControlPlaneShortcutController: FocusedControlPlaneShortcutController | null =
	null;

export function installFocusedControlPlaneShortcut(
	onOpenControlPlane: () => void,
	onGlobalKeyboardAction?: (action: GlobalKeyboardAction) => void,
	onDashboardWebShortcut?: (shortcut: DashboardWebShortcut) => void,
): void {
	if (focusedControlPlaneShortcutController) return;
	const globalActionShortcuts = onGlobalKeyboardAction
		? focusedDashboardGlobalActionShortcuts().map((shortcut) => ({
				accelerator: shortcut.accelerator,
				callback: () => onGlobalKeyboardAction(shortcut.action),
			}))
		: [];
	const dashboardWebShortcuts = onDashboardWebShortcut
		? focusedDashboardWebShortcuts().map((shortcut) => ({
				accelerator: shortcut.accelerator,
				callback: () => onDashboardWebShortcut(shortcut.shortcut),
			}))
		: [];
	focusedControlPlaneShortcutController =
		createFocusedControlPlaneShortcutController({
			accelerator: openControlPlaneAccelerator(),
			additionalShortcuts: [...globalActionShortcuts, ...dashboardWebShortcuts],
			backend: {
				getFocusedWindow: () => BrowserWindow.getFocusedWindow(),
				off: offAppShortcutEvent,
				on: onAppShortcutEvent,
				register: (accelerator, callback) =>
					globalShortcut.register(accelerator, callback),
				unregister: (accelerator) => globalShortcut.unregister(accelerator),
			},
			onOpenControlPlane,
		});
	focusedControlPlaneShortcutController.install();
}
