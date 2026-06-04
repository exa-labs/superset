import { describe, expect, it } from "bun:test";
import { commandPaletteRootKeyboardActionFromKey } from "./command-palette-keyboard";

describe("commandPaletteRootKeyboardActionFromKey", () => {
	it("opens shortcut help from '?' at the root control plane", () => {
		expect(
			commandPaletteRootKeyboardActionFromKey({ depth: 0, key: "?" }),
		).toBe("show-keyboard-help");
	});

	it("keeps nested frames and ordinary keys available for command search", () => {
		expect(
			commandPaletteRootKeyboardActionFromKey({ depth: 1, key: "?" }),
		).toBe("none");
		expect(
			commandPaletteRootKeyboardActionFromKey({ depth: 0, key: "/" }),
		).toBe("none");
		expect(
			commandPaletteRootKeyboardActionFromKey({ depth: 0, key: "k" }),
		).toBe("none");
	});
});
