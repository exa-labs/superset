export const DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT =
	"dashboard-sidebar-keyboard-command";

export type DashboardSidebarKeyboardCommand =
	| "activate"
	| "collapse"
	| "expand"
	| "focus-first"
	| "focus-last"
	| "focus-next"
	| "focus-previous"
	| "toggle-expansion";

const DASHBOARD_SIDEBAR_KEYBOARD_COMMANDS: readonly DashboardSidebarKeyboardCommand[] =
	[
		"activate",
		"collapse",
		"expand",
		"focus-first",
		"focus-last",
		"focus-next",
		"focus-previous",
		"toggle-expansion",
	];

const DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_SET = new Set<string>(
	DASHBOARD_SIDEBAR_KEYBOARD_COMMANDS,
);

export interface DashboardSidebarKeyboardCommandDetail {
	command: DashboardSidebarKeyboardCommand;
}

export function isDashboardSidebarKeyboardCommand(
	value: string | null | undefined,
): value is DashboardSidebarKeyboardCommand {
	return value != null && DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_SET.has(value);
}

export function dispatchDashboardSidebarKeyboardCommand(
	command: DashboardSidebarKeyboardCommand,
): boolean {
	if (typeof window === "undefined") return false;
	window.dispatchEvent(
		new CustomEvent<DashboardSidebarKeyboardCommandDetail>(
			DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
			{ detail: { command } },
		),
	);
	return true;
}
