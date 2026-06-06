import type { Input } from "electron";

export type GlobalKeyboardAction =
	| "FOCUS_DASHBOARD_SHELL"
	| "MARK_LATEST_NATIVE_REPLY_READ"
	| "OPEN_UNREAD_NATIVE_REPLY"
	| "SHOW_DASHBOARD_ACTION_HINTS"
	| "SHOW_DASHBOARD_KEYBOARD_HELP"
	| "SWITCH_DASHBOARD_VIEW_NEXT"
	| "SWITCH_DASHBOARD_VIEW_PREVIOUS"
	| "TOGGLE_VIM_MODE";

const GLOBAL_KEYBOARD_ACTIONS: readonly GlobalKeyboardAction[] = [
	"FOCUS_DASHBOARD_SHELL",
	"MARK_LATEST_NATIVE_REPLY_READ",
	"OPEN_UNREAD_NATIVE_REPLY",
	"SHOW_DASHBOARD_ACTION_HINTS",
	"SHOW_DASHBOARD_KEYBOARD_HELP",
	"SWITCH_DASHBOARD_VIEW_NEXT",
	"SWITCH_DASHBOARD_VIEW_PREVIOUS",
	"TOGGLE_VIM_MODE",
];

const GLOBAL_KEYBOARD_ACTION_SET = new Set<string>(GLOBAL_KEYBOARD_ACTIONS);

export function isGlobalKeyboardAction(
	action: string | null | undefined,
): action is GlobalKeyboardAction {
	return action != null && GLOBAL_KEYBOARD_ACTION_SET.has(action);
}

type GlobalKeyboardShortcutInput = Pick<
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

function isShortcutKeyDownType(type: string): boolean {
	return type === "keyDown" || type === "rawKeyDown" || type === "char";
}

type ShortcutShiftState = "none" | "optional" | "required";

function hasDashboardGlobalShortcutModifiers(
	input: GlobalKeyboardShortcutInput,
	platform: NodeJS.Platform,
	shift: ShortcutShiftState,
): boolean {
	if (!input.alt || input.meta) return false;
	if (platform === "darwin" ? input.control : !input.control) return false;
	if (shift === "none" && input.shift) return false;
	if (shift === "required" && !input.shift) return false;
	return true;
}

function isBareOptionChord(
	input: GlobalKeyboardShortcutInput,
	platform: NodeJS.Platform,
): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	return hasDashboardGlobalShortcutModifiers(input, platform, "none");
}

function isOptionTabChord(
	input: GlobalKeyboardShortcutInput,
	platform: NodeJS.Platform,
): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	return hasDashboardGlobalShortcutModifiers(input, platform, "optional");
}

function isOptionShiftChord(
	input: GlobalKeyboardShortcutInput,
	platform: NodeJS.Platform,
): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	return hasDashboardGlobalShortcutModifiers(input, platform, "required");
}

function isOptionHelpChord(
	input: GlobalKeyboardShortcutInput,
	platform: NodeJS.Platform,
): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	if (!hasDashboardGlobalShortcutModifiers(input, platform, "optional")) {
		return false;
	}
	const code = input.code.toLowerCase();
	const key = input.key.toLowerCase();
	return code === "slash" || key === "/" || key === "?";
}

function isBareEscape(input: GlobalKeyboardShortcutInput): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	if (input.alt || input.control || input.meta || input.shift) return false;
	const code = input.code.toLowerCase();
	const key = input.key.toLowerCase();
	return code === "escape" || key === "escape";
}

export function globalKeyboardActionFromInput(
	input: GlobalKeyboardShortcutInput,
	platform: NodeJS.Platform = process.platform,
): GlobalKeyboardAction | null {
	if (isBareEscape(input)) return "FOCUS_DASHBOARD_SHELL";
	if (isOptionHelpChord(input, platform)) return "SHOW_DASHBOARD_KEYBOARD_HELP";

	if (isOptionTabChord(input, platform)) {
		const code = input.code.toLowerCase();
		const key = input.key.toLowerCase();
		if (code === "tab" || key === "tab") {
			return input.shift
				? "SWITCH_DASHBOARD_VIEW_PREVIOUS"
				: "SWITCH_DASHBOARD_VIEW_NEXT";
		}
	}

	if (isOptionShiftChord(input, platform)) {
		const code = input.code.toLowerCase();
		if (code === "keyn") return "MARK_LATEST_NATIVE_REPLY_READ";

		const key = input.key.toLowerCase();
		if (key === "n") return "MARK_LATEST_NATIVE_REPLY_READ";
	}

	if (!isBareOptionChord(input, platform)) return null;

	const code = input.code.toLowerCase();
	if (code === "keyf") return "SHOW_DASHBOARD_ACTION_HINTS";
	if (code === "keyn") return "OPEN_UNREAD_NATIVE_REPLY";
	if (code === "keyv") return "TOGGLE_VIM_MODE";

	const key = input.key.toLowerCase();
	if (key === "f") return "SHOW_DASHBOARD_ACTION_HINTS";
	if (key === "n") return "OPEN_UNREAD_NATIVE_REPLY";
	if (key === "v") return "TOGGLE_VIM_MODE";

	return null;
}

export function shouldPreventDefaultForGlobalKeyboardAction(
	_action: GlobalKeyboardAction,
): boolean {
	// Once the main-process bridge classifies a key as a dashboard global
	// action, the focused browser, terminal, or editor should not also consume it.
	return true;
}
