import type { Input } from "electron";

export const DASHBOARD_WEB_SHORTCUTS = [
	"OPEN_CONTROL_PLANE",
	"OPEN_WEB_PAGE_1",
	"OPEN_WEB_PAGE_2",
	"OPEN_WEB_PAGE_3",
	"OPEN_WEB_PAGE_4",
	"OPEN_WEB_PAGE_5",
	"OPEN_WEB_PAGE_6",
	"OPEN_CAPY",
	"OPEN_DEVIN",
	"CREATE_CAPY",
	"CREATE_DEVIN",
	"OPEN_CHROME",
	"OPEN_WORKSPACES",
	"TOGGLE_DASHBOARD_SIDEBAR",
	"TOGGLE_NATIVE_BROWSER_VIEW",
	"TOGGLE_NATIVE_SPLIT_VIEW",
	"FOCUS_DASHBOARD_SHELL",
	"OPEN_CAPY_1",
	"OPEN_CAPY_2",
	"OPEN_CAPY_3",
	"OPEN_CAPY_4",
	"OPEN_CAPY_5",
	"OPEN_CAPY_6",
	"OPEN_CAPY_7",
	"OPEN_CAPY_8",
	"OPEN_CAPY_9",
	"OPEN_DEVIN_1",
	"OPEN_DEVIN_2",
	"OPEN_DEVIN_3",
	"OPEN_DEVIN_4",
	"OPEN_DEVIN_5",
	"OPEN_DEVIN_6",
	"OPEN_DEVIN_7",
	"OPEN_DEVIN_8",
	"OPEN_DEVIN_9",
	"SHOW_DASHBOARD_KEYBOARD_HELP",
	"BROWSER_NEW_TAB",
	"BROWSER_RELOAD",
	"BROWSER_TOGGLE_SPLIT",
	"BROWSER_CLOSE_SPLIT",
	"BROWSER_SWAP_SPLIT",
	"BROWSER_NARROW_SPLIT",
	"BROWSER_WIDEN_SPLIT",
	"BROWSER_EQUALIZE_SPLIT",
	"BROWSER_GO_BACK",
	"BROWSER_GO_FORWARD",
	"BROWSER_OPEN_EXTERNAL",
	"BROWSER_CLOSE_TAB",
	"BROWSER_TOGGLE_PIN",
	"BROWSER_PREVIOUS_TAB",
	"BROWSER_NEXT_TAB",
] as const;

export type DashboardWebShortcut = (typeof DASHBOARD_WEB_SHORTCUTS)[number];

const DASHBOARD_WEB_SHORTCUT_SET = new Set<string>(DASHBOARD_WEB_SHORTCUTS);

export function isDashboardWebShortcut(
	shortcut: string | null | undefined,
): shortcut is DashboardWebShortcut {
	return shortcut != null && DASHBOARD_WEB_SHORTCUT_SET.has(shortcut);
}

type DashboardWebShortcutInput = Pick<
	Input,
	| "alt"
	| "code"
	| "control"
	| "isAutoRepeat"
	| "key"
	| "meta"
	| "shift"
	| "type"
>;

const DIGIT_SHORTCUTS: DashboardWebShortcut[] = [
	"OPEN_WEB_PAGE_1",
	"OPEN_WEB_PAGE_2",
	"OPEN_WEB_PAGE_3",
	"OPEN_WEB_PAGE_4",
	"OPEN_WEB_PAGE_5",
	"OPEN_WEB_PAGE_6",
];
const CAPY_INDEX_SHORTCUTS: DashboardWebShortcut[] = [
	"OPEN_CAPY_1",
	"OPEN_CAPY_2",
	"OPEN_CAPY_3",
	"OPEN_CAPY_4",
	"OPEN_CAPY_5",
	"OPEN_CAPY_6",
	"OPEN_CAPY_7",
	"OPEN_CAPY_8",
	"OPEN_CAPY_9",
];
const DEVIN_INDEX_SHORTCUTS: DashboardWebShortcut[] = [
	"OPEN_DEVIN_1",
	"OPEN_DEVIN_2",
	"OPEN_DEVIN_3",
	"OPEN_DEVIN_4",
	"OPEN_DEVIN_5",
	"OPEN_DEVIN_6",
	"OPEN_DEVIN_7",
	"OPEN_DEVIN_8",
	"OPEN_DEVIN_9",
];

function digitIndexFromCode(code: string): number | null {
	const match = /^(?:digit|numpad)([1-9])$/.exec(code.toLowerCase());
	if (!match) return null;
	return Number.parseInt(match[1], 10) - 1;
}

function isShortcutKeyDownType(type: string): boolean {
	return type === "keyDown" || type === "rawKeyDown" || type === "char";
}

function dashboardWebDirectCreateShortcutFromInput(
	input: DashboardWebShortcutInput,
): DashboardWebShortcut | null {
	if (!isShortcutKeyDownType(input.type)) return null;
	if (input.isAutoRepeat) return null;
	if (!input.alt || input.control || input.meta || !input.shift) return null;

	const code = input.code.toLowerCase();
	if (code === "keyc") return "CREATE_CAPY";
	if (code === "keyd") return "CREATE_DEVIN";

	const key = input.key.toLowerCase();
	if (key === "c") return "CREATE_CAPY";
	if (key === "d") return "CREATE_DEVIN";

	return null;
}

function isPendingShortcutInput(input: DashboardWebShortcutInput): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	return !input.control && !input.meta && !input.shift;
}

export function dashboardWebDigitIndexFromInput(
	input: DashboardWebShortcutInput,
): number | null {
	if (!isShortcutKeyDownType(input.type)) return null;
	if (input.isAutoRepeat) return null;
	if (!input.alt || input.control || input.meta || input.shift) return null;
	return digitIndexFromCode(input.code);
}

export function dashboardWebPendingDigitIndexFromInput(
	input: DashboardWebShortcutInput,
): number | null {
	if (!isPendingShortcutInput(input)) return null;
	return digitIndexFromCode(input.code);
}

export function dashboardWebIndexedShortcut(
	appShortcut: DashboardWebShortcut,
	index: number,
): DashboardWebShortcut | null {
	if (!Number.isInteger(index) || index < 0 || index > 8) return null;
	if (appShortcut === "OPEN_CAPY") return CAPY_INDEX_SHORTCUTS[index] ?? null;
	if (appShortcut === "OPEN_DEVIN") return DEVIN_INDEX_SHORTCUTS[index] ?? null;
	return null;
}

export function dashboardWebCreateShortcutFromInput(
	appShortcut: DashboardWebShortcut,
	input: DashboardWebShortcutInput,
): DashboardWebShortcut | null {
	if (!isPendingShortcutInput(input)) return null;
	const code = input.code.toLowerCase();
	const key = input.key.toLowerCase();
	if (code !== "keyn" && key !== "n") return null;
	if (appShortcut === "OPEN_CAPY") return "CREATE_CAPY";
	if (appShortcut === "OPEN_DEVIN") return "CREATE_DEVIN";
	return null;
}

export function dashboardWebShortcutFromInput(
	input: DashboardWebShortcutInput,
): DashboardWebShortcut | null {
	const directCreateShortcut = dashboardWebDirectCreateShortcutFromInput(input);
	if (directCreateShortcut) return directCreateShortcut;

	if (!isShortcutKeyDownType(input.type)) return null;
	if (input.isAutoRepeat) return null;
	if (!input.alt || input.control || input.meta || input.shift) return null;

	const digitIndex = dashboardWebDigitIndexFromInput(input);
	if (digitIndex !== null && digitIndex < DIGIT_SHORTCUTS.length) {
		return DIGIT_SHORTCUTS[digitIndex] ?? null;
	}

	const code = input.code.toLowerCase();
	if (code === "keyc") return "OPEN_CAPY";
	if (code === "keyd") return "OPEN_DEVIN";
	if (code === "keyg") return "OPEN_CHROME";
	if (code === "keyw") return "OPEN_WORKSPACES";
	if (code === "keyb") return "TOGGLE_NATIVE_BROWSER_VIEW";
	if (code === "keys") return "TOGGLE_NATIVE_SPLIT_VIEW";

	const key = input.key.toLowerCase();
	if (key === "c") return "OPEN_CAPY";
	if (key === "d") return "OPEN_DEVIN";
	if (key === "g") return "OPEN_CHROME";
	if (key === "w") return "OPEN_WORKSPACES";
	if (key === "b") return "TOGGLE_NATIVE_BROWSER_VIEW";
	if (key === "s") return "TOGGLE_NATIVE_SPLIT_VIEW";

	return null;
}
