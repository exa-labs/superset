import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["⌥K", "⌥V", "?", "f"],
	browser: ["⌥K", "f", "h/l", "n/r"],
	"command-palette": ["Enter", "Esc"],
	editor: ["Esc", "⌥K"],
	"keyboard-help": ["?", "Esc"],
	"native-agent": ["r", "o/b", "p", "x"],
	sidebar: ["↑↓/jk", "Enter", "Space", "."],
	terminal: ["Esc", "⌥K"],
};

export function dashboardFocusIndicatorHints(
	scopeId: DashboardFocusScopeId,
): string[] {
	return HINTS_BY_SCOPE[scopeId];
}
