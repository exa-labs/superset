import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_QUICK_TERMINALS,
	dashboardQuickTerminalCommand,
	dashboardQuickTerminalTitle,
} from "./dashboard-quick-terminals";

describe("dashboard quick terminals", () => {
	it("defines the three kr9 targets in sidebar order", () => {
		expect(DASHBOARD_QUICK_TERMINALS.map((terminal) => terminal.id)).toEqual([
			"stag",
			"prod",
			"heph",
		]);
	});

	it("builds the kr9 command for each target", () => {
		expect(dashboardQuickTerminalCommand("stag")).toBe("kr9 stag");
		expect(dashboardQuickTerminalCommand("prod")).toBe("kr9 prod");
		expect(dashboardQuickTerminalCommand("heph")).toBe("kr9 heph");
	});

	it("uses the short target as the terminal title", () => {
		expect(dashboardQuickTerminalTitle("stag")).toBe("stag");
	});
});
