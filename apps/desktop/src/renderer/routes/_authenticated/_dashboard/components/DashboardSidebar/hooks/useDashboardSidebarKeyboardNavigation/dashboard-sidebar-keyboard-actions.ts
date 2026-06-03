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
