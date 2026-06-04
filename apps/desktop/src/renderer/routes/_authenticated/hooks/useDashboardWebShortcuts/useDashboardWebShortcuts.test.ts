import { describe, expect, it } from "bun:test";
import { HOTKEYS_REGISTRY } from "renderer/hotkeys/registry";
import { DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS } from "./useDashboardWebShortcuts";

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
