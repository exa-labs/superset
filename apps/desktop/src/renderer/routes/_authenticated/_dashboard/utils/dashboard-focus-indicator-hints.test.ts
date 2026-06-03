import { describe, expect, it } from "bun:test";
import { dashboardFocusIndicatorHints } from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar roving, activation, expansion, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"↑↓/jk",
			"/",
			"Enter",
			"Space",
			"p/x",
			".",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(dashboardFocusIndicatorHints("browser")).toEqual([
			"⌥K",
			"?",
			"f",
			"⌥G",
			"h/l",
			"n/r",
		]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"n/N",
			"r",
			"o/b",
			"m/e",
			"p/x",
			"?",
		]);
	});

	it("surfaces command palette typing and dismissal hints", () => {
		expect(dashboardFocusIndicatorHints("command-palette")).toEqual([
			"type",
			"Enter",
			"Esc",
		]);
	});

	it("keeps escape recovery visible in terminal and editor scopes", () => {
		expect(dashboardFocusIndicatorHints("terminal")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("editor")).toContain("Esc");
	});
});
