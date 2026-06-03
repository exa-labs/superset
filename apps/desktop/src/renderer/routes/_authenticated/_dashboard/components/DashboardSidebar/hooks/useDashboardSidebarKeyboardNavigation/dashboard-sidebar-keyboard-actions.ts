export type DashboardSidebarKeyboardAction =
	| "archive"
	| "color"
	| "create"
	| "delete"
	| "menu"
	| "move"
	| "none"
	| "open-browser"
	| "pin"
	| "remove-from-folder"
	| "rename"
	| "reply"
	| "toggle-browser";
export type DashboardSidebarActivationAction = "activate" | "none";

export function dashboardSidebarKeyboardActionFromKey(
	key: string,
): DashboardSidebarKeyboardAction {
	if (key === "n") return "create";
	if (key === ".") return "menu";
	if (key === "p") return "pin";
	if (key === "r") return "reply";
	if (key === "o") return "open-browser";
	if (key === "b") return "toggle-browser";
	if (key === "m") return "move";
	if (key === "F") return "remove-from-folder";
	if (key === "a" || key === "x") return "archive";
	if (key === "e") return "rename";
	if (key === "c") return "color";
	if (key === "d") return "delete";
	return "none";
}

export function dashboardSidebarKeyboardActionSelector(
	action: Exclude<DashboardSidebarKeyboardAction, "none">,
): string {
	return `[data-dashboard-sidebar-action="${action}"]`;
}

export function dashboardSidebarActivationActionFromKey(
	key: string,
): DashboardSidebarActivationAction {
	if (key === "Enter" || key === " ") return "activate";
	return "none";
}

export function dashboardSidebarRovingNavigationDeltaFromKey(
	key: string,
): -1 | 0 | 1 {
	if (key === "ArrowDown" || key === "j") return 1;
	if (key === "ArrowUp" || key === "k") return -1;
	return 0;
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
	if (dashboardSidebarRovingNavigationDeltaFromKey(input.key) !== 0) {
		return null;
	}
	if (dashboardSidebarKeyboardActionFromKey(input.key) !== "none") return null;
	return input.key;
}
