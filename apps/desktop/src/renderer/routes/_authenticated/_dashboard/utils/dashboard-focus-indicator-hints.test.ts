import { describe, expect, it } from "bun:test";
import { dashboardFocusIndicatorHints } from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar roving, activation, expansion, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"↑↓/jk",
			"Enter",
			"Space",
			".",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(dashboardFocusIndicatorHints("browser")).toEqual([
			"⌥K",
			"f",
			"h/l",
			"n/r",
		]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"r",
			"o/b",
			"p",
			"x",
		]);
	});

	it("keeps escape recovery visible in terminal and editor scopes", () => {
		expect(dashboardFocusIndicatorHints("terminal")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("editor")).toContain("Esc");
	});
});
