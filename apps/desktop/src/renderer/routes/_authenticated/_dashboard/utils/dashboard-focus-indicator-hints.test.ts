import { describe, expect, it } from "bun:test";
import {
	dashboardFocusIndicatorHints,
	dashboardFocusIndicatorShortcutTitle,
	dashboardFocusIndicatorVisibleHintLabels,
} from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	it("surfaces sidebar movement, activation, create/search, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			"⌥K/Tab",
			"↑↓ /",
			"↵/Space/h/l",
			"n/N/p/m/F/e/U/a/x/?",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: true }),
		).toEqual(["Esc", "⌥K/Tab", "j/k /", "h/l/r/s/p/x/f/?"]);
	});

	it("hides Vim-only action hints when Vim mode is disabled", () => {
		expect(
			dashboardFocusIndicatorHints("app", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K/Tab"]);
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K/Tab"]);
		expect(
			dashboardFocusIndicatorHints("native-agent", { vimModeEnabled: false }),
		).toEqual(["Esc", "⌥K/Tab", "⌥N/⌥⇧N"]);
		expect(
			dashboardFocusIndicatorHints("sidebar", { vimModeEnabled: false }),
		).toEqual(["⌥K/Tab", "↑↓ /", "↵/Space/h/l", "n/N/p/m/F/e/U/a/x/?"]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"Esc",
			"⌥K/Tab",
			"⌥N/⌥⇧N",
			"r/o/b/p/m/F/e/u/U/x/X/f/?",
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

	it("surfaces keyboard-help search and close hints instead of reopening help", () => {
		expect(dashboardFocusIndicatorHints("keyboard-help")).toEqual([
			"type",
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
				hints: ["Esc", "⌥K/Tab", "j/k /", "h/l/r/s/p/x/f/?"],
				vimModeEnabled: true,
			}),
		).toBe(
			"Browser focus. Keys: Esc, Option+K/Option+Tab, j/k, /, h/l, r, s, p, x, f, ?. Press ? for full keyboard shortcuts.",
		);
		expect(
			dashboardFocusIndicatorShortcutTitle("Browser focus", {
				hints: ["Esc", "⌥K/Tab"],
				vimModeEnabled: false,
			}),
		).toBe(
			"Browser focus. Keys: Esc, Option+K/Option+Tab. Press Option+/ for full keyboard shortcuts.",
		);
		expect(
			dashboardFocusIndicatorShortcutTitle("Sidebar focus", {
				hints: ["⌥K/Tab", "↑↓ /", "↵/Space/h/l", "n/N/p/m/F/e/U/a/x/?"],
				vimModeEnabled: false,
			}),
		).toBe(
			"Sidebar focus. Keys: Option+K/Option+Tab, Up/Down, /, Enter/Space/h/l, n, N, p, m, F, e, U, a/x, ?. Press ? for full keyboard shortcuts.",
		);
		expect(
			dashboardFocusIndicatorShortcutTitle("Native agent focus", {
				hints: ["Esc", "⌥K/Tab", "⌥N/⌥⇧N", "r/o/b/p/m/F/e/u/U/x/X/f/?"],
				vimModeEnabled: true,
			}),
		).toBe(
			"Native agent focus. Keys: Esc, Option+K/Option+Tab, Option+N/Option+Shift+N, r, o, b, p, m, F, e, u, U, x, X, f, ?. Press ? for full keyboard shortcuts.",
		);
	});

	it("shows visible command and shortcut labels without Vim-only clutter", () => {
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				["Esc", "⌥K/Tab", "j/k /", "h/l/r/s/p/x/f/?"],
				{
					vimModeEnabled: true,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU",
			"Esc Sidebar",
			"j/k Move, / Search",
			"h/l Tabs, r Reload, s Split, p/x Tab, f Map",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["Esc", "⌥K/Tab"], {
				vimModeEnabled: false,
			}),
		).toEqual(["⌥K Commands · ⌥Tab MRU", "Esc Sidebar", "⌥/ Shortcuts"]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				["⌥K/Tab", "↑↓ /", "↵/Space/h/l", "n/N/p/m/F/e/U/a/x/?"],
				{
					vimModeEnabled: false,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU",
			"↑↓ Move · / Search",
			"↵ Open · Space Toggle · h/l Expand",
			"n New, N Folder, p Pin, m/F Folder, e Rename, U Read, a/x Away, ? Map",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				["Esc", "⌥K/Tab", "⌥N/⌥⇧N", "r/o/b/p/m/F/e/u/U/x/X/f/?"],
				{
					vimModeEnabled: true,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU",
			"Esc Sidebar",
			"⌥N Unread, ⌥⇧N Read",
			"r Reply, o Browser, b View, p Pin, m/F Folder, e Rename, u Unread, U Read, x Hide, X Archive, f Hints, ? Map",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["Esc", "⌥K/Tab", "⌥N/⌥⇧N"], {
				vimModeEnabled: false,
			}),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU",
			"Esc Sidebar",
			"⌥N Unread, ⌥⇧N Read",
			"⌥/ Shortcuts",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["type", "↑↓", "↵", "Esc"], {
				vimModeEnabled: true,
			}),
		).toEqual(["type Search", "↑↓ Move", "↵ Open", "Esc Sidebar"]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(["type", "Esc"], {
				vimModeEnabled: true,
			}),
		).toEqual(["type Search", "Esc Sidebar"]);
	});
});
