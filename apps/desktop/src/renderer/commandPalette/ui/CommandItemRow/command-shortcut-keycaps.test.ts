import { describe, expect, it } from "bun:test";
import {
	commandShortcutKeycapGroups,
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

describe("commandShortcutKeycapGroups", () => {
	it("keeps global hotkeys and local Vim keys visible together", () => {
		expect(
			commandShortcutKeycapGroups({
				hotkeyKeys: ["⌥", "B"],
				hotkeyLabel: "⌥B",
				shortcutLabel: "b",
			}),
		).toEqual([
			{ id: "hotkey", keys: ["⌥", "B"], label: "⌥B" },
			{ id: "local", keys: ["b"], label: "b" },
		]);
	});

	it("deduplicates identical explicit and registered shortcuts", () => {
		expect(
			commandShortcutKeycapGroups({
				hotkeyKeys: ["⌥", "K"],
				hotkeyLabel: "⌥K",
				shortcutLabel: "⌥K",
			}),
		).toEqual([{ id: "hotkey", keys: ["⌥", "K"], label: "⌥K" }]);
	});

	it("supports local-only command shortcuts", () => {
		expect(
			commandShortcutKeycapGroups({
				hotkeyKeys: [],
				hotkeyLabel: null,
				shortcutLabel: "a/x",
			}),
		).toEqual([{ id: "local", keys: ["a/x"], label: "a/x" }]);
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

	it("adds full-word aliases for named local shortcuts", () => {
		const escapeSearchText = commandShortcutSearchText({
			keys: commandShortcutKeycapsFromLabel("Esc"),
			label: "Esc",
		});
		const backspaceSearchText = commandShortcutSearchText({
			keys: commandShortcutKeycapsFromLabel("Backspace"),
			label: "Backspace",
		});
		const enterSearchText = commandShortcutSearchText({
			keys: commandShortcutKeycapsFromLabel("Enter"),
			label: "Enter",
		});

		expect(escapeSearchText).toContain("escape");
		expect(escapeSearchText).toContain("esc");
		expect(backspaceSearchText).toContain("delete");
		expect(enterSearchText).toContain("return");
	});

	it("indexes combined global and local command shortcuts", () => {
		const groups = commandShortcutKeycapGroups({
			hotkeyKeys: ["⌥", "B"],
			hotkeyLabel: "⌥B",
			shortcutLabel: "b",
		});
		const searchText = commandShortcutSearchText({
			keys: groups.flatMap((group) => group.keys),
			label: groups.map((group) => group.label).join(" / "),
		});

		expect(searchText).toContain("⌥B / b");
		expect(searchText).toContain("option");
		expect(searchText).toContain("alt");
		expect(searchText).toContain("b");
	});

	it("returns an empty search suffix when no shortcut exists", () => {
		expect(commandShortcutSearchText({ keys: [], label: null })).toBe("");
	});
});
