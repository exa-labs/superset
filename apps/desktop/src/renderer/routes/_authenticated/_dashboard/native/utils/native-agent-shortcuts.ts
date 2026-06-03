const UNASSIGNED_SHORTCUT_LABEL = "Unassigned";

const SHORTCUT_WORD_REPLACEMENTS: Array<[string, string]> = [
	["⌘", "Command+"],
	["⌃", "Control+"],
	["⌥", "Option+"],
	["⇧", "Shift+"],
];

export function nativeAgentShortcutKeys(
	...keys: Array<string | null | undefined>
): string[] {
	const seen = new Set<string>();
	return keys
		.map((key) => key?.trim())
		.filter(
			(key): key is string => Boolean(key) && key !== UNASSIGNED_SHORTCUT_LABEL,
		)
		.filter((key) => {
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

export function nativeAgentShortcutDisplayLabel(
	...keys: Array<string | null | undefined>
): string {
	return nativeAgentShortcutKeys(...keys).join(" or ");
}

function nativeAgentShortcutReadableKey(key: string): string {
	return SHORTCUT_WORD_REPLACEMENTS.reduce(
		(current, [symbol, word]) => current.replaceAll(symbol, word),
		key,
	).replace(/\+$/g, "");
}

export function nativeAgentShortcutTitleSuffix(
	...keys: Array<string | null | undefined>
): string {
	const readableKeys = nativeAgentShortcutKeys(...keys).map(
		nativeAgentShortcutReadableKey,
	);
	if (readableKeys.length === 0) return "";
	return `Press ${readableKeys.join(" or ")}.`;
}
