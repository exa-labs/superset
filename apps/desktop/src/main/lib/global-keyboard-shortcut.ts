import type { Input } from "electron";

export type GlobalKeyboardAction = "TOGGLE_VIM_MODE";

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

export function globalKeyboardActionFromInput(
	input: GlobalKeyboardShortcutInput,
): GlobalKeyboardAction | null {
	if (!isBareOptionChord(input)) return null;

	const code = input.code.toLowerCase();
	if (code === "keyv") return "TOGGLE_VIM_MODE";

	const key = input.key.toLowerCase();
	if (key === "v") return "TOGGLE_VIM_MODE";

	return null;
}
