import { describe, expect, it } from "bun:test";
import { HOTKEYS_REGISTRY } from "renderer/hotkeys/registry";
import {
	DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS,
	DASHBOARD_RENDERER_WEB_SHORTCUT_HOTKEYS,
	dashboardNativeSplitActionFromShortcut,
	dashboardRootTerminalTargetFromShortcut,
	dashboardSidebarKeyboardCommandFromShortcut,
	dashboardSidebarKeyboardCommandFromVimKey,
	dashboardWebShortcutKeepsNativeProviderPrefix,
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
			"OPEN_ROOT_TERMINAL_STAG",
			"OPEN_ROOT_TERMINAL_PROD",
			"OPEN_ROOT_TERMINAL_HEPH",
			"TOGGLE_NATIVE_BROWSER_VIEW",
			"TOGGLE_NATIVE_SPLIT_VIEW",
			"SIDEBAR_ACTION_CREATE",
			"SIDEBAR_ACTION_CREATE_FOLDER",
			"SIDEBAR_ACTION_MENU",
			"SIDEBAR_ACTION_PIN",
			"SIDEBAR_ACTION_ARCHIVE",
			"SIDEBAR_ACTION_HARD_ARCHIVE",
			"SIDEBAR_ACTION_MOVE",
			"SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
			"SIDEBAR_ACTION_COLOR",
			"SIDEBAR_ACTION_RENAME",
			"SIDEBAR_ACTION_REPLY",
			"SIDEBAR_ACTION_OPEN_BROWSER",
			"SIDEBAR_ACTION_TOGGLE_BROWSER",
			"SIDEBAR_ACTION_MARK_READ",
			"SIDEBAR_ACTION_DELETE",
			"BROWSER_NEW_TAB",
			"BROWSER_RELOAD",
			"BROWSER_GO_BACK",
			"BROWSER_GO_FORWARD",
			"BROWSER_PREVIOUS_TAB",
			"BROWSER_NEXT_TAB",
			"BROWSER_CLOSE_TAB",
			"BROWSER_TOGGLE_PIN",
			"BROWSER_OPEN_EXTERNAL",
			"BROWSER_TOGGLE_SPLIT",
			"BROWSER_CLOSE_SPLIT",
			"BROWSER_SWAP_SPLIT",
			"BROWSER_NARROW_SPLIT",
			"BROWSER_WIDEN_SPLIT",
			"BROWSER_EQUALIZE_SPLIT",
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

	it("maps root terminal shortcuts to their sidebar targets", () => {
		expect(
			dashboardRootTerminalTargetFromShortcut("OPEN_ROOT_TERMINAL_STAG"),
		).toBe("stag");
		expect(
			dashboardRootTerminalTargetFromShortcut("OPEN_ROOT_TERMINAL_PROD"),
		).toBe("prod");
		expect(
			dashboardRootTerminalTargetFromShortcut("OPEN_ROOT_TERMINAL_HEPH"),
		).toBe("heph");
		expect(dashboardRootTerminalTargetFromShortcut("OPEN_CHROME")).toBeNull();
	});

	it("routes split-pane shortcuts to native sessions only on native routes", () => {
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/native/devin/session-1",
				shortcut: "BROWSER_TOGGLE_SPLIT",
			}),
		).toBe("toggle-split");
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/native/capy/thread-1",
				shortcut: "BROWSER_CLOSE_SPLIT",
			}),
		).toBe("close-split");
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/native/devin/session-1",
				shortcut: "BROWSER_SWAP_SPLIT",
			}),
		).toBe("swap-split");
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/native/devin/session-1",
				shortcut: "BROWSER_NARROW_SPLIT",
			}),
		).toBe("narrow-native-split");
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/native/devin/session-1",
				shortcut: "BROWSER_WIDEN_SPLIT",
			}),
		).toBe("widen-native-split");
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/native/devin/session-1",
				shortcut: "BROWSER_EQUALIZE_SPLIT",
			}),
		).toBe("equalize-split");
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/web-tabs/chrome-default",
				shortcut: "BROWSER_CLOSE_SPLIT",
			}),
		).toBeNull();
		expect(
			dashboardNativeSplitActionFromShortcut({
				pathname: "/native/devin/session-1",
				shortcut: "BROWSER_RELOAD",
			}),
		).toBeNull();
	});

	it("maps global Vim keys to sidebar commands outside local sidebar focus", () => {
		expect(dashboardSidebarKeyboardCommandFromVimKey("j")).toBe("focus-next");
		expect(dashboardSidebarKeyboardCommandFromVimKey("k")).toBe(
			"focus-previous",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("h")).toBe("collapse");
		expect(dashboardSidebarKeyboardCommandFromVimKey("l")).toBe("expand");
		expect(dashboardSidebarKeyboardCommandFromVimKey("G")).toBe("focus-last");
		expect(dashboardSidebarKeyboardCommandFromVimKey("enter")).toBe("activate");
		expect(dashboardSidebarKeyboardCommandFromVimKey("space")).toBe(
			"toggle-expansion",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey(".")).toBe("action-menu");
		expect(dashboardSidebarKeyboardCommandFromVimKey("n")).toBe(
			"action-create",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("N")).toBe(
			"action-create-folder",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("p")).toBe("action-pin");
		expect(dashboardSidebarKeyboardCommandFromVimKey("r")).toBe("action-reply");
		expect(dashboardSidebarKeyboardCommandFromVimKey("o")).toBe(
			"action-open-browser",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("b")).toBe(
			"action-toggle-browser",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("m")).toBe("action-move");
		expect(dashboardSidebarKeyboardCommandFromVimKey("F")).toBe(
			"action-remove-from-folder",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("U")).toBe(
			"action-mark-read",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("x")).toBe(
			"action-hard-archive",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("X")).toBe(
			"action-hard-archive",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("a")).toBe(
			"action-archive",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("e")).toBe(
			"action-rename",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("c")).toBe("action-color");
		expect(dashboardSidebarKeyboardCommandFromVimKey("d")).toBe(
			"action-delete",
		);
		expect(dashboardSidebarKeyboardCommandFromVimKey("z")).toBeNull();
	});

	it("maps embedded-browser sidebar action shortcuts to shared sidebar commands", () => {
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_ACTION_CREATE"),
		).toBe("action-create");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut(
				"SIDEBAR_ACTION_CREATE_FOLDER",
			),
		).toBe("action-create-folder");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_ACTION_COLOR"),
		).toBe("action-color");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_ACTION_DELETE"),
		).toBe("action-delete");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_COLLAPSE"),
		).toBe("collapse");
		expect(dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_EXPAND")).toBe(
			"expand",
		);
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_ACTION_MARK_READ"),
		).toBe("action-mark-read");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_ACTION_PIN"),
		).toBe("action-pin");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_ACTION_MOVE"),
		).toBe("action-move");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("SIDEBAR_ACTION_REPLY"),
		).toBe("action-reply");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut(
				"SIDEBAR_ACTION_TOGGLE_BROWSER",
			),
		).toBe("action-toggle-browser");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut(
				"SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
			),
		).toBe("action-remove-from-folder");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut(
				"SIDEBAR_ACTION_HARD_ARCHIVE",
			),
		).toBe("action-hard-archive");
		expect(
			dashboardSidebarKeyboardCommandFromShortcut("BROWSER_GO_BACK"),
		).toBeNull();
	});

	it("preserves Capy/Devin prefixes for indexed follow-up shortcuts", () => {
		expect(dashboardWebShortcutKeepsNativeProviderPrefix("OPEN_CAPY")).toBe(
			true,
		);
		expect(dashboardWebShortcutKeepsNativeProviderPrefix("OPEN_DEVIN")).toBe(
			true,
		);
		for (const shortcut of [
			"OPEN_WEB_PAGE_1",
			"OPEN_WEB_PAGE_2",
			"OPEN_WEB_PAGE_3",
			"OPEN_WEB_PAGE_4",
			"OPEN_WEB_PAGE_5",
			"OPEN_WEB_PAGE_6",
		] as const) {
			expect(
				dashboardWebShortcutKeepsNativeProviderPrefix(shortcut),
				`${shortcut} must let Option+C/D numeric chains resolve before falling back to top links`,
			).toBe(true);
		}
		expect(dashboardWebShortcutKeepsNativeProviderPrefix("OPEN_CAPY_1")).toBe(
			false,
		);
		expect(dashboardWebShortcutKeepsNativeProviderPrefix("OPEN_DEVIN_1")).toBe(
			false,
		);
		for (const shortcut of DASHBOARD_RENDERER_WEB_SHORTCUT_HOTKEYS) {
			if (
				shortcut === "OPEN_CAPY" ||
				shortcut === "OPEN_DEVIN" ||
				shortcut.startsWith("OPEN_WEB_PAGE_")
			) {
				continue;
			}
			expect(
				dashboardWebShortcutKeepsNativeProviderPrefix(shortcut),
				`${shortcut} should clear a pending Capy/Devin prefix before it runs`,
			).toBe(false);
		}
	});
});

describe("DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS", () => {
	it("keeps normal renderer views wired to the same global dashboard actions as webviews", () => {
		expect(DASHBOARD_RENDERER_GLOBAL_SHORTCUT_ACTIONS).toEqual({
			FOCUS_DASHBOARD_SHELL: "FOCUS_DASHBOARD_SHELL",
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
			if (hotkeyId === "FOCUS_DASHBOARD_SHELL") continue;
			expect(
				HOTKEYS_REGISTRY[hotkeyId],
				`${hotkeyId} should remain a visible, customizable hotkey`,
			).toBeDefined();
		}
	});
});
