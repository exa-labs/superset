import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import type { NativeAgentProvider } from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-ui";
import { DASHBOARD_WEB_PAGES } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	createDashboardWebTab,
	getDashboardWebTabs,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";

type DashboardWebShortcut =
	| "OPEN_WEB_PAGE_1"
	| "OPEN_WEB_PAGE_2"
	| "OPEN_WEB_PAGE_3"
	| "OPEN_WEB_PAGE_4"
	| "OPEN_WEB_PAGE_5"
	| "OPEN_WEB_PAGE_6"
	| "OPEN_CAPY"
	| "OPEN_DEVIN"
	| "OPEN_CHROME"
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
	| "OPEN_DEVIN_9";

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

const WEB_TAB_PREFIX_TIMEOUT_MS = 1_500;

function digitIndexFromEvent(event: KeyboardEvent): number | null {
	const digitMatch = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
	if (!digitMatch) return null;
	return Number.parseInt(digitMatch[1], 10) - 1;
}

function isModifierOnlyEvent(event: KeyboardEvent): boolean {
	return ["Alt", "Control", "Meta", "Shift"].includes(event.key);
}

export function useDashboardWebShortcuts() {
	const navigate = useNavigate();
	const pendingNativeProviderRef = useRef<{
		provider: NativeAgentProvider;
		timeoutId: number;
	} | null>(null);

	const clearPendingNativeProvider = useCallback(() => {
		const pending = pendingNativeProviderRef.current;
		if (!pending) return;
		window.clearTimeout(pending.timeoutId);
		pendingNativeProviderRef.current = null;
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

	const openChrome = useCallback(() => {
		const tab =
			getDashboardWebTabs().find((candidate) => candidate.appId === "chrome") ??
			createDashboardWebTab("chrome");
		void navigate({
			to: "/web-tabs/$tabId",
			params: { tabId: tab.id },
		});
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
			if (shortcut === "OPEN_CAPY") {
				openNativeProviderWithPrefix("capy");
				return;
			}
			if (shortcut === "OPEN_DEVIN") {
				openNativeProviderWithPrefix("devin");
				return;
			}
			if (shortcut === "OPEN_CHROME") {
				clearPendingNativeProvider();
				openChrome();
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
			openIndexedTarget,
			openChrome,
			openNativeProviderAtIndex,
			openNativeProviderWithPrefix,
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

	electronTrpc.browser.onDashboardWebShortcut.useSubscription(undefined, {
		onData: ({ shortcut }) => runShortcut(shortcut),
	});

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const pending = pendingNativeProviderRef.current;
			if (!pending) return;
			if (event.isComposing || event.keyCode === 229) return;
			if (isModifierOnlyEvent(event)) return;

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
		};
	}, [clearPendingNativeProvider, openNativeProviderAtIndex]);
}
