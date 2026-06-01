export type DashboardBrowserVimAction =
	| "new-tab"
	| "next-tab"
	| "none"
	| "previous-tab"
	| "reload"
	| "toggle-split";

export function dashboardBrowserVimActionFromKey(
	key: string,
): DashboardBrowserVimAction {
	if (key === "n") return "new-tab";
	if (key === "r") return "reload";
	if (key === "s") return "toggle-split";
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
