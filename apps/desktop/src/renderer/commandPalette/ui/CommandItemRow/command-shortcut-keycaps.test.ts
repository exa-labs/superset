import { describe, expect, it } from "bun:test";
import { commandShortcutKeycapsFromLabel } from "./command-shortcut-keycaps";

describe("commandShortcutKeycapsFromLabel", () => {
	it("splits compact macOS chords into readable keycaps", () => {
		expect(commandShortcutKeycapsFromLabel("⌥C n")).toEqual(["⌥", "C", "n"]);
		expect(commandShortcutKeycapsFromLabel("⌘⇧N")).toEqual(["⌘", "⇧", "N"]);
	});

	it("splits non-macOS plus-separated chords", () => {
		expect(commandShortcutKeycapsFromLabel("Ctrl+Alt+K")).toEqual([
			"Ctrl",
			"Alt",
			"K",
		]);
	});

	it("keeps slash alternatives as one compact keycap", () => {
		expect(commandShortcutKeycapsFromLabel("a/x")).toEqual(["a/x"]);
	});

	it("ignores extra whitespace", () => {
		expect(commandShortcutKeycapsFromLabel("  ⌥D   3 ")).toEqual([
			"⌥",
			"D",
			"3",
		]);
	});
});
