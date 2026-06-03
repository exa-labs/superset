const GLYPH_MODIFIERS = new Set(["⌘", "⌃", "⌥", "⇧"]);
const KEY_SEARCH_ALIASES: Record<string, string[]> = {
	"⌘": ["command", "cmd", "meta"],
	"⌃": ["control", "ctrl"],
	"⌥": ["option", "opt", "alt"],
	"⇧": ["shift"],
	"↑": ["up", "arrowup", "arrow up"],
	"↓": ["down", "arrowdown", "arrow down"],
	"←": ["left", "arrowleft", "arrow left"],
	"→": ["right", "arrowright", "arrow right"],
	"↵": ["enter", "return"],
	"⌫": ["backspace"],
	"⎋": ["escape", "esc"],
	"⇥": ["tab"],
	alt: ["option", "opt"],
	cmd: ["command", "meta"],
	command: ["cmd", "meta"],
	control: ["ctrl"],
	ctrl: ["control"],
	meta: ["command", "cmd"],
	option: ["alt", "opt"],
	opt: ["option", "alt"],
};

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

export function commandShortcutSearchText({
	keys,
	label,
}: {
	keys: string[];
	label: string | null;
}): string {
	if (keys.length === 0 && !label) return "";

	const aliases = keys.flatMap((key) => [
		key,
		key.toLowerCase(),
		...(KEY_SEARCH_ALIASES[key] ?? KEY_SEARCH_ALIASES[key.toLowerCase()] ?? []),
	]);
	const compactChord = keys.join("");
	const spacedChord = keys.join(" ");

	return [
		label,
		compactChord,
		spacedChord,
		...aliases,
		...aliases.map((alias) => alias.replace(/\s+/g, "")),
	]
		.filter((value): value is string => Boolean(value))
		.join(" ");
}
