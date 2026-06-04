export type CommandPaletteKeyboardAction =
	| "close-to-navigation-shell"
	| "none"
	| "show-keyboard-help";

export function commandPaletteKeyboardActionFromKey(input: {
	depth: number;
	key: string;
}): CommandPaletteKeyboardAction {
	if (input.key === "Escape") return "close-to-navigation-shell";
	if (input.depth !== 0) return "none";
	if (input.key === "?") return "show-keyboard-help";
	return "none";
}
