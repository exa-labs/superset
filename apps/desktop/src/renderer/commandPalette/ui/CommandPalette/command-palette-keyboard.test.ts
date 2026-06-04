import { describe, expect, it } from "bun:test";
import { commandPaletteKeyboardActionFromKey } from "./command-palette-keyboard";

describe("commandPaletteKeyboardActionFromKey", () => {
	it("opens shortcut help from '?' at the root control plane", () => {
		expect(commandPaletteKeyboardActionFromKey({ depth: 0, key: "?" })).toBe(
			"show-keyboard-help",
		);
	});

	it("closes to the navigation shell from any control-plane depth", () => {
		expect(
			commandPaletteKeyboardActionFromKey({ depth: 0, key: "Escape" }),
		).toBe("close-to-navigation-shell");
		expect(
			commandPaletteKeyboardActionFromKey({ depth: 2, key: "Escape" }),
		).toBe("close-to-navigation-shell");
	});

	it("keeps nested frames and ordinary keys available for command search", () => {
		expect(commandPaletteKeyboardActionFromKey({ depth: 1, key: "?" })).toBe(
			"none",
		);
		expect(commandPaletteKeyboardActionFromKey({ depth: 0, key: "/" })).toBe(
			"none",
		);
		expect(commandPaletteKeyboardActionFromKey({ depth: 0, key: "k" })).toBe(
			"none",
		);
	});
});
