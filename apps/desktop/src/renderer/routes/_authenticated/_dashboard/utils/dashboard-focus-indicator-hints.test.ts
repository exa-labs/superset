import { describe, expect, it } from "bun:test";
import {
	dashboardFocusIndicatorHints,
	dashboardFocusIndicatorShortcutTitle,
	dashboardFocusIndicatorVisibleHintLabels,
} from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar roving, activation, expansion, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"↑↓",
			"↵",
			".",
			"p/x",
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
		).toEqual(["↑↓", "↵", ".", "p/x"]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"Esc",
			"⌥K",
			"r",
			"b/p/x",
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

	it("advertises the shortcut that works in the current keyboard mode", () => {
		expect(
			dashboardFocusIndicatorShortcutTitle("Browser focus", {
				hints: ["Esc", "⌥K", "f", "?"],
				vimModeEnabled: true,
			}),
		).toBe(
			"Browser focus. Keys: Esc, Option+K, f, ?. Press ? for full keyboard shortcuts.",
		);
		expect(
			dashboardFocusIndicatorShortcutTitle("Browser focus", {
				hints: ["Esc", "⌥K"],
				vimModeEnabled: false,
			}),
		).toBe(
			"Browser focus. Keys: Esc, Option+K. Press Option+/ for full keyboard shortcuts.",
		);
	});

	it("shows visible command and shortcut labels without Vim-only clutter", () => {
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["Esc", "⌥K", "f", "?"], {
				vimModeEnabled: true,
			}),
		).toEqual(["⌥K Commands", "Esc Sidebar", "f Hints", "? Shortcuts"]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["Esc", "⌥K"], {
				vimModeEnabled: false,
			}),
		).toEqual(["⌥K Commands", "Esc Sidebar", "⌥/ Shortcuts"]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["↑↓", "↵", ".", "p/x"], {
				vimModeEnabled: false,
			}),
		).toEqual(["↑↓ Move", "↵ Open", ". Actions", "p/x Pin/Hide"]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["Esc", "⌥K", "r", "b/p/x"], {
				vimModeEnabled: true,
			}),
		).toEqual(["⌥K Commands", "Esc Sidebar", "r Reply", "b/p/x View/Pin"]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["type", "↑↓", "↵", "Esc"], {
				vimModeEnabled: true,
			}),
		).toEqual(["type Search", "↑↓ Move", "↵ Open", "Esc Sidebar"]);
	});
});
