import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["Esc", "⌥K", "⌥V", "⌥Tab", "?", "f"],
	browser: [
		"Esc",
		"⌥K",
		"⌥Tab",
		"?",
		"f",
		"⌥G",
		"gg/gc/gd/gw",
		"h/l",
		"n/r",
		"s/q",
		"p/x",
	],
	"command-palette": ["type", "↑↓", "Enter", "Backspace", "Esc"],
	editor: ["Esc", "⌥K"],
	"keyboard-help": ["?", "Esc"],
	"native-agent": [
		"Esc",
		"⌥Tab",
		"n/N",
		"u/U",
		"f",
		"r",
		"o/O/b",
		"s/[/]/=",
		"m/e",
		"p/x",
		"?",
	],
	sidebar: [
		"Esc",
		"⌥Tab",
		"↑↓/jk",
		"gg/G",
		"/",
		"Enter/Space",
		"h/l",
		"n/N",
		"r/o/b",
		"e/m",
		"p/a/x",
		"c/d",
		".",
	],
	terminal: ["Esc", "⌥K"],
};

export function dashboardFocusIndicatorHints(
	scopeId: DashboardFocusScopeId,
): string[] {
	return HINTS_BY_SCOPE[scopeId];
}
