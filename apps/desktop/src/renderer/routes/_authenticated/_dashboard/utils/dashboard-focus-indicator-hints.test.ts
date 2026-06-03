import { describe, expect, it } from "bun:test";
import { dashboardFocusIndicatorHints } from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar roving, activation, expansion, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"Esc",
			"↑↓/jk",
			"Home/End",
			"/",
			"Enter",
			"Space",
			"n/N",
			"p/x",
			".",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(dashboardFocusIndicatorHints("browser")).toEqual([
			"Esc",
			"⌥K",
			"?",
			"f",
			"⌥G",
			"gc/gd/gw",
			"h/l",
			"n/r",
			"s/q",
			"p/x",
		]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"Esc",
			"n/N",
			"u/U",
			"r",
			"o/O/b",
			"m/e",
			"p/x",
			"?",
		]);
	});

	it("surfaces command palette typing and dismissal hints", () => {
		expect(dashboardFocusIndicatorHints("command-palette")).toEqual([
			"type",
			"↑↓",
			"Enter",
			"Backspace",
			"Esc",
		]);
	});

	it("keeps escape recovery visible in terminal and editor scopes", () => {
		expect(dashboardFocusIndicatorHints("app")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("browser")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("native-agent")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("sidebar")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("terminal")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("editor")).toContain("Esc");
	});
});
