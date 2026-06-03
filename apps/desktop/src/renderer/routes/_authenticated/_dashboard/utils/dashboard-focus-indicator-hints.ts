import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

interface DashboardFocusIndicatorHintOptions {
	hints?: string[];
	vimModeEnabled?: boolean;
}

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["Esc", "⌥K", "?"],
	browser: ["Esc", "⌥K", "f", "?"],
	"command-palette": ["type", "↑↓", "↵", "Esc"],
	editor: ["Esc", "⌥K"],
	"keyboard-help": ["?", "Esc"],
	"native-agent": ["Esc", "⌥K", "r", "b/p/x"],
	sidebar: ["↑↓", "↵", ".", "p/x"],
	terminal: ["Esc", "⌥K"],
};

const VIM_ONLY_HINTS = new Set([
	"?",
	"f",
	"gg/gc/gd/gw",
	"h/l",
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
	if (hint === "↑↓") return "↑↓ Move";
	if (hint === "↵") return "↵ Open";
	if (hint === ".") return ". Actions";
	if (hint === "p/x") return "p/x Pin/Hide";
	if (hint === "r") return "r Reply";
	if (hint === "b/p/x") return "b/p/x View/Pin";
	if (hint === "f") return "f Hints";
	return null;
}

export function dashboardFocusIndicatorVisibleHintLabels(
	hints: string[],
	options: DashboardFocusIndicatorHintOptions = {},
): string[] {
	const showCommandsHint = hints.includes("⌥K");
	const showVimShortcutsHint = hints.includes("?");
	const showOptionShortcutsHint =
		options.vimModeEnabled === false && showCommandsHint;
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
	if (hint === "b/p/x") return "b/p/x";
	if (hint === "p/x") return "p/x";
	return hint;
}

export function dashboardFocusIndicatorShortcutTitle(
	scopeDescription: string,
	options: DashboardFocusIndicatorHintOptions = {},
): string {
	const shortcut = options.vimModeEnabled === false ? "Option+/" : "?";
	const hints = options.hints
		?.map(readableDashboardFocusHint)
		.filter((hint) => hint.trim().length > 0);
	const hintsText = hints?.length ? ` Keys: ${hints.join(", ")}.` : "";
	return `${scopeDescription}.${hintsText} Press ${shortcut} for full keyboard shortcuts.`;
}
