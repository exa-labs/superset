import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["⌥K", "⌥V", "?", "f"],
	browser: ["⌥K", "?", "f", "⌥G", "h/l", "n/r"],
	"command-palette": ["type", "Enter", "Esc"],
	editor: ["Esc", "⌥K"],
	"keyboard-help": ["?", "Esc"],
	"native-agent": ["r", "o/b", "m/e", "p/x", "?"],
	sidebar: ["↑↓/jk", "/", "Enter", "Space", "p/x", "."],
	terminal: ["Esc", "⌥K"],
};

export function dashboardFocusIndicatorHints(
	scopeId: DashboardFocusScopeId,
): string[] {
	return HINTS_BY_SCOPE[scopeId];
}
