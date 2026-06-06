import { describe, expect, it } from "bun:test";
import {
	dashboardFocusIndicatorHints,
	dashboardFocusIndicatorShortcutTitle,
	dashboardFocusIndicatorVisibleHintLabels,
} from "./dashboard-focus-indicator-hints";

describe("dashboardFocusIndicatorHints", () => {
	const GLOBAL_NAV_HINT = "⌥K/Tab/1-6/C/D/G/V";

	it("surfaces sidebar movement, activation, create/search, and action keys", () => {
		expect(dashboardFocusIndicatorHints("sidebar")).toEqual([
			GLOBAL_NAV_HINT,
			"↑↓ /",
			"↵/Space/h/l",
			"n/N/p/m/F/e/U/a/x/X/c/d/?",
		]);
	});

	it("surfaces global and Vim action hints from browser focus", () => {
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: true }),
		).toEqual(["Esc", GLOBAL_NAV_HINT, "j/k /", "h/l/r/s/p/x/u/U/f/?"]);
	});

	it("hides Vim-only action hints when Vim mode is disabled", () => {
		expect(
			dashboardFocusIndicatorHints("app", { vimModeEnabled: false }),
		).toEqual(["Esc", GLOBAL_NAV_HINT, "⌥./P/A/M/E"]);
		expect(
			dashboardFocusIndicatorHints("browser", { vimModeEnabled: false }),
		).toEqual(["Esc", GLOBAL_NAV_HINT, "⌥./P/A/M/E"]);
		expect(
			dashboardFocusIndicatorHints("editor", { vimModeEnabled: false }),
		).toEqual(["Esc", GLOBAL_NAV_HINT, "⌥./P/A/M/E"]);
		expect(
			dashboardFocusIndicatorHints("native-agent", { vimModeEnabled: false }),
		).toEqual(["Esc", GLOBAL_NAV_HINT, "⌥N/⌥⇧N", "⌥./P/A/M/E"]);
		expect(
			dashboardFocusIndicatorHints("sidebar", { vimModeEnabled: false }),
		).toEqual([
			GLOBAL_NAV_HINT,
			"↑↓ /",
			"↵/Space/h/l",
			"n/N/p/m/F/e/U/a/x/X/c/d/?",
		]);
		expect(
			dashboardFocusIndicatorHints("terminal", { vimModeEnabled: false }),
		).toEqual(["Esc", GLOBAL_NAV_HINT, "⌥./P/A/M/E"]);
	});

	it("surfaces native agent inbox actions", () => {
		expect(dashboardFocusIndicatorHints("native-agent")).toEqual([
			"Esc",
			GLOBAL_NAV_HINT,
			"⌥N/⌥⇧N",
			"j/k/gg/G/actions/?",
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
				hints: ["Esc", GLOBAL_NAV_HINT, "j/k /", "h/l/r/s/p/x/u/U/f/?"],
				vimModeEnabled: true,
			}),
		).toBe(
			"Browser focus. Keys: Esc, Option+K, Option+Tab, Option+1-6, Option+C/D/G, Option+V, j/k, /, h/l, r, s, p, x, u, U, f, ?. Press ? for full keyboard shortcuts.",
		);
		expect(
			dashboardFocusIndicatorShortcutTitle("Browser focus", {
				hints: ["Esc", GLOBAL_NAV_HINT, "⌥./P/A/M/E"],
				vimModeEnabled: false,
			}),
		).toBe(
			"Browser focus. Keys: Esc, Option+K, Option+Tab, Option+1-6, Option+C/D/G, Option+V, Option+period actions menu and Option+P/A/M/E row actions. Press Option+/ for full keyboard shortcuts.",
		);
		expect(
			dashboardFocusIndicatorShortcutTitle("Sidebar focus", {
				hints: [
					GLOBAL_NAV_HINT,
					"↑↓ /",
					"↵/Space/h/l",
					"n/N/p/m/F/e/U/a/x/X/c/d/?",
				],
				vimModeEnabled: false,
			}),
		).toBe(
			"Sidebar focus. Keys: Option+K, Option+Tab, Option+1-6, Option+C/D/G, Option+V, Up/Down, /, Enter/Space/h/l, n, N, p, m, F, e, U, a, x, X, c, d, ?. Press ? for full keyboard shortcuts.",
		);
		expect(
			dashboardFocusIndicatorShortcutTitle("Native agent focus", {
				hints: ["Esc", GLOBAL_NAV_HINT, "⌥N/⌥⇧N", "j/k/gg/G/actions/?"],
				vimModeEnabled: true,
			}),
		).toBe(
			"Native agent focus. Keys: Esc, Option+K, Option+Tab, Option+1-6, Option+C/D/G, Option+V, Option+N/Option+Shift+N, j/k, gg/G, action keys, ?. Press ? for full keyboard shortcuts.",
		);
	});

	it("shows visible command and shortcut labels without Vim-only clutter", () => {
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				["Esc", GLOBAL_NAV_HINT, "j/k /", "h/l/r/s/p/x/u/U/f/?"],
				{
					vimModeEnabled: true,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU · ⌥1-6/C/D/G Fast · ⌥V Vim",
			"Esc Sidebar",
			"j/k Move, / Search",
			"h/l Tabs, r Reload, s Split, p/x Tab, u/U Unread, f Map",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				["Esc", GLOBAL_NAV_HINT, "⌥./P/A/M/E"],
				{
					vimModeEnabled: false,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU · ⌥1-6/C/D/G Fast · ⌥V Vim",
			"Esc Sidebar",
			"⌥. Actions · ⌥P/A/M/E",
			"⌥/ Shortcuts",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				[GLOBAL_NAV_HINT, "↑↓ /", "↵/Space/h/l", "n/N/p/m/F/e/U/a/x/X/c/d/?"],
				{
					vimModeEnabled: false,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU · ⌥1-6/C/D/G Fast · ⌥V Vim",
			"↑↓ Move · / Search",
			"↵ Open · Space Toggle · h/l Expand",
			"n New, N Folder, p Pin, m/F Folder, e Rename, U Read, a Away, x/X Archive, c/d Folder, ? Map",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				["Esc", GLOBAL_NAV_HINT, "⌥N/⌥⇧N", "j/k/gg/G/actions/?"],
				{
					vimModeEnabled: true,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU · ⌥1-6/C/D/G Fast · ⌥V Vim",
			"Esc Sidebar",
			"⌥N Unread, ⌥⇧N Read",
			"j/k Move · gg/G Jump · f Map",
		]);
		expect(
			dashboardFocusIndicatorVisibleHintLabels(
				["Esc", GLOBAL_NAV_HINT, "⌥N/⌥⇧N", "⌥./P/A/M/E"],
				{
					vimModeEnabled: false,
				},
			),
		).toEqual([
			"⌥K Commands · ⌥Tab MRU · ⌥1-6/C/D/G Fast · ⌥V Vim",
			"Esc Sidebar",
			"⌥N Unread, ⌥⇧N Read",
			"⌥. Actions · ⌥P/A/M/E",
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
