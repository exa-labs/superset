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

function isBareOptionChord(input: GlobalKeyboardShortcutInput): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	return input.alt && !input.control && !input.meta && !input.shift;
}

function isOptionTabChord(input: GlobalKeyboardShortcutInput): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	return input.alt && !input.control && !input.meta;
}

function isOptionShiftChord(input: GlobalKeyboardShortcutInput): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	return input.alt && input.shift && !input.control && !input.meta;
}

function isOptionHelpChord(input: GlobalKeyboardShortcutInput): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	if (!input.alt || input.control || input.meta) return false;
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
): GlobalKeyboardAction | null {
	if (isBareEscape(input)) return "FOCUS_DASHBOARD_SHELL";
	if (isOptionHelpChord(input)) return "SHOW_DASHBOARD_KEYBOARD_HELP";

	if (isOptionTabChord(input)) {
		const code = input.code.toLowerCase();
		const key = input.key.toLowerCase();
		if (code === "tab" || key === "tab") {
			return input.shift
				? "SWITCH_DASHBOARD_VIEW_PREVIOUS"
				: "SWITCH_DASHBOARD_VIEW_NEXT";
		}
	}

	if (isOptionShiftChord(input)) {
		const code = input.code.toLowerCase();
		if (code === "keyn") return "MARK_LATEST_NATIVE_REPLY_READ";

		const key = input.key.toLowerCase();
		if (key === "n") return "MARK_LATEST_NATIVE_REPLY_READ";
	}

	if (!isBareOptionChord(input)) return null;

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
	action: GlobalKeyboardAction,
): boolean {
	return action !== "FOCUS_DASHBOARD_SHELL";
}
