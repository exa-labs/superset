import * as commandShortcutKeycapUtils from "./command-shortcut-keycaps";

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
	typeof commandShortcutKeycapUtils
>;

const defaultShortcutKeycapUtils =
	commandShortcutKeycapUtils as OptionalCommandShortcutKeycapUtils;

function sameCommandItemShortcutKeySequence(
	left: string[],
	right: string[],
): boolean {
	if (left.length !== right.length) return false;
	return left.every((key, index) => key === right[index]);
}

function commandItemShortcutKeycapsFromLabel(
	label: string,
	utils: OptionalCommandShortcutKeycapUtils,
): string[] {
	const keycapsFromLabel = utils.commandShortcutKeycapsFromLabel;
	if (typeof keycapsFromLabel === "function") {
		return keycapsFromLabel(label);
	}

	return label.trim().split(/\s+/).filter(Boolean);
}

export function commandItemShortcutKeycapGroups(
	input: CommandItemShortcutKeycapGroupsInput,
	utils: OptionalCommandShortcutKeycapUtils = defaultShortcutKeycapUtils,
): CommandItemShortcutKeycapGroup[] {
	const keycapGroups = utils.commandShortcutKeycapGroups;
	if (typeof keycapGroups === "function") {
		return keycapGroups(input);
	}

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

	const shortcutKeys = commandItemShortcutKeycapsFromLabel(
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
	const searchText = utils.commandShortcutSearchText;
	if (typeof searchText === "function") {
		return searchText({ keys, label });
	}

	if (keys.length === 0 && !label) return "";
	return [label, keys.join(""), keys.join(" ")]
		.filter((value): value is string => Boolean(value))
		.join(" ");
}
