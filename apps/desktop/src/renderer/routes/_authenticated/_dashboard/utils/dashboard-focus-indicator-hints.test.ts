import { describe, expect, it } from "bun:test";
import { dashboardFocusIndicatorHints } from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar roving, activation, expansion, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"↑↓",
			"↵",
			".",
			"?",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: true }),
		).toEqual(["Esc", "⌥K", "f", "?"]);
	});

	it("hides Vim-only action hints when Vim mode is disabled", () => {
		expect(
			dashboardFocusIndicatorHints("app", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K"]);
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K"]);
		expect(
			dashboardFocusIndicatorHints("native-agent", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K"]);
		expect(
			dashboardFocusIndicatorHints("sidebar", { vimModeEnabled: false }),
		).toEqual(["↑↓", "↵", "."]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"Esc",
			"⌥K",
			"r",
			"?",
		]);
	});

	it("surfaces command palette typing and dismissal hints", () => {
		expect(dashboardFocusIndicatorHints("command-palette")).toEqual([
			"type",
			"↑↓",
			"↵",
			"Esc",
		]);
	});

	it("keeps the persistent focus indicator compact", () => {
		expect(
			[
				"app",
				"browser",
				"command-palette",
				"editor",
				"keyboard-help",
				"native-agent",
				"sidebar",
				"terminal",
			].every(
				(scopeId) =>
					dashboardFocusIndicatorHints(
						scopeId as Parameters<typeof dashboardFocusIndicatorHints>[0],
					).length <= 4,
			),
		).toBe(true);
	});

	it("keeps escape recovery visible in terminal and editor scopes", () => {
		expect(dashboardFocusIndicatorHints("app")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("browser")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("native-agent")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("terminal")).toContain("Esc");
		expect(dashboardFocusIndicatorHints("editor")).toContain("Esc");
	});
});
