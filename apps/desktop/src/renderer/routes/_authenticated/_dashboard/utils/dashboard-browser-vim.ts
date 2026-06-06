import type { DashboardBrowserShortcutAction } from "./dashboard-browser-shortcuts";

export type DashboardBrowserVimAction = DashboardBrowserShortcutAction | "none";

export function dashboardBrowserVimActionFromKey(
	key: string,
): DashboardBrowserVimAction {
	if (key === "n") return "new-current-url-tab";
	if (key === "r") return "reload";
	if (key === "s") return "toggle-split";
	if (key === "w") return "swap-split";
	if (key === "[") return "narrow-active-split";
	if (key === "]") return "widen-active-split";
	if (key === "=") return "equalize-split";
	if (key === "q") return "close-split";
	if (key === "x") return "close-current-tab";
	if (key === "p") return "toggle-tab-pin";
	if (key === "H") return "go-back";
	if (key === "L") return "go-forward";
	if (key === "O") return "open-external";
	if (key === "h") return "previous-tab";
	if (key === "l") return "next-tab";
	return "none";
}

export function nextDashboardBrowserTabId(
	tabIds: string[],
	activeTabId: string | null,
	direction: -1 | 1,
): string | null {
	if (tabIds.length === 0) return null;
	if (!activeTabId) return tabIds[0] ?? null;

	const activeIndex = tabIds.indexOf(activeTabId);
	if (activeIndex === -1) return tabIds[0] ?? null;

	const nextIndex = (activeIndex + direction + tabIds.length) % tabIds.length;
	return tabIds[nextIndex] ?? null;
}
