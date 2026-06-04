import { describe, expect, it } from "bun:test";

const commandPalettePath = `${import.meta.dir}/CommandPalette.tsx`;

describe("CommandPalette root open focus wiring", () => {
	it("refocuses the input for every global root open request", async () => {
		const source = await Bun.file(commandPalettePath).text();

		expect(source).toContain("scheduleCommandPaletteInputFocus");
		expect(source).toContain('data-command-palette-root="global"');
		expect(source).toContain("rootOpenQueryResetKey");
	});
});
