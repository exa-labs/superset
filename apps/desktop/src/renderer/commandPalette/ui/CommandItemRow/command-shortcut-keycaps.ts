const GLYPH_MODIFIERS = new Set(["⌘", "⌃", "⌥", "⇧"]);

function splitChordToken(token: string): string[] {
	if (!token) return [];
	if (token.includes("/")) return [token];
	if (token.includes("+")) return token.split("+").filter(Boolean);

	const keys: string[] = [];
	let remainderStart = 0;
	for (const char of token) {
		if (!GLYPH_MODIFIERS.has(char)) break;
		keys.push(char);
		remainderStart += char.length;
	}

	const remainder = token.slice(remainderStart);
	if (remainder) keys.push(remainder);
	return keys.length > 0 ? keys : [token];
}

export function commandShortcutKeycapsFromLabel(label: string): string[] {
	return label.trim().split(/\s+/).flatMap(splitChordToken);
}
