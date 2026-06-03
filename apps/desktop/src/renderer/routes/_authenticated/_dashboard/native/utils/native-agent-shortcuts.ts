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

export interface NativeAgentIndexedShortcutHint {
	displayLabel: string;
	titleLabel: string;
}

export function nativeAgentIndexedShortcutHint({
	index,
	providerShortcutLabel,
}: {
	index: number;
	providerShortcutLabel: string | null | undefined;
}): NativeAgentIndexedShortcutHint | null {
	const shortcutLabel = providerShortcutLabel?.trim();
	if (!shortcutLabel || shortcutLabel === UNASSIGNED_SHORTCUT_LABEL)
		return null;
	if (index < 0 || index > 8) return null;
	const displayLabel = String(index + 1);
	return {
		displayLabel,
		titleLabel: `${shortcutLabel} ${displayLabel}`,
	};
}
