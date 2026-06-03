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
					commandShortcutKeycapsFromLabel: (label) =>
						label
							.trim()
							.split(/\s+/)
							.flatMap((token) => (token === "⌥C" ? ["⌥", "C"] : [token])),
				},
			),
		).toEqual([{ id: "local", keys: ["⌥", "C", "n"], label: "⌥C n" }]);
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
