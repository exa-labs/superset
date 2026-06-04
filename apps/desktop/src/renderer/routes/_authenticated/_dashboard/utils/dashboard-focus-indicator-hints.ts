import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

interface DashboardFocusIndicatorHintOptions {
	hints?: string[];
	vimModeEnabled?: boolean;
}

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["Esc", "⌥K", "?"],
	browser: ["Esc", "⌥K", "j/k /", "f/?"],
	"command-palette": ["type", "↑↓", "↵", "Esc"],
	editor: ["Esc", "⌥K"],
	"keyboard-help": ["type", "Esc"],
	"native-agent": ["Esc", "⌥K", "r", "u/U"],
	sidebar: ["⌥K", "↑↓", "↵/Space", "n/p/x/?"],
	terminal: ["Esc", "⌥K"],
};

const VIM_ONLY_HINTS = new Set([
	"?",
	"f",
	"f/?",
	"gg/gc/gd/gw",
	"j/k /",
	"m/e",
	"n/r",
	"n/N",
	"b/p/x",
	"o/O/b",
	"r",
	"s/b",
	"s/q",
	"s/w/[/]/=",
	"u/U",
]);

export function dashboardFocusIndicatorHints(
	scopeId: DashboardFocusScopeId,
	options: DashboardFocusIndicatorHintOptions = {},
): string[] {
	const hints = HINTS_BY_SCOPE[scopeId];
	if (options.vimModeEnabled !== false) return hints;
	return hints.filter((hint) => !VIM_ONLY_HINTS.has(hint));
}

function visibleDashboardFocusHintLabel(hint: string): string | null {
	if (hint === "type") return "type Search";
	if (hint === "Esc") return "Esc Sidebar";
	if (hint === "↑↓") return "↑↓ Move";
	if (hint === "↵") return "↵ Open";
	if (hint === "↵/Space") return "↵ Open · Space Toggle";
	if (hint === "h/l") return "h/l Collapse";
	if (hint === "n/p/x/?") return "n New, p Pin, x Hide, ? Map";
	if (hint === ".") return ". Actions";
	if (hint === "p/x") return "p Pin, x Hide";
	if (hint === "r") return "r Reply";
	if (hint === "b/p/x") return "b View, p Pin, x Hide";
	if (hint === "u/U") return "u Open unread, U Mark read";
	if (hint === "f") return "f Hints";
	if (hint === "f/?") return "f Hints, ? Map";
	if (hint === "j/k /") return "j/k Move, / Search";
	return null;
}

function dashboardFocusHintIncludesKeyboardMap(hint: string): boolean {
	return hint.includes("?");
}

export function dashboardFocusIndicatorVisibleHintLabels(
	hints: string[],
	options: DashboardFocusIndicatorHintOptions = {},
): string[] {
	const showCommandsHint = hints.includes("⌥K");
	const showVimShortcutsHint = hints.includes("?");
	const hasLocalKeyboardMapHint = hints.some(
		dashboardFocusHintIncludesKeyboardMap,
	);
	const showOptionShortcutsHint =
		options.vimModeEnabled === false &&
		showCommandsHint &&
		!hasLocalKeyboardMapHint;
	const localHintLabels = hints
		.map(visibleDashboardFocusHintLabel)
		.filter((hint): hint is string => hint !== null);

	return [
		showCommandsHint ? "⌥K Commands" : null,
		...localHintLabels,
		showVimShortcutsHint ? "? Shortcuts" : null,
		!showVimShortcutsHint && showOptionShortcutsHint ? "⌥/ Shortcuts" : null,
	].filter((hint): hint is string => hint !== null);
}

function readableDashboardFocusHint(hint: string): string {
	if (hint === "⌥K") return "Option+K";
	if (hint === "⌥/") return "Option+/";
	if (hint === "↑↓") return "Up/Down";
	if (hint === "↵") return "Enter";
	if (hint === "↵/Space") return "Enter/Space";
	if (hint === "b/p/x") return "b, p, x";
	if (hint === "h/l") return "h/l";
	if (hint === "n/p/x/?") return "n, p, x, ?";
	if (hint === "p/x") return "p, x";
	if (hint === "f/?") return "f, ?";
	if (hint === "j/k /") return "j/k, /";
	if (hint === "u/U") return "u, U";
	return hint;
}

export function dashboardFocusIndicatorShortcutTitle(
	scopeDescription: string,
	options: DashboardFocusIndicatorHintOptions = {},
): string {
	const hasLocalKeyboardMapHint =
		options.hints?.some(dashboardFocusHintIncludesKeyboardMap) ?? false;
	const shortcut =
		options.vimModeEnabled === false && !hasLocalKeyboardMapHint
			? "Option+/"
			: "?";
	const hints = options.hints
		?.map(readableDashboardFocusHint)
		.filter((hint) => hint.trim().length > 0);
	const hintsText = hints?.length ? ` Keys: ${hints.join(", ")}.` : "";
	return `${scopeDescription}.${hintsText} Press ${shortcut} for full keyboard shortcuts.`;
}
