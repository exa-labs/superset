import type { Input } from "electron";

export type GlobalKeyboardAction =
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

export function globalKeyboardActionFromInput(
	input: GlobalKeyboardShortcutInput,
): GlobalKeyboardAction | null {
	if (isOptionTabChord(input)) {
		const code = input.code.toLowerCase();
		const key = input.key.toLowerCase();
		if (code === "tab" || key === "tab") {
			return input.shift
				? "SWITCH_DASHBOARD_VIEW_PREVIOUS"
				: "SWITCH_DASHBOARD_VIEW_NEXT";
		}
	}

	if (!isBareOptionChord(input)) return null;

	const code = input.code.toLowerCase();
	if (code === "keyv") return "TOGGLE_VIM_MODE";

	const key = input.key.toLowerCase();
	if (key === "v") return "TOGGLE_VIM_MODE";

	return null;
}
