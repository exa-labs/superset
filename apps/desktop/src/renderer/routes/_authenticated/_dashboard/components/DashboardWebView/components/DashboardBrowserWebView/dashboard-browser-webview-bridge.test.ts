import { describe, expect, it } from "bun:test";
import { DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT } from "./DashboardBrowserWebView";

describe("dashboard browser webview bridge", () => {
	it("includes in-page vim action hints behind a renderer-controlled flag", () => {
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"__clankeeSetDashboardVimModeEnabled",
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"__clankeeOpenDashboardActionHints",
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"__clankeeDashboardVimModeEnabled",
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"data-clankee-page-action-hints-overlay",
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'String(event.key || "").toLowerCase() === "f"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'String(event.key || "") === "?"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"SHOW_DASHBOARD_KEYBOARD_HELP",
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "Escape")',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "FOCUS_DASHBOARD_SHELL"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (code === "keyk") return "OPEN_CONTROL_PLANE"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (code === "keyw") return "OPEN_WORKSPACES"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'"SWITCH_DASHBOARD_VIEW_NEXT"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'"SWITCH_DASHBOARD_VIEW_PREVIOUS"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "TOGGLE_VIM_MODE"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "OPEN_UNREAD_NATIVE_REPLY"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "MARK_LATEST_NATIVE_REPLY_READ"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_FOCUS_NEXT"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_FOCUS_PREVIOUS"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_FOCUS_FIRST"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_FOCUS_LAST"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTIVATE"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_TOGGLE_EXPANSION"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_FOCUS_SEARCH"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_MENU"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_CREATE_FOLDER"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_CREATE"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_PIN"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_REPLY"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_OPEN_BROWSER"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_TOGGLE_BROWSER"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_MOVE"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_REMOVE_FROM_FOLDER"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_HARD_ARCHIVE"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_ARCHIVE"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain('if (key === "X")');
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "a" || key === "x")',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_RENAME"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_COLOR"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "SIDEBAR_ACTION_DELETE"',
		);
		expect(
			DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT.indexOf(
				'if (pendingDashboardVimPrefix === "g")',
			),
		).toBeLessThan(
			DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT.indexOf(
				'return "SIDEBAR_ACTION_COLOR"',
			),
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (shiftedCode === "keyc") return "CREATE_CAPY"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (shiftedCode === "keyd") return "CREATE_DEVIN"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"browserVimShortcutFromEvent",
		);
		expect(
			DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT.indexOf(
				"const browserVimShortcut = browserVimShortcutFromEvent(event)",
			),
		).toBeLessThan(
			DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT.indexOf(
				"const dashboardVimShortcut = dashboardVimShortcutFromEvent(event)",
			),
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "p") return "BROWSER_TOGGLE_PIN"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "H") return "BROWSER_GO_BACK"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "L") return "BROWSER_GO_FORWARD"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "O") return "BROWSER_OPEN_EXTERNAL"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "h") return "BROWSER_PREVIOUS_TAB"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "l") return "BROWSER_NEXT_TAB"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"pendingDashboardVimPrefix",
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "b") return "OPEN_CHROME"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "c") return "OPEN_CAPY"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "d") return "OPEN_DEVIN"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "w") return "OPEN_WORKSPACES"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'return "TOGGLE_DASHBOARD_SIDEBAR"',
		);
	});
});
