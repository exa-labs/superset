import {
	type CommandItemShortcutKeycapGroup,
	commandItemShortcutKeycapGroups,
	commandItemShortcutKeycapsFromLabel,
	commandItemShortcutSearchTextFromKeys,
} from "./command-item-shortcut-keycaps";

export type CommandShortcutKeycapGroup = CommandItemShortcutKeycapGroup;
export const commandShortcutKeycapsFromLabel =
	commandItemShortcutKeycapsFromLabel;
export function commandShortcutKeycapGroups({
	hotkeyKeys,
	hotkeyLabel,
	shortcutLabel,
}: {
	hotkeyKeys: string[];
	hotkeyLabel: string | null;
	shortcutLabel?: string | null;
}): CommandShortcutKeycapGroup[] {
	return commandItemShortcutKeycapGroups({
		hotkeyKeys,
		hotkeyLabel,
		shortcutLabel,
	});
}

export function commandShortcutSearchText({
	keys,
	label,
}: {
	keys: string[];
	label: string | null;
}): string {
	return commandItemShortcutSearchTextFromKeys({ keys, label });
}
