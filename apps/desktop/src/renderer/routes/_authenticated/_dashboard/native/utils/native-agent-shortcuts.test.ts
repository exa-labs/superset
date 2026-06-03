import { describe, expect, it } from "bun:test";
import {
	nativeAgentShortcutDisplayLabel,
	nativeAgentShortcutKeys,
	nativeAgentShortcutTitleSuffix,
} from "./native-agent-shortcuts";

describe("native agent shortcut formatting", () => {
	it("filters empty, duplicate, and unassigned shortcuts", () => {
		expect(
			nativeAgentShortcutKeys("⌥B", "b", "⌥B", "Unassigned", "", null),
		).toEqual(["⌥B", "b"]);
	});

	it("uses readable alternatives instead of slash-joined shortcut strings", () => {
		expect(nativeAgentShortcutDisplayLabel("⌥B", "b")).toBe("⌥B or b");
		expect(nativeAgentShortcutDisplayLabel("Unassigned", "s")).toBe("s");
	});

	it("expands modifier glyphs in tooltip copy", () => {
		expect(nativeAgentShortcutTitleSuffix("⌥B", "b")).toBe(
			"Press Option+B or b.",
		);
		expect(nativeAgentShortcutTitleSuffix("⌘⇧N")).toBe(
			"Press Command+Shift+N.",
		);
		expect(nativeAgentShortcutTitleSuffix("Unassigned")).toBe("");
	});
});
