import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

interface DashboardFocusIndicatorHintOptions {
	vimModeEnabled?: boolean;
}

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["Esc", "⌥K", "⌥V", "⌥Tab", "?", "f"],
	browser: ["Esc", "⌥K", "⌥Tab", "⌥G", "h/l", "s/q", "?", "f"],
	"command-palette": ["type", "↑↓", "Enter", "Backspace", "Esc"],
	editor: ["Esc", "⌥K"],
	"keyboard-help": ["?", "Esc"],
	"native-agent": ["Esc", "⌥K", "⌥V", "⌥Tab", "r", "s/b", "p/x", "?", "f"],
	sidebar: ["Esc", "⌥K", "⌥Tab", "↑↓", "jk", "Enter", ".", "?"],
	terminal: ["Esc", "⌥K"],
};

const VIM_ONLY_HINTS = new Set([
	"?",
	"f",
	"gg/gc/gd/gw",
	"h/l",
	"jk",
	"m/e",
	"n/r",
	"n/N",
	"o/O/b",
	"p/x",
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
