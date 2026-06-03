export type DashboardSidebarKeyboardAction =
	| "archive"
	| "create"
	| "none"
	| "pin"
	| "rename";

export function dashboardSidebarKeyboardActionFromKey(
	key: string,
): DashboardSidebarKeyboardAction {
	if (key === "n") return "create";
	if (key === "p") return "pin";
	if (key === "a" || key === "x") return "archive";
	if (key === "e") return "rename";
	return "none";
}

export function dashboardSidebarKeyboardActionSelector(
	action: Exclude<DashboardSidebarKeyboardAction, "none">,
): string {
	return `[data-dashboard-sidebar-action="${action}"]`;
}

export function dashboardSidebarTypeaheadSeedFromKey(input: {
	altKey: boolean;
	ctrlKey: boolean;
	focusInsideSidebar: boolean;
	key: string;
	metaKey: boolean;
	vimModeEnabled: boolean;
}): string | null {
	if (!input.focusInsideSidebar) return null;
	if (input.vimModeEnabled) return null;
	if (input.altKey || input.ctrlKey || input.metaKey) return null;
	if (input.key.length !== 1) return null;
	if (input.key.trim().length === 0) return null;
	if (dashboardSidebarKeyboardActionFromKey(input.key) !== "none") return null;
	return input.key;
}
