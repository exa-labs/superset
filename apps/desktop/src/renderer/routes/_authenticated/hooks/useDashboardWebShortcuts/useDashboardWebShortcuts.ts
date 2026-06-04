import { useNavigate } from "@tanstack/react-router";
import type { DashboardWebShortcut } from "main/lib/dashboard-web-shortcut";
import { useCallback, useEffect, useRef } from "react";
import { useFrameStackStore } from "renderer/commandPalette/core/frames";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { dispatchDashboardNativeAgentOpenIndex } from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-shortcut-events";
import type { NativeAgentProvider } from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-ui";
import { openDashboardActionHints } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-action-hints";
import {
	type DashboardGlobalKeyboardAction,
	handleDashboardGlobalKeyboardAction,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-global-keyboard-action";
import { addDashboardKeyboardChainResetListener } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-chain-reset";
import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import { toggleDashboardNavigationSidebar } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-navigation-sidebar-toggle";
import type { DashboardQuickTerminalId } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-quick-terminals";
import { scheduleDashboardNavigationShellFocus } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-shell-focus";
import {
	type DashboardSidebarKeyboardCommand,
	dashboardSidebarKeyboardFallbackCommands,
	dispatchDashboardSidebarKeyboardCommand,
	dispatchDashboardSidebarKeyboardCommandWithFallback,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-keyboard-command";
import { focusDashboardSidebarSearch } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-search-focus";
import {
	dashboardVimGlobalActionFromKey,
	dashboardVimKey,
	dashboardVimNavigationActionFromSequence,
	isDashboardLocalVimSequenceScopeActive,
	nextDashboardVimSequence,
	setDashboardVimPendingPrefix,
	shouldHandleDashboardVimKey,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { DASHBOARD_WEB_PAGES } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	createDashboardWebTab,
	getDashboardWebTabs,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";

type DashboardBrowserCurrentAction =
	| "close-current-tab"
	| "close-split"
	| "equalize-split"
	| "go-back"
	| "go-forward"
	| "narrow-active-split"
	| "new-current-url-tab"
	| "next-tab"
	| "open-external"
	| "previous-tab"
	| "reload"
	| "swap-split"
	| "toggle-tab-pin"
	| "toggle-split"
	| "widen-active-split";

const WEB_PAGE_SHORTCUTS: DashboardWebShortcut[] = [
	"OPEN_WEB_PAGE_1",
	"OPEN_WEB_PAGE_2",
	"OPEN_WEB_PAGE_3",
	"OPEN_WEB_PAGE_4",
	"OPEN_WEB_PAGE_5",
	"OPEN_WEB_PAGE_6",
];
const CAPY_INDEX_SHORTCUTS: DashboardWebShortcut[] = [
	"OPEN_CAPY_1",
	"OPEN_CAPY_2",
	"OPEN_CAPY_3",
	"OPEN_CAPY_4",
	"OPEN_CAPY_5",
	"OPEN_CAPY_6",
	"OPEN_CAPY_7",
	"OPEN_CAPY_8",
	"OPEN_CAPY_9",
];
const DEVIN_INDEX_SHORTCUTS: DashboardWebShortcut[] = [
	"OPEN_DEVIN_1",
	"OPEN_DEVIN_2",
	"OPEN_DEVIN_3",
	"OPEN_DEVIN_4",
	"OPEN_DEVIN_5",
	"OPEN_DEVIN_6",
	"OPEN_DEVIN_7",
	"OPEN_DEVIN_8",
	"OPEN_DEVIN_9",
];
const BROWSER_SHORTCUT_ACTIONS: Partial<
	Record<DashboardWebShortcut, DashboardBrowserCurrentAction>
> = {
	BROWSER_NEW_TAB: "new-current-url-tab",
	BROWSER_RELOAD: "reload",
	BROWSER_TOGGLE_SPLIT: "toggle-split",
	BROWSER_CLOSE_SPLIT: "close-split",
	BROWSER_SWAP_SPLIT: "swap-split",
	BROWSER_NARROW_SPLIT: "narrow-active-split",
	BROWSER_WIDEN_SPLIT: "widen-active-split",
	BROWSER_EQUALIZE_SPLIT: "equalize-split",
	BROWSER_GO_BACK: "go-back",
	BROWSER_GO_FORWARD: "go-forward",
	BROWSER_OPEN_EXTERNAL: "open-external",
	BROWSER_CLOSE_TAB: "close-current-tab",
	BROWSER_TOGGLE_PIN: "toggle-tab-pin",
	BROWSER_PREVIOUS_TAB: "previous-tab",
	BROWSER_NEXT_TAB: "next-tab",
};
const SIDEBAR_SHORTCUT_COMMANDS: Partial<
	Record<DashboardWebShortcut, DashboardSidebarKeyboardCommand>
> = {
	SIDEBAR_ACTIVATE: "activate",
	SIDEBAR_COLLAPSE: "collapse",
	SIDEBAR_EXPAND: "expand",
	SIDEBAR_FOCUS_FIRST: "focus-first",
	SIDEBAR_FOCUS_LAST: "focus-last",
	SIDEBAR_FOCUS_NEXT: "focus-next",
	SIDEBAR_FOCUS_PREVIOUS: "focus-previous",
	SIDEBAR_TOGGLE_EXPANSION: "toggle-expansion",
	SIDEBAR_ACTION_ARCHIVE: "action-archive",
	SIDEBAR_ACTION_COLOR: "action-color",
	SIDEBAR_ACTION_CREATE: "action-create",
	SIDEBAR_ACTION_CREATE_FOLDER: "action-create-folder",
	SIDEBAR_ACTION_DELETE: "action-delete",
	SIDEBAR_ACTION_HARD_ARCHIVE: "action-hard-archive",
	SIDEBAR_ACTION_MARK_READ: "action-mark-read",
	SIDEBAR_ACTION_MENU: "action-menu",
	SIDEBAR_ACTION_MOVE: "action-move",
	SIDEBAR_ACTION_OPEN_BROWSER: "action-open-browser",
	SIDEBAR_ACTION_PIN: "action-pin",
	SIDEBAR_ACTION_REMOVE_FROM_FOLDER: "action-remove-from-folder",
	SIDEBAR_ACTION_RENAME: "action-rename",
	SIDEBAR_ACTION_REPLY: "action-reply",
	SIDEBAR_ACTION_TOGGLE_BROWSER: "action-toggle-browser",
};

const WEB_TAB_PREFIX_TIMEOUT_MS = 1_500;
const VIM_PREFIX_TIMEOUT_MS = 900;

export const DASHBOARD_RENDERER_WEB_SHORTCUT_HOTKEYS = [
	"OPEN_WEB_PAGE_1",
	"OPEN_WEB_PAGE_2",
	"OPEN_WEB_PAGE_3",
	"OPEN_WEB_PAGE_4",
	"OPEN_WEB_PAGE_5",
	"OPEN_WEB_PAGE_6",
	"OPEN_CAPY",
	"CREATE_CAPY",
	"OPEN_DEVIN",
	"CREATE_DEVIN",
	"OPEN_CHROME",
	"OPEN_WORKSPACES",
	"OPEN_ROOT_TERMINAL_STAG",
	"OPEN_ROOT_TERMINAL_PROD",
	"OPEN_ROOT_TERMINAL_HEPH",
	"TOGGLE_NATIVE_BROWSER_VIEW",
	"TOGGLE_NATIVE_SPLIT_VIEW",
] as const satisfies readonly DashboardWebShortcut[];

export const DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS = {
	MARK_LATEST_NATIVE_REPLY_READ: "MARK_LATEST_NATIVE_REPLY_READ",
	OPEN_UNREAD_NATIVE_REPLY: "OPEN_UNREAD_NATIVE_REPLY",
	SHOW_DASHBOARD_ACTION_HINTS: "SHOW_DASHBOARD_ACTION_HINTS",
	SHOW_DASHBOARD_KEYBOARD_HELP: "SHOW_DASHBOARD_KEYBOARD_HELP",
	SWITCH_DASHBOARD_VIEW_NEXT: "SWITCH_DASHBOARD_VIEW_NEXT",
	SWITCH_DASHBOARD_VIEW_PREVIOUS: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
	TOGGLE_VIM_MODE: "TOGGLE_VIM_MODE",
} as const satisfies Record<string, DashboardGlobalKeyboardAction>;

function digitIndexFromEvent(event: KeyboardEvent): number | null {
	const digitMatch = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
	if (!digitMatch) return null;
	return Number.parseInt(digitMatch[1], 10) - 1;
}

function isModifierOnlyEvent(event: KeyboardEvent): boolean {
	return ["Alt", "Control", "Meta", "Shift"].includes(event.key);
}

function dispatchBrowserCurrentAction(action: DashboardBrowserCurrentAction) {
	window.dispatchEvent(
		new CustomEvent("dashboard-browser-current-action", {
			detail: { action },
		}),
	);
}

function dispatchDashboardSidebarKeyboardCommandWithShellFallback(
	command: DashboardSidebarKeyboardCommand,
) {
	dispatchDashboardSidebarKeyboardCommandWithFallback(command, (unhandled) => {
		for (const fallbackCommand of dashboardSidebarKeyboardFallbackCommands(
			unhandled,
		)) {
			if (dispatchDashboardSidebarKeyboardCommand(fallbackCommand)) return;
		}
		handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL");
	});
}

export function dashboardSidebarKeyboardCommandFromVimKey(
	key: string,
): DashboardSidebarKeyboardCommand | null {
	if (key === "j") return "focus-next";
	if (key === "k") return "focus-previous";
	if (key === "h") return "collapse";
	if (key === "l") return "expand";
	if (key === "G") return "focus-last";
	if (key === "enter") return "activate";
	if (key === " " || key === "space" || key === "spacebar") {
		return "toggle-expansion";
	}
	return null;
}

export function dashboardSidebarKeyboardCommandFromShortcut(
	shortcut: DashboardWebShortcut,
): DashboardSidebarKeyboardCommand | null {
	return SIDEBAR_SHORTCUT_COMMANDS[shortcut] ?? null;
}

export function dashboardRootTerminalTargetFromShortcut(
	shortcut: DashboardWebShortcut,
): DashboardQuickTerminalId | null {
	if (shortcut === "OPEN_ROOT_TERMINAL_STAG") return "stag";
	if (shortcut === "OPEN_ROOT_TERMINAL_PROD") return "prod";
	if (shortcut === "OPEN_ROOT_TERMINAL_HEPH") return "heph";
	return null;
}

export function useDashboardWebShortcuts() {
	const navigate = useNavigate();
	const pendingNativeProviderRef = useRef<{
		provider: NativeAgentProvider;
		timeoutId: number;
	} | null>(null);
	const pendingVimPrefixRef = useRef<string | null>(null);
	const pendingVimPrefixTimeoutRef = useRef<number | null>(null);

	const clearPendingNativeProvider = useCallback(() => {
		const pending = pendingNativeProviderRef.current;
		if (!pending) return;
		window.clearTimeout(pending.timeoutId);
		pendingNativeProviderRef.current = null;
	}, []);

	const updatePendingVimPrefix = useCallback((prefix: string | null) => {
		if (pendingVimPrefixTimeoutRef.current != null) {
			window.clearTimeout(pendingVimPrefixTimeoutRef.current);
			pendingVimPrefixTimeoutRef.current = null;
		}
		pendingVimPrefixRef.current = prefix;
		setDashboardVimPendingPrefix(prefix);
		if (!prefix) return;
		pendingVimPrefixTimeoutRef.current = window.setTimeout(() => {
			pendingVimPrefixRef.current = null;
			pendingVimPrefixTimeoutRef.current = null;
			setDashboardVimPendingPrefix(null);
		}, VIM_PREFIX_TIMEOUT_MS);
	}, []);

	const clearPendingKeyboardChains = useCallback(() => {
		clearPendingNativeProvider();
		updatePendingVimPrefix(null);
	}, [clearPendingNativeProvider, updatePendingVimPrefix]);

	const runGlobalKeyboardAction = useCallback(
		(action: DashboardGlobalKeyboardAction) => {
			clearPendingKeyboardChains();
			handleDashboardGlobalKeyboardAction(action);
		},
		[clearPendingKeyboardChains],
	);

	const openWebPage = useCallback(
		(index: number) => {
			const page = DASHBOARD_WEB_PAGES[index];
			if (!page) return;
			void navigate({
				to: "/web/$pageId",
				params: { pageId: page.id },
			});
			scheduleDashboardNavigationShellFocus();
		},
		[navigate],
	);

	const openNativeProvider = useCallback(
		(provider: NativeAgentProvider, options: { focusShell?: boolean } = {}) => {
			void navigate({
				to: provider === "capy" ? "/native/capy" : "/native/devin",
			});
			if (options.focusShell !== false) {
				scheduleDashboardNavigationShellFocus();
			}
		},
		[navigate],
	);

	const createNativeProviderSession = useCallback(
		(provider: NativeAgentProvider) => {
			clearPendingNativeProvider();
			openNativeProvider(provider, { focusShell: false });
			const dispatchCreate = () => {
				window.dispatchEvent(
					new CustomEvent("dashboard-native-agent-create", {
						detail: { provider },
					}),
				);
			};
			window.setTimeout(dispatchCreate, 0);
			window.setTimeout(dispatchCreate, 150);
		},
		[clearPendingNativeProvider, openNativeProvider],
	);

	const openChrome = useCallback(() => {
		const tab =
			getDashboardWebTabs().find((candidate) => candidate.appId === "chrome") ??
			createDashboardWebTab("chrome");
		void navigate({
			to: "/web-tabs/$tabId",
			params: { tabId: tab.id },
		});
		scheduleDashboardNavigationShellFocus();
	}, [navigate]);

	const openWorkspaces = useCallback(() => {
		void navigate({ to: "/v2-workspaces" });
		scheduleDashboardNavigationShellFocus();
	}, [navigate]);

	const openRootTerminal = useCallback(
		(target: DashboardQuickTerminalId) => {
			void navigate({
				to: "/root-terminal/$target",
				params: { target },
			});
			scheduleDashboardNavigationShellFocus();
		},
		[navigate],
	);

	const openNativeProviderAtIndex = useCallback(
		(provider: NativeAgentProvider, index: number) => {
			const handled = dispatchDashboardNativeAgentOpenIndex({
				index,
				provider,
			});
			if (!handled) {
				openNativeProvider(provider);
				return;
			}
			scheduleDashboardNavigationShellFocus();
		},
		[openNativeProvider],
	);

	const openIndexedTarget = useCallback(
		(index: number) => {
			const pending = pendingNativeProviderRef.current;
			if (pending) {
				clearPendingNativeProvider();
				openNativeProviderAtIndex(pending.provider, index);
				return;
			}
			openWebPage(index);
		},
		[clearPendingNativeProvider, openNativeProviderAtIndex, openWebPage],
	);

	const armNativeProviderPrefix = useCallback(
		(provider: NativeAgentProvider) => {
			clearPendingNativeProvider();
			pendingNativeProviderRef.current = {
				provider,
				timeoutId: window.setTimeout(
					clearPendingNativeProvider,
					WEB_TAB_PREFIX_TIMEOUT_MS,
				),
			};
		},
		[clearPendingNativeProvider],
	);

	const openNativeProviderWithPrefix = useCallback(
		(provider: NativeAgentProvider) => {
			armNativeProviderPrefix(provider);
			openNativeProvider(provider);
		},
		[armNativeProviderPrefix, openNativeProvider],
	);

	const runShortcut = useCallback(
		(shortcut: DashboardWebShortcut) => {
			const browserAction = BROWSER_SHORTCUT_ACTIONS[shortcut];
			if (browserAction) {
				dispatchBrowserCurrentAction(browserAction);
				return;
			}

			const sidebarCommand =
				dashboardSidebarKeyboardCommandFromShortcut(shortcut);
			if (sidebarCommand) {
				clearPendingKeyboardChains();
				dispatchDashboardSidebarKeyboardCommandWithShellFallback(
					sidebarCommand,
				);
				return;
			}

			const rootTerminalTarget =
				dashboardRootTerminalTargetFromShortcut(shortcut);
			if (rootTerminalTarget) {
				clearPendingKeyboardChains();
				openRootTerminal(rootTerminalTarget);
				return;
			}

			if (shortcut === "SIDEBAR_FOCUS_SEARCH") {
				clearPendingKeyboardChains();
				focusDashboardSidebarSearch();
				return;
			}

			if (shortcut === "SHOW_DASHBOARD_KEYBOARD_HELP") {
				runGlobalKeyboardAction("SHOW_DASHBOARD_KEYBOARD_HELP");
				return;
			}
			if (shortcut === "OPEN_CONTROL_PLANE") {
				clearPendingKeyboardChains();
				useFrameStackStore.getState().openRoot();
				return;
			}
			if (shortcut === "FOCUS_DASHBOARD_SHELL") {
				clearPendingKeyboardChains();
				handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL");
				return;
			}
			if (shortcut === "OPEN_CAPY") {
				openNativeProviderWithPrefix("capy");
				return;
			}
			if (shortcut === "OPEN_DEVIN") {
				openNativeProviderWithPrefix("devin");
				return;
			}
			if (shortcut === "CREATE_CAPY") {
				createNativeProviderSession("capy");
				return;
			}
			if (shortcut === "CREATE_DEVIN") {
				createNativeProviderSession("devin");
				return;
			}
			if (shortcut === "OPEN_CHROME") {
				clearPendingKeyboardChains();
				openChrome();
				return;
			}
			if (shortcut === "OPEN_WORKSPACES") {
				clearPendingKeyboardChains();
				openWorkspaces();
				return;
			}
			if (shortcut === "TOGGLE_DASHBOARD_SIDEBAR") {
				clearPendingKeyboardChains();
				toggleDashboardNavigationSidebar();
				return;
			}
			if (shortcut === "TOGGLE_NATIVE_BROWSER_VIEW") {
				window.dispatchEvent(
					new CustomEvent("dashboard-native-agent-current-action", {
						detail: { action: "toggle-browser" },
					}),
				);
				return;
			}
			if (shortcut === "TOGGLE_NATIVE_SPLIT_VIEW") {
				window.dispatchEvent(
					new CustomEvent("dashboard-native-agent-current-action", {
						detail: { action: "toggle-split" },
					}),
				);
				return;
			}

			const capyIndex = CAPY_INDEX_SHORTCUTS.indexOf(shortcut);
			if (capyIndex !== -1) {
				clearPendingKeyboardChains();
				openNativeProviderAtIndex("capy", capyIndex);
				return;
			}

			const devinIndex = DEVIN_INDEX_SHORTCUTS.indexOf(shortcut);
			if (devinIndex !== -1) {
				clearPendingKeyboardChains();
				openNativeProviderAtIndex("devin", devinIndex);
				return;
			}

			const pageIndex = WEB_PAGE_SHORTCUTS.indexOf(shortcut);
			if (pageIndex !== -1) openIndexedTarget(pageIndex);
		},
		[
			clearPendingKeyboardChains,
			createNativeProviderSession,
			openIndexedTarget,
			openChrome,
			openNativeProviderAtIndex,
			openNativeProviderWithPrefix,
			openRootTerminal,
			openWorkspaces,
			runGlobalKeyboardAction,
		],
	);

	useHotkey("OPEN_WEB_PAGE_1", () => runShortcut("OPEN_WEB_PAGE_1"));
	useHotkey("OPEN_WEB_PAGE_2", () => runShortcut("OPEN_WEB_PAGE_2"));
	useHotkey("OPEN_WEB_PAGE_3", () => runShortcut("OPEN_WEB_PAGE_3"));
	useHotkey("OPEN_WEB_PAGE_4", () => runShortcut("OPEN_WEB_PAGE_4"));
	useHotkey("OPEN_WEB_PAGE_5", () => runShortcut("OPEN_WEB_PAGE_5"));
	useHotkey("OPEN_WEB_PAGE_6", () => runShortcut("OPEN_WEB_PAGE_6"));
	useHotkey("OPEN_CAPY", () => runShortcut("OPEN_CAPY"));
	useHotkey("CREATE_CAPY", () => runShortcut("CREATE_CAPY"));
	useHotkey("OPEN_DEVIN", () => runShortcut("OPEN_DEVIN"));
	useHotkey("CREATE_DEVIN", () => runShortcut("CREATE_DEVIN"));
	useHotkey("OPEN_CHROME", () => runShortcut("OPEN_CHROME"));
	useHotkey("OPEN_WORKSPACES", () => runShortcut("OPEN_WORKSPACES"));
	useHotkey("OPEN_ROOT_TERMINAL_STAG", () =>
		runShortcut("OPEN_ROOT_TERMINAL_STAG"),
	);
	useHotkey("OPEN_ROOT_TERMINAL_PROD", () =>
		runShortcut("OPEN_ROOT_TERMINAL_PROD"),
	);
	useHotkey("OPEN_ROOT_TERMINAL_HEPH", () =>
		runShortcut("OPEN_ROOT_TERMINAL_HEPH"),
	);
	useHotkey("TOGGLE_NATIVE_BROWSER_VIEW", () =>
		runShortcut("TOGGLE_NATIVE_BROWSER_VIEW"),
	);
	useHotkey("TOGGLE_NATIVE_SPLIT_VIEW", () =>
		runShortcut("TOGGLE_NATIVE_SPLIT_VIEW"),
	);
	useHotkey("SHOW_DASHBOARD_KEYBOARD_HELP", () =>
		runGlobalKeyboardAction(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS.SHOW_DASHBOARD_KEYBOARD_HELP,
		),
	);
	useHotkey("SHOW_DASHBOARD_ACTION_HINTS", () =>
		runGlobalKeyboardAction(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS.SHOW_DASHBOARD_ACTION_HINTS,
		),
	);
	useHotkey("OPEN_UNREAD_NATIVE_REPLY", () =>
		runGlobalKeyboardAction(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS.OPEN_UNREAD_NATIVE_REPLY,
		),
	);
	useHotkey("MARK_LATEST_NATIVE_REPLY_READ", () =>
		runGlobalKeyboardAction(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS.MARK_LATEST_NATIVE_REPLY_READ,
		),
	);
	useHotkey("SWITCH_DASHBOARD_VIEW_NEXT", () =>
		runGlobalKeyboardAction(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS.SWITCH_DASHBOARD_VIEW_NEXT,
		),
	);
	useHotkey("SWITCH_DASHBOARD_VIEW_PREVIOUS", () =>
		runGlobalKeyboardAction(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS.SWITCH_DASHBOARD_VIEW_PREVIOUS,
		),
	);
	useHotkey("TOGGLE_VIM_MODE", () =>
		runGlobalKeyboardAction(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS.TOGGLE_VIM_MODE,
		),
	);

	electronTrpc.browser.onDashboardWebShortcut.useSubscription(undefined, {
		onData: ({ shortcut }) => runShortcut(shortcut),
	});

	useEffect(() => {
		let lastRootOpenRequestId = useFrameStackStore.getState().rootOpenRequestId;
		const unsubscribeFromRootOpen = useFrameStackStore.subscribe((state) => {
			if (state.rootOpenRequestId === lastRootOpenRequestId) return;
			lastRootOpenRequestId = state.rootOpenRequestId;
			clearPendingKeyboardChains();
		});
		const unsubscribeFromChainReset = addDashboardKeyboardChainResetListener(
			clearPendingKeyboardChains,
		);

		return () => {
			unsubscribeFromRootOpen();
			unsubscribeFromChainReset();
		};
	}, [clearPendingKeyboardChains]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (shouldHandleDashboardVimKey(event)) {
				const key = dashboardVimKey(event);
				const globalAction = dashboardVimGlobalActionFromKey(key);
				if (globalAction === "show-action-hints") {
					updatePendingVimPrefix(null);
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
					openDashboardActionHints();
					return;
				}
				if (globalAction === "show-keyboard-help") {
					updatePendingVimPrefix(null);
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
					openDashboardKeyboardHelp();
					return;
				}
				if (globalAction === "toggle-sidebar") {
					updatePendingVimPrefix(null);
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
					toggleDashboardNavigationSidebar();
					return;
				}

				const localVimScopeActive = isDashboardLocalVimSequenceScopeActive(
					event.target,
				);
				if (!localVimScopeActive && key === "/") {
					updatePendingVimPrefix(null);
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
					focusDashboardSidebarSearch();
					return;
				}

				const sidebarCommand = !localVimScopeActive
					? dashboardSidebarKeyboardCommandFromVimKey(key)
					: null;
				if (sidebarCommand) {
					updatePendingVimPrefix(null);
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
					dispatchDashboardSidebarKeyboardCommandWithShellFallback(
						sidebarCommand,
					);
					return;
				}

				if (localVimScopeActive) {
					updatePendingVimPrefix(null);
					return;
				}

				const parsed = nextDashboardVimSequence(
					pendingVimPrefixRef.current,
					key,
				);
				updatePendingVimPrefix(parsed.pendingPrefix);
				if (parsed.pendingPrefix || parsed.sequence) {
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
				}
				if (parsed.pendingPrefix) return;
				const navigationAction = dashboardVimNavigationActionFromSequence(
					parsed.sequence,
				);
				if (navigationAction === "open-capy") openNativeProvider("capy");
				if (navigationAction === "open-devin") openNativeProvider("devin");
				if (navigationAction === "open-chrome") openChrome();
				if (navigationAction === "open-workspaces") openWorkspaces();
				if (navigationAction === "focus-sidebar-first") {
					dispatchDashboardSidebarKeyboardCommandWithFallback(
						"focus-first",
						() => handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL"),
					);
				}
				if (navigationAction !== "none") return;
			}

			const pending = pendingNativeProviderRef.current;
			if (!pending) return;
			if (event.isComposing || event.keyCode === 229) return;
			if (isModifierOnlyEvent(event)) return;

			if (event.code === "KeyN" || event.key.toLowerCase() === "n") {
				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();
				createNativeProviderSession(pending.provider);
				return;
			}

			const index = digitIndexFromEvent(event);
			clearPendingNativeProvider();
			if (index === null) return;

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			openNativeProviderAtIndex(pending.provider, index);
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
			clearPendingNativeProvider();
			updatePendingVimPrefix(null);
		};
	}, [
		clearPendingNativeProvider,
		createNativeProviderSession,
		openChrome,
		openNativeProvider,
		openNativeProviderAtIndex,
		openWorkspaces,
		updatePendingVimPrefix,
	]);
}
