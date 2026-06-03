import { describe, expect, it } from "bun:test";
import { dashboardFocusIndicatorHints } from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar roving, activation, expansion, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"Esc",
			"⌥Tab",
			"↑↓/jk",
			"gg/G",
			"/",
			"Enter/Space",
			"h/l",
			"n/N",
			"r/o/b",
			"e/m",
			"p/a/x",
			"c/d",
			".",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(dashboardFocusIndicatorHints("browser")).toEqual([
			"Esc",
			"⌥K",
			"⌥Tab",
			"?",
			"f",
			"⌥G",
			"gg/gc/gd/gw",
			"h/l",
			"n/r",
			"s/q",
			"p/x",
		]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"Esc",
			"⌥Tab",
			"n/N",
			"u/U",
			"r",
			"o/O/b",
			"s/[/]/=",
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
