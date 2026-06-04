import { describe, expect, it } from "bun:test";
import {
	commandItemShortcutKeycapGroups,
	commandItemShortcutSearchText,
} from "./command-item-shortcut-keycaps";

describe("commandItemShortcutKeycapGroups", () => {
	it("falls back when a stale helper module snapshot lacks grouped keycaps", () => {
		expect(
			commandItemShortcutKeycapGroups(
				{
					hotkeyKeys: ["⌥", "K"],
					hotkeyLabel: "⌥K",
					shortcutLabel: "k",
				},
				{},
			),
		).toEqual([
			{ id: "hotkey", keys: ["⌥", "K"], label: "⌥K" },
			{ id: "local", keys: ["k"], label: "k" },
		]);
	});

	it("uses available keycap splitting while falling back to local grouping", () => {
		expect(
			commandItemShortcutKeycapGroups(
				{
					hotkeyKeys: [],
					hotkeyLabel: null,
					shortcutLabel: "⌥C n",
				},
				{
					commandItemShortcutKeycapsFromLabel: (label) =>
						label
							.trim()
							.split(/\s+/)
							.flatMap((token) => (token === "⌥C" ? ["⌥", "C"] : [token])),
				},
			),
		).toEqual([{ id: "local", keys: ["⌥", "C", "n"], label: "⌥C n" }]);
	});

	it("renders slash alternatives as distinct local keycap groups", () => {
		expect(
			commandItemShortcutKeycapGroups({
				hotkeyKeys: [],
				hotkeyLabel: null,
				shortcutLabel: "a/x",
			}),
		).toEqual([
			{ id: "local", keys: ["a"], label: "a" },
			{ id: "local-1", keys: ["x"], label: "x" },
		]);
	});

	it("does not split slash labels that contain full chords", () => {
		expect(
			commandItemShortcutKeycapGroups({
				hotkeyKeys: [],
				hotkeyLabel: null,
				shortcutLabel: "⌥K search/sidebar",
			}),
		).toEqual([
			{
				id: "local",
				keys: ["⌥", "K", "search/sidebar"],
				label: "⌥K search/sidebar",
			},
		]);
	});
});

describe("commandItemShortcutSearchText", () => {
	it("falls back when a stale helper module snapshot lacks search text", () => {
		expect(
			commandItemShortcutSearchText(
				{
					keys: ["⌥", "K"],
					label: "⌥K",
				},
				{},
			),
		).toBe("⌥K ⌥K ⌥ K");
	});
});
