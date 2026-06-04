export type DashboardSidebarKeyboardAction =
	| "archive"
	| "color"
	| "create"
	| "create-folder"
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
export type DashboardSidebarActivationAction =
	| "activate"
	| "none"
	| "toggle-expansion";
export type DashboardSidebarLocalCommand =
	| "focus-search"
	| "none"
	| "show-help";
export type DashboardSidebarExpansionIntent = "collapse" | "expand" | "none";
export type DashboardSidebarVimJumpAction = "first" | "last" | "none";

export function dashboardSidebarTypeaheadQueryFromSeed(input: {
	currentQuery: string;
	lastAt: number;
	now: number;
	seed: string;
	thresholdMs?: number;
}): string {
	const thresholdMs = input.thresholdMs ?? 750;
	return input.now - input.lastAt < thresholdMs
		? `${input.currentQuery}${input.seed}`
		: input.seed;
}

export function isDashboardSidebarSpaceKey(key: string): boolean {
	return key === " " || key === "Spacebar" || key === "Space";
}

export function dashboardSidebarLocalKeyAllowsModifiers(input: {
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
}): boolean {
	return !input.altKey && !input.ctrlKey && !input.metaKey;
}

export function dashboardSidebarKeyboardActionFromKey(
	key: string,
): DashboardSidebarKeyboardAction {
	if (key === "n") return "create";
	if (key === "N") return "create-folder";
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
	if (key === "Enter") return "activate";
	if (isDashboardSidebarSpaceKey(key)) return "toggle-expansion";
	return "none";
}

export function dashboardSidebarRovingNavigationDeltaFromKey(
	key: string,
): -1 | 0 | 1 {
	if (key === "ArrowDown" || key === "j") return 1;
	if (key === "ArrowUp" || key === "k") return -1;
	return 0;
}

export function dashboardSidebarRovingNavigationBoundaryFromKey(
	key: string,
): "first" | "last" | null {
	if (key === "Home") return "first";
	if (key === "End") return "last";
	return null;
}

export function dashboardSidebarExpansionIntentFromKey(
	key: string,
): DashboardSidebarExpansionIntent {
	if (key === "h") return "collapse";
	if (key === "l") return "expand";
	return "none";
}

export function dashboardSidebarNextRovingIndex(input: {
	activeIndex: number;
	delta: -1 | 1;
	itemCount: number;
}): number {
	if (input.itemCount <= 0) return -1;
	if (input.activeIndex < 0) {
		return input.delta > 0 ? 0 : input.itemCount - 1;
	}
	return (input.activeIndex + input.delta + input.itemCount) % input.itemCount;
}

export function dashboardSidebarLocalCommandFromKey(
	key: string,
): DashboardSidebarLocalCommand {
	if (key === "/") return "focus-search";
	if (key === "?") return "show-help";
	return "none";
}

export function dashboardSidebarVimJumpFromKey(input: {
	key: string;
	lastGAt: number;
	now: number;
	thresholdMs?: number;
}): {
	action: DashboardSidebarVimJumpAction;
	handled: boolean;
	nextLastGAt: number;
} {
	if (input.key === "G") {
		return { action: "last", handled: true, nextLastGAt: 0 };
	}

	if (input.key !== "g") {
		return {
			action: "none",
			handled: false,
			nextLastGAt: input.lastGAt,
		};
	}

	const thresholdMs = input.thresholdMs ?? 450;
	if (input.now - input.lastGAt < thresholdMs) {
		return { action: "first", handled: true, nextLastGAt: 0 };
	}

	return { action: "none", handled: true, nextLastGAt: input.now };
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
	if (dashboardSidebarLocalCommandFromKey(input.key) !== "none") return null;
	if (dashboardSidebarRovingNavigationDeltaFromKey(input.key) !== 0) {
		return null;
	}
	if (dashboardSidebarExpansionIntentFromKey(input.key) !== "none") return null;
	if (dashboardSidebarKeyboardActionFromKey(input.key) !== "none") return null;
	return input.key;
}
