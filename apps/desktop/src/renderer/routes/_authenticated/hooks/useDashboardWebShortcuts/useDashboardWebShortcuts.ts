import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import type { NativeAgentProvider } from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-ui";
import { openDashboardActionHints } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-action-hints";
import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import {
	dashboardVimGlobalActionFromKey,
	dashboardVimKey,
	dashboardVimNavigationActionFromSequence,
	nextDashboardVimSequence,
	setDashboardVimPendingPrefix,
	shouldHandleDashboardVimKey,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { DASHBOARD_WEB_PAGES } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	createDashboardWebTab,
	getDashboardWebTabs,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import { useWorkspaceSidebarStore } from "renderer/stores/workspace-sidebar-state";

type DashboardWebShortcut =
	| "OPEN_WEB_PAGE_1"
	| "OPEN_WEB_PAGE_2"
	| "OPEN_WEB_PAGE_3"
	| "OPEN_WEB_PAGE_4"
	| "OPEN_WEB_PAGE_5"
	| "OPEN_WEB_PAGE_6"
	| "OPEN_CAPY"
	| "OPEN_DEVIN"
	| "CREATE_CAPY"
	| "CREATE_DEVIN"
	| "OPEN_CHROME"
	| "OPEN_WORKSPACES"
	| "TOGGLE_DASHBOARD_SIDEBAR"
	| "TOGGLE_NATIVE_BROWSER_VIEW"
	| "TOGGLE_NATIVE_SPLIT_VIEW"
	| "OPEN_CAPY_1"
	| "OPEN_CAPY_2"
	| "OPEN_CAPY_3"
	| "OPEN_CAPY_4"
	| "OPEN_CAPY_5"
	| "OPEN_CAPY_6"
	| "OPEN_CAPY_7"
	| "OPEN_CAPY_8"
	| "OPEN_CAPY_9"
	| "OPEN_DEVIN_1"
	| "OPEN_DEVIN_2"
	| "OPEN_DEVIN_3"
	| "OPEN_DEVIN_4"
	| "OPEN_DEVIN_5"
	| "OPEN_DEVIN_6"
	| "OPEN_DEVIN_7"
	| "OPEN_DEVIN_8"
	| "OPEN_DEVIN_9"
	| "SHOW_DASHBOARD_KEYBOARD_HELP"
	| "BROWSER_NEW_TAB"
	| "BROWSER_RELOAD"
	| "BROWSER_TOGGLE_SPLIT"
	| "BROWSER_CLOSE_SPLIT"
	| "BROWSER_SWAP_SPLIT"
	| "BROWSER_NARROW_SPLIT"
	| "BROWSER_WIDEN_SPLIT"
	| "BROWSER_EQUALIZE_SPLIT"
	| "BROWSER_CLOSE_TAB"
	| "BROWSER_TOGGLE_PIN"
	| "BROWSER_PREVIOUS_TAB"
	| "BROWSER_NEXT_TAB";

type DashboardBrowserCurrentAction =
	| "close-current-tab"
	| "close-split"
	| "equalize-split"
	| "narrow-active-split"
	| "new-current-url-tab"
	| "next-tab"
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
	BROWSER_CLOSE_TAB: "close-current-tab",
	BROWSER_TOGGLE_PIN: "toggle-tab-pin",
	BROWSER_PREVIOUS_TAB: "previous-tab",
	BROWSER_NEXT_TAB: "next-tab",
};

const WEB_TAB_PREFIX_TIMEOUT_MS = 1_500;
const VIM_PREFIX_TIMEOUT_MS = 900;

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

	const openWebPage = useCallback(
		(index: number) => {
			const page = DASHBOARD_WEB_PAGES[index];
			if (!page) return;
			void navigate({
				to: "/web/$pageId",
				params: { pageId: page.id },
			});
		},
		[navigate],
	);

	const openNativeProvider = useCallback(
		(provider: NativeAgentProvider) => {
			void navigate({
				to: provider === "capy" ? "/native/capy" : "/native/devin",
			});
		},
		[navigate],
	);

	const createNativeProviderSession = useCallback(
		(provider: NativeAgentProvider) => {
			clearPendingNativeProvider();
			openNativeProvider(provider);
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
	}, [navigate]);

	const openWorkspaces = useCallback(() => {
		void navigate({ to: "/v2-workspaces" });
	}, [navigate]);

	const openNativeProviderAtIndex = useCallback(
		(provider: NativeAgentProvider, index: number) => {
			const rows = Array.from(
				document.querySelectorAll<HTMLButtonElement>(
					`[data-native-agent-session-row-provider="${provider}"]`,
				),
			);
			const row = rows[index];
			if (!row) {
				openNativeProvider(provider);
				return;
			}
			row.click();
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

			if (shortcut === "SHOW_DASHBOARD_KEYBOARD_HELP") {
				openDashboardKeyboardHelp();
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
				clearPendingNativeProvider();
				openChrome();
				return;
			}
			if (shortcut === "OPEN_WORKSPACES") {
				clearPendingNativeProvider();
				openWorkspaces();
				return;
			}
			if (shortcut === "TOGGLE_DASHBOARD_SIDEBAR") {
				clearPendingNativeProvider();
				useWorkspaceSidebarStore.getState().toggleOpen();
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
				clearPendingNativeProvider();
				openNativeProviderAtIndex("capy", capyIndex);
				return;
			}

			const devinIndex = DEVIN_INDEX_SHORTCUTS.indexOf(shortcut);
			if (devinIndex !== -1) {
				clearPendingNativeProvider();
				openNativeProviderAtIndex("devin", devinIndex);
				return;
			}

			const pageIndex = WEB_PAGE_SHORTCUTS.indexOf(shortcut);
			if (pageIndex !== -1) openIndexedTarget(pageIndex);
		},
		[
			clearPendingNativeProvider,
			createNativeProviderSession,
			openIndexedTarget,
			openChrome,
			openNativeProviderAtIndex,
			openNativeProviderWithPrefix,
			openWorkspaces,
		],
	);

	useHotkey("OPEN_WEB_PAGE_1", () => runShortcut("OPEN_WEB_PAGE_1"));
	useHotkey("OPEN_WEB_PAGE_2", () => runShortcut("OPEN_WEB_PAGE_2"));
	useHotkey("OPEN_WEB_PAGE_3", () => runShortcut("OPEN_WEB_PAGE_3"));
	useHotkey("OPEN_WEB_PAGE_4", () => runShortcut("OPEN_WEB_PAGE_4"));
	useHotkey("OPEN_WEB_PAGE_5", () => runShortcut("OPEN_WEB_PAGE_5"));
	useHotkey("OPEN_WEB_PAGE_6", () => runShortcut("OPEN_WEB_PAGE_6"));
	useHotkey("OPEN_CAPY", () => runShortcut("OPEN_CAPY"));
	useHotkey("OPEN_DEVIN", () => runShortcut("OPEN_DEVIN"));
	useHotkey("OPEN_CHROME", () => runShortcut("OPEN_CHROME"));
	useHotkey("OPEN_WORKSPACES", () => runShortcut("OPEN_WORKSPACES"));

	electronTrpc.browser.onDashboardWebShortcut.useSubscription(undefined, {
		onData: ({ shortcut }) => runShortcut(shortcut),
	});

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
					useWorkspaceSidebarStore.getState().toggleOpen();
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
