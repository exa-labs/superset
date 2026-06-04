export const DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT =
	"dashboard-sidebar-keyboard-command";

export type DashboardSidebarKeyboardCommand =
	| "action-archive"
	| "action-color"
	| "action-create"
	| "action-create-folder"
	| "action-delete"
	| "action-hard-archive"
	| "action-mark-read"
	| "action-menu"
	| "action-move"
	| "action-open-browser"
	| "action-pin"
	| "action-remove-from-folder"
	| "action-rename"
	| "action-reply"
	| "action-toggle-browser"
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
		"action-archive",
		"action-color",
		"action-create",
		"action-create-folder",
		"action-delete",
		"action-hard-archive",
		"action-mark-read",
		"action-menu",
		"action-move",
		"action-open-browser",
		"action-pin",
		"action-remove-from-folder",
		"action-rename",
		"action-reply",
		"action-toggle-browser",
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

export type DashboardSidebarKeyboardCommandAction =
	| "archive"
	| "color"
	| "create"
	| "create-folder"
	| "delete"
	| "hard-archive"
	| "mark-read"
	| "menu"
	| "move"
	| "open-browser"
	| "pin"
	| "remove-from-folder"
	| "rename"
	| "reply"
	| "toggle-browser";

const DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_ACTION_SET = new Set<string>([
	"archive",
	"color",
	"create",
	"create-folder",
	"delete",
	"hard-archive",
	"mark-read",
	"menu",
	"move",
	"open-browser",
	"pin",
	"remove-from-folder",
	"rename",
	"reply",
	"toggle-browser",
]);

export function isDashboardSidebarKeyboardCommand(
	value: string | null | undefined,
): value is DashboardSidebarKeyboardCommand {
	return value != null && DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_SET.has(value);
}

export function dashboardSidebarKeyboardActionFromCommand(
	command: DashboardSidebarKeyboardCommand,
): DashboardSidebarKeyboardCommandAction | null {
	if (!command.startsWith("action-")) return null;
	const action = command.slice("action-".length);
	return DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_ACTION_SET.has(action)
		? (action as DashboardSidebarKeyboardCommandAction)
		: null;
}

export function dashboardSidebarKeyboardFallbackCommands(
	command: DashboardSidebarKeyboardCommand,
): DashboardSidebarKeyboardCommand[] {
	if (command === "action-hard-archive") return ["action-archive"];
	return [];
}

export function dispatchDashboardSidebarKeyboardCommand(
	command: DashboardSidebarKeyboardCommand,
): boolean {
	if (typeof window === "undefined") return false;
	const event = new CustomEvent<DashboardSidebarKeyboardCommandDetail>(
		DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
		{ cancelable: true, detail: { command } },
	);
	window.dispatchEvent(event);
	return event.defaultPrevented;
}

export function dispatchDashboardSidebarKeyboardCommandWithFallback(
	command: DashboardSidebarKeyboardCommand,
	onUnhandled: (command: DashboardSidebarKeyboardCommand) => void,
): boolean {
	const handled = dispatchDashboardSidebarKeyboardCommand(command);
	if (!handled) onUnhandled(command);
	return handled;
}
