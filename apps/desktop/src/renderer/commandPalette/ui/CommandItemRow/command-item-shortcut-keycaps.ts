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

export interface CommandItemShortcutKeycapGroup {
	id: string;
	label: string;
	keys: string[];
}

interface CommandItemShortcutKeycapGroupsInput {
	hotkeyKeys: string[];
	hotkeyLabel: string | null;
	shortcutLabel?: string | null;
}

type OptionalCommandShortcutKeycapUtils = Partial<
	typeof commandItemShortcutKeycapUtils
>;

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

export function commandItemShortcutKeycapsFromLabel(label: string): string[] {
	return label.trim().split(/\s+/).flatMap(splitChordToken);
}

export function commandItemShortcutSearchTextFromKeys({
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

function sameCommandItemShortcutKeySequence(
	left: string[],
	right: string[],
): boolean {
	if (left.length !== right.length) return false;
	return left.every((key, index) => key === right[index]);
}

function commandItemShortcutKeycapsFromLabelWithFallback(
	label: string,
	utils: OptionalCommandShortcutKeycapUtils,
): string[] {
	const keycapsFromLabel = utils.commandItemShortcutKeycapsFromLabel;
	if (typeof keycapsFromLabel === "function") {
		return keycapsFromLabel(label);
	}

	return label.trim().split(/\s+/).filter(Boolean);
}

export function commandItemShortcutKeycapGroups(
	input: CommandItemShortcutKeycapGroupsInput,
	utils: OptionalCommandShortcutKeycapUtils = defaultShortcutKeycapUtils,
): CommandItemShortcutKeycapGroup[] {
	const groups: CommandItemShortcutKeycapGroup[] = [];
	const trimmedHotkeyLabel = input.hotkeyLabel?.trim() || null;
	const trimmedShortcutLabel = input.shortcutLabel?.trim() || null;

	if (
		trimmedHotkeyLabel &&
		trimmedHotkeyLabel !== "Unassigned" &&
		input.hotkeyKeys.length > 0
	) {
		groups.push({
			id: "hotkey",
			keys: input.hotkeyKeys,
			label: trimmedHotkeyLabel,
		});
	}

	if (!trimmedShortcutLabel || trimmedShortcutLabel === "Unassigned") {
		return groups;
	}

	const shortcutKeys = commandItemShortcutKeycapsFromLabelWithFallback(
		trimmedShortcutLabel,
		utils,
	);
	if (shortcutKeys.length === 0) return groups;
	const duplicateHotkey =
		trimmedShortcutLabel === trimmedHotkeyLabel ||
		sameCommandItemShortcutKeySequence(shortcutKeys, input.hotkeyKeys);
	if (duplicateHotkey) return groups;

	groups.push({
		id: "local",
		keys: shortcutKeys,
		label: trimmedShortcutLabel,
	});
	return groups;
}

export function commandItemShortcutSearchText(
	{
		keys,
		label,
	}: {
		keys: string[];
		label: string | null;
	},
	utils: OptionalCommandShortcutKeycapUtils = defaultShortcutKeycapUtils,
): string {
	const searchText = utils.commandItemShortcutSearchTextFromKeys;
	if (typeof searchText === "function") {
		return searchText({ keys, label });
	}

	if (keys.length === 0 && !label) return "";
	return [label, keys.join(""), keys.join(" ")]
		.filter((value): value is string => Boolean(value))
		.join(" ");
}

const commandItemShortcutKeycapUtils = {
	commandItemShortcutKeycapsFromLabel,
	commandItemShortcutSearchTextFromKeys,
};

const defaultShortcutKeycapUtils =
	commandItemShortcutKeycapUtils as OptionalCommandShortcutKeycapUtils;
