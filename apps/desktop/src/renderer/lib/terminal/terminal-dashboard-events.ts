export const TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT =
	"terminal-focus-dashboard-shell";

export function dispatchTerminalFocusDashboardShellEvent(): boolean {
	if (typeof window === "undefined") return false;
	window.dispatchEvent(new Event(TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT));
	return true;
}
