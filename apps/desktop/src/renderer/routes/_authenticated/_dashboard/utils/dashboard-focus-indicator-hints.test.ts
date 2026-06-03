import { describe, expect, it } from "bun:test";
import { dashboardFocusIndicatorHints } from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar roving, activation, expansion, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"Esc",
			"⌥K",
			"⌥Tab",
			"↑↓",
			"jk",
			"Enter",
			".",
			"?",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: true }),
		).toEqual(["Esc", "⌥K", "⌥Tab", "⌥G", "h/l", "s/q", "?", "f"]);
	});

	it("hides Vim-only action hints when Vim mode is disabled", () => {
		expect(
			dashboardFocusIndicatorHints("app", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K", "⌥V", "⌥Tab"]);
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K", "⌥Tab", "⌥G"]);
		expect(
			dashboardFocusIndicatorHints("native-agent", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K", "⌥V", "⌥Tab"]);
		expect(
			dashboardFocusIndicatorHints("sidebar", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K", "⌥Tab", "↑↓", "Enter", "."]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"Esc",
			"⌥K",
			"⌥V",
			"⌥Tab",
			"r",
			"s/b",
			"p/x",
			"?",
			"f",
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
