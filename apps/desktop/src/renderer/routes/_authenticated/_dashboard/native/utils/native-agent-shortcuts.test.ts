import { describe, expect, it } from "bun:test";
import {
	nativeAgentIndexedShortcutHint,
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
		expect(nativeAgentShortcutDisplayLabel("a", "x")).toBe("a or x");
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

	it("uses compact indexed sidebar hints for provider chords", () => {
		expect(
			nativeAgentIndexedShortcutHint({
				index: 0,
				providerShortcutLabel: "⌥C",
			}),
		).toEqual({
			displayLabel: "1",
			titleLabel: "⌥C 1",
		});
		expect(
			nativeAgentIndexedShortcutHint({
				index: 8,
				providerShortcutLabel: "⌥D",
			}),
		).toEqual({
			displayLabel: "9",
			titleLabel: "⌥D 9",
		});
	});

	it("omits indexed hints outside the supported visible chord range", () => {
		expect(
			nativeAgentIndexedShortcutHint({
				index: -1,
				providerShortcutLabel: "⌥C",
			}),
		).toBeNull();
		expect(
			nativeAgentIndexedShortcutHint({
				index: 9,
				providerShortcutLabel: "⌥C",
			}),
		).toBeNull();
		expect(
			nativeAgentIndexedShortcutHint({
				index: 0,
				providerShortcutLabel: "Unassigned",
			}),
		).toBeNull();
	});
});
