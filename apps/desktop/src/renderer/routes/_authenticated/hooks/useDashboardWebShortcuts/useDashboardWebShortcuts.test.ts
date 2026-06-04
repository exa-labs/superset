import { describe, expect, it } from "bun:test";
import { HOTKEYS_REGISTRY } from "renderer/hotkeys/registry";
import {
	DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS,
	DASHBOARD_RENDERER_WEB_SHORTCUT_HOTKEYS,
} from "./useDashboardWebShortcuts";

describe("DASHBOARD_RENDERER_WEB_SHORTCUT_HOTKEYS", () => {
	it("keeps normal renderer views subscribed to visible dashboard web shortcuts", () => {
		expect(DASHBOARD_RENDERER_WEB_SHORTCUT_HOTKEYS).toEqual([
			"OPEN_WEB_PAGE_1",
			"OPEN_WEB_PAGE_2",
			"OPEN_WEB_PAGE_3",
			"OPEN_WEB_PAGE_4",
			"OPEN_WEB_PAGE_5",
			"OPEN_WEB_PAGE_6",
			"OPEN_CAPY",
			"CREATE_CAPY",
			"OPEN_DEVIN",
			"CREATE_DEVIN",
			"OPEN_CHROME",
			"OPEN_WORKSPACES",
			"TOGGLE_NATIVE_BROWSER_VIEW",
			"TOGGLE_NATIVE_SPLIT_VIEW",
		]);
	});

	it("uses visible registry hotkeys for renderer-level dashboard web shortcuts", () => {
		for (const hotkeyId of DASHBOARD_RENDERER_WEB_SHORTCUT_HOTKEYS) {
			expect(
				HOTKEYS_REGISTRY[hotkeyId],
				`${hotkeyId} should remain a visible, customizable hotkey`,
			).toBeDefined();
		}
	});
});

describe("DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS", () => {
	it("keeps normal renderer views wired to the same global dashboard actions as webviews", () => {
		expect(DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS).toEqual({
			MARK_LATEST_NATIVE_REPLY_READ: "MARK_LATEST_NATIVE_REPLY_READ",
			OPEN_UNREAD_NATIVE_REPLY: "OPEN_UNREAD_NATIVE_REPLY",
			SHOW_DASHBOARD_ACTION_HINTS: "SHOW_DASHBOARD_ACTION_HINTS",
			SHOW_DASHBOARD_KEYBOARD_HELP: "SHOW_DASHBOARD_KEYBOARD_HELP",
			SWITCH_DASHBOARD_VIEW_NEXT: "SWITCH_DASHBOARD_VIEW_NEXT",
			SWITCH_DASHBOARD_VIEW_PREVIOUS: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
			TOGGLE_VIM_MODE: "TOGGLE_VIM_MODE",
		});
	});

	it("uses visible registry hotkeys for every renderer-level global action", () => {
		for (const hotkeyId of Object.keys(
			DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS,
		) as Array<keyof typeof DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS>) {
			expect(
				HOTKEYS_REGISTRY[hotkeyId],
				`${hotkeyId} should remain a visible, customizable hotkey`,
			).toBeDefined();
		}
	});
});
