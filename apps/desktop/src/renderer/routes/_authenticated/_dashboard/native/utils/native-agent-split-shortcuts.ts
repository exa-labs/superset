import type { NativeAgentViewMode } from "./native-agent-keyboard";

export type NativeAgentSplitShortcutAction =
	| "close-split"
	| "equalize-split"
	| "narrow-native-split"
	| "swap-split"
	| "widen-native-split";

export interface NativeAgentSplitShortcutDescriptor {
	action: NativeAgentSplitShortcutAction;
	key: string;
	label: string;
}

const SPLIT_SHORTCUTS: NativeAgentSplitShortcutDescriptor[] = [
	{ action: "close-split", key: "q", label: "Close split" },
	{ action: "swap-split", key: "w", label: "Swap panes" },
	{ action: "narrow-native-split", key: "[", label: "Narrow native pane" },
	{ action: "widen-native-split", key: "]", label: "Widen native pane" },
	{ action: "equalize-split", key: "=", label: "Equalize panes" },
];

export function nativeAgentSplitShortcutDescriptors(
	viewMode: NativeAgentViewMode,
): NativeAgentSplitShortcutDescriptor[] {
	return viewMode === "split" ? SPLIT_SHORTCUTS : [];
}
