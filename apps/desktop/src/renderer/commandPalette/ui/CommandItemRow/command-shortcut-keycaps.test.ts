import { describe, expect, it } from "bun:test";
import {
	commandShortcutKeycapsFromLabel,
	commandShortcutSearchText,
} from "./command-shortcut-keycaps";

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

describe("commandShortcutSearchText", () => {
	it("adds word aliases for compact macOS shortcut labels", () => {
		const keys = commandShortcutKeycapsFromLabel("⌥C n");
		const searchText = commandShortcutSearchText({
			keys,
			label: "⌥C n",
		});

		expect(searchText).toContain("option");
		expect(searchText).toContain("alt");
		expect(searchText).toContain("C");
		expect(searchText).toContain("n");
		expect(searchText).toContain("⌥Cn");
		expect(searchText).toContain("⌥ C n");
	});

	it("adds aliases for plus-separated shortcuts", () => {
		const keys = commandShortcutKeycapsFromLabel("Ctrl+Alt+K");
		const searchText = commandShortcutSearchText({
			keys,
			label: "Ctrl+Alt+K",
		});

		expect(searchText).toContain("ctrl");
		expect(searchText).toContain("control");
		expect(searchText).toContain("alt");
		expect(searchText).toContain("K");
	});

	it("returns an empty search suffix when no shortcut exists", () => {
		expect(commandShortcutSearchText({ keys: [], label: null })).toBe("");
	});
});
