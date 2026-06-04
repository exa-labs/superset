export interface CommandPaletteFooterHint {
	keys: string[];
	label: string;
}

export function getCommandPaletteFooterHints({
	depth,
	query,
}: {
	depth: number;
	query: string;
}): CommandPaletteFooterHint[] {
	const hasQuery = query.trim().length > 0;
	const hints: CommandPaletteFooterHint[] = [
		{ keys: ["type"], label: "Search" },
		{ keys: ["↑", "↓"], label: "Move" },
		{ keys: ["Enter"], label: "Run" },
	];

	if (depth > 0 && !hasQuery) {
		hints.push({ keys: ["Backspace"], label: "Back" });
	}

	if (depth === 0) {
		hints.push(
			{ keys: ["⌥", "Tab"], label: "Recent" },
			{ keys: ["?"], label: "Shortcuts" },
		);
	}

	hints.push({ keys: ["Esc"], label: "Sidebar" });
	return hints;
}
