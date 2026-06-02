export const DASHBOARD_QUICK_TERMINAL_EVENT = "dashboard-quick-terminal-launch";

export const DASHBOARD_QUICK_TERMINALS = [
	{ id: "stag", label: "stag" },
	{ id: "prod", label: "prod" },
	{ id: "heph", label: "heph" },
] as const;

export type DashboardQuickTerminal = (typeof DASHBOARD_QUICK_TERMINALS)[number];
export type DashboardQuickTerminalId = DashboardQuickTerminal["id"];

export interface DashboardQuickTerminalEventDetail {
	target: DashboardQuickTerminalId;
}

export function dashboardQuickTerminalCommand(
	target: DashboardQuickTerminalId,
): string {
	return `kr9 ${target}`;
}

export function dashboardQuickTerminalTitle(
	target: DashboardQuickTerminalId,
): string {
	return target;
}
