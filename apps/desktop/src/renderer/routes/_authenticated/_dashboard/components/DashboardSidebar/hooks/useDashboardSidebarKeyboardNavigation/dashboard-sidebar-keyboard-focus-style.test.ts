import { describe, expect, it } from "bun:test";

const GLOBALS_CSS_URL = new URL(
	"../../../../../../../globals.css",
	import.meta.url,
);

describe("dashboard sidebar keyboard focus styles", () => {
	it("keeps preserved keyboard focus visually obvious", async () => {
		const source = await Bun.file(GLOBALS_CSS_URL).text();

		expect(source).toContain('[data-dashboard-sidebar-root="true"]');
		expect(source).toContain('[data-dashboard-sidebar-keyboard-focus="true"]');
		expect(source).toContain("inset 3px 0 0 var(--sidebar-primary)");
		expect(source).toContain("outline:");
		expect(source).toContain("var(--sidebar-accent)");
	});
});
