import { describe, expect, it } from "bun:test";
import {
	type DashboardGlobalKeyboardAction,
	handleDashboardGlobalKeyboardAction,
} from "./dashboard-global-keyboard-action";

function handlers(
	overrides: {
		focusNavigationShell?: () => boolean;
		markLatestNativeReplyRead?: () => boolean;
		openActionHints?: () => boolean;
		openKeyboardHelp?: () => boolean;
		openUnreadNativeReply?: () => boolean;
		onDefer?: (callback: () => void) => void;
		onOpenNavigationShell?: () => void;
		onSwitchMruView?: (direction: "next" | "previous") => boolean;
		onToggleVimMode?: () => boolean;
	} = {},
) {
	return {
		defer: overrides.onDefer ?? ((callback: () => void) => callback()),
		focusNavigationShell: overrides.focusNavigationShell ?? (() => true),
		markLatestNativeReplyRead:
			overrides.markLatestNativeReplyRead ?? (() => true),
		openActionHints: overrides.openActionHints ?? (() => true),
		openKeyboardHelp: overrides.openKeyboardHelp ?? (() => true),
		openNavigationShell: overrides.onOpenNavigationShell ?? (() => undefined),
		openUnreadNativeReply: overrides.openUnreadNativeReply ?? (() => true),
		switchMruView: overrides.onSwitchMruView ?? (() => true),
		toggleVimMode: overrides.onToggleVimMode ?? (() => true),
	};
}

describe("handleDashboardGlobalKeyboardAction", () => {
	it("toggles Vim mode from the global main-process action", () => {
		let toggled = false;

		expect(
			handleDashboardGlobalKeyboardAction(
				"TOGGLE_VIM_MODE",
				handlers({
					onToggleVimMode: () => {
						toggled = true;
						return true;
					},
				}),
			),
		).toBe(true);
		expect(toggled).toBe(true);
	});

	it("opens keyboard help from the global main-process action", () => {
		let opened = false;

		expect(
			handleDashboardGlobalKeyboardAction(
				"SHOW_DASHBOARD_KEYBOARD_HELP",
				handlers({
					openKeyboardHelp: () => {
						opened = true;
						return true;
					},
				}),
			),
		).toBe(true);
		expect(opened).toBe(true);
	});

	it("opens action hints from the global main-process action", () => {
		let opened = false;

		expect(
			handleDashboardGlobalKeyboardAction(
				"SHOW_DASHBOARD_ACTION_HINTS",
				handlers({
					openActionHints: () => {
						opened = true;
						return true;
					},
				}),
			),
		).toBe(true);
		expect(opened).toBe(true);
	});

	it("opens the newest unread native reply from the global main-process action", () => {
		let opened = false;

		expect(
			handleDashboardGlobalKeyboardAction(
				"OPEN_UNREAD_NATIVE_REPLY",
				handlers({
					openUnreadNativeReply: () => {
						opened = true;
						return true;
					},
				}),
			),
		).toBe(true);
		expect(opened).toBe(true);
	});

	it("marks the latest native reply read from the global main-process action", () => {
		let markedRead = false;

		expect(
			handleDashboardGlobalKeyboardAction(
				"MARK_LATEST_NATIVE_REPLY_READ",
				handlers({
					markLatestNativeReplyRead: () => {
						markedRead = true;
						return true;
					},
				}),
			),
		).toBe(true);
		expect(markedRead).toBe(true);
	});

	it("focuses the navigation shell on Escape even when Vim mode is disabled", () => {
		let focusCount = 0;

		expect(
			handleDashboardGlobalKeyboardAction(
				"FOCUS_DASHBOARD_SHELL",
				handlers({
					focusNavigationShell: () => {
						focusCount += 1;
						return true;
					},
				}),
			),
		).toBe(true);
		expect(focusCount).toBe(1);
	});

	it("opens the navigation shell and retries focus when Escape cannot focus immediately", () => {
		let openedShell = false;
		const deferredCallbacks: Array<() => void> = [];
		let focusCount = 0;

		expect(
			handleDashboardGlobalKeyboardAction(
				"FOCUS_DASHBOARD_SHELL",
				handlers({
					focusNavigationShell: () => {
						focusCount += 1;
						return focusCount > 1;
					},
					onDefer: (callback) => {
						deferredCallbacks.push(callback);
					},
					onOpenNavigationShell: () => {
						openedShell = true;
					},
				}),
			),
		).toBe(true);

		expect(openedShell).toBe(true);
		expect(focusCount).toBe(1);
		expect(deferredCallbacks).toHaveLength(1);
		deferredCallbacks[0]?.();
		expect(focusCount).toBe(2);
	});

	it("dispatches MRU switch actions through the shared global handler", () => {
		const directions: Array<"next" | "previous"> = [];

		expect(
			handleDashboardGlobalKeyboardAction(
				"SWITCH_DASHBOARD_VIEW_NEXT" satisfies DashboardGlobalKeyboardAction,
				handlers({
					onSwitchMruView: (direction) => {
						directions.push(direction);
						return true;
					},
				}),
			),
		).toBe(true);
		expect(
			handleDashboardGlobalKeyboardAction(
				"SWITCH_DASHBOARD_VIEW_PREVIOUS" satisfies DashboardGlobalKeyboardAction,
				handlers({
					onSwitchMruView: (direction) => {
						directions.push(direction);
						return true;
					},
				}),
			),
		).toBe(true);
		expect(directions).toEqual(["next", "previous"]);
	});
});
