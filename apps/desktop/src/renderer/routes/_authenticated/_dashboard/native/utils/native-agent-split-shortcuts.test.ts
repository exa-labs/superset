import { describe, expect, it } from "bun:test";
import { nativeAgentSplitShortcutDescriptors } from "./native-agent-split-shortcuts";

describe("nativeAgentSplitShortcutDescriptors", () => {
	it("keeps native split keyboard controls complete and discoverable", () => {
		expect(nativeAgentSplitShortcutDescriptors("split")).toEqual([
			{ action: "close-split", key: "q", label: "Close split" },
			{ action: "swap-split", key: "w", label: "Swap panes" },
			{
				action: "narrow-native-split",
				key: "[",
				label: "Narrow native pane",
			},
			{ action: "widen-native-split", key: "]", label: "Widen native pane" },
			{ action: "equalize-split", key: "=", label: "Equalize panes" },
		]);
	});

	it("hides split-only controls outside split mode", () => {
		expect(nativeAgentSplitShortcutDescriptors("native")).toEqual([]);
		expect(nativeAgentSplitShortcutDescriptors("browser")).toEqual([]);
	});
});
