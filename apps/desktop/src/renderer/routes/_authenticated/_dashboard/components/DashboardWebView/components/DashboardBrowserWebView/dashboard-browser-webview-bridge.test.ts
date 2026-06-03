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
			'if (code === "keyw") return "OPEN_WORKSPACES"',
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			"browserVimShortcutFromEvent",
		);
		expect(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT).toContain(
			'if (key === "p") return "BROWSER_TOGGLE_PIN"',
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
