import { describe, expect, it } from "bun:test";
import {
	type DashboardGlobalKeyboardAction,
	handleDashboardGlobalKeyboardAction,
} from "./dashboard-global-keyboard-action";

function handlers(
	overrides: {
		focusNavigationShell?: () => boolean;
		isVimModeEnabled?: () => boolean;
		openKeyboardHelp?: () => boolean;
		onDefer?: (callback: () => void) => void;
		onOpenNavigationShell?: () => void;
		onToggleVimMode?: () => boolean;
	} = {},
) {
	return {
		defer: overrides.onDefer ?? ((callback: () => void) => callback()),
		focusNavigationShell: overrides.focusNavigationShell ?? (() => true),
		isVimModeEnabled: overrides.isVimModeEnabled ?? (() => true),
		openKeyboardHelp: overrides.openKeyboardHelp ?? (() => true),
		openNavigationShell: overrides.onOpenNavigationShell ?? (() => undefined),
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

	it("focuses the navigation shell on Escape only when Vim mode is enabled", () => {
		let focusCount = 0;

		expect(
			handleDashboardGlobalKeyboardAction(
				"FOCUS_DASHBOARD_SHELL",
				handlers({
					focusNavigationShell: () => {
						focusCount += 1;
						return true;
					},
					isVimModeEnabled: () => false,
				}),
			),
		).toBe(false);
		expect(focusCount).toBe(0);

		expect(
			handleDashboardGlobalKeyboardAction(
				"FOCUS_DASHBOARD_SHELL",
				handlers({
					focusNavigationShell: () => {
						focusCount += 1;
						return true;
					},
					isVimModeEnabled: () => true,
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

	it("ignores MRU switch actions because the authenticated layout handles them", () => {
		expect(
			handleDashboardGlobalKeyboardAction(
				"SWITCH_DASHBOARD_VIEW_NEXT" satisfies DashboardGlobalKeyboardAction,
				handlers(),
			),
		).toBe(false);
	});
});
