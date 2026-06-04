export type CommandPaletteRootKeyboardAction = "none" | "show-keyboard-help";

export function commandPaletteRootKeyboardActionFromKey(input: {
	depth: number;
	key: string;
}): CommandPaletteRootKeyboardAction {
	if (input.depth !== 0) return "none";
	if (input.key === "?") return "show-keyboard-help";
	return "none";
}
