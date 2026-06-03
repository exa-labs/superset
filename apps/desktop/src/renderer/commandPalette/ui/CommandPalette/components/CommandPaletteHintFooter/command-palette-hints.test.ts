import { describe, expect, it } from "bun:test";
import { getCommandPaletteFooterHints } from "./command-palette-hints";

describe("getCommandPaletteFooterHints", () => {
	it("shows the base control-plane navigation hints", () => {
		expect(getCommandPaletteFooterHints({ depth: 0, query: "" })).toEqual([
			{ keys: ["type"], label: "Search" },
			{ keys: ["↑", "↓"], label: "Move" },
			{ keys: ["Enter"], label: "Run" },
			{ keys: ["⌥", "Tab"], label: "Recent" },
			{ keys: ["?"], label: "Shortcuts" },
			{ keys: ["Esc"], label: "Close" },
		]);
	});

	it("shows Backspace as a real back action only in an empty nested frame", () => {
		expect(getCommandPaletteFooterHints({ depth: 1, query: "" })).toEqual([
			{ keys: ["type"], label: "Search" },
			{ keys: ["↑", "↓"], label: "Move" },
			{ keys: ["Enter"], label: "Run" },
			{ keys: ["Backspace"], label: "Back" },
			{ keys: ["Esc"], label: "Close" },
		]);
	});

	it("does not claim Backspace goes back while the user is editing a query", () => {
		expect(
			getCommandPaletteFooterHints({ depth: 1, query: "workspace" }),
		).toEqual([
			{ keys: ["type"], label: "Search" },
			{ keys: ["↑", "↓"], label: "Move" },
			{ keys: ["Enter"], label: "Run" },
			{ keys: ["Esc"], label: "Close" },
		]);
	});

	it("keeps root dashboard hints scoped to the root control plane", () => {
		expect(getCommandPaletteFooterHints({ depth: 1, query: "" })).not.toEqual(
			expect.arrayContaining([
				{ keys: ["⌥", "Tab"], label: "Recent" },
				{ keys: ["?"], label: "Shortcuts" },
			]),
		);
		expect(getCommandPaletteFooterHints({ depth: 0, query: "devin" })).toEqual(
			expect.arrayContaining([
				{ keys: ["⌥", "Tab"], label: "Recent" },
				{ keys: ["?"], label: "Shortcuts" },
			]),
		);
	});
});
