import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["Esc", "⌥K", "⌥V", "?", "f"],
	browser: ["Esc", "⌥K", "?", "f", "⌥G", "h/l", "n/r"],
	"command-palette": ["type", "Enter", "Esc"],
	editor: ["Esc", "⌥K"],
	"keyboard-help": ["?", "Esc"],
	"native-agent": ["Esc", "n/N", "u/U", "r", "o/O/b", "m/e", "p/x", "?"],
	sidebar: ["Esc", "↑↓/jk", "/", "Enter", "Space", "n/N", "p/x", "."],
	terminal: ["Esc", "⌥K"],
};

export function dashboardFocusIndicatorHints(
	scopeId: DashboardFocusScopeId,
): string[] {
	return HINTS_BY_SCOPE[scopeId];
}
