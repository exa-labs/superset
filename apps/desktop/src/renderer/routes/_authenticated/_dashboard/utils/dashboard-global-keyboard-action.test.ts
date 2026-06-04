import { describe, expect, it } from "bun:test";
import {
	type DashboardGlobalKeyboardAction,
	handleDashboardGlobalKeyboardAction,
	shouldFocusDashboardShellFromEscapeKey,
} from "./dashboard-global-keyboard-action";

function handlers(
	overrides: {
		focusNavigationShell?: () => boolean;
		markLatestNativeReplyRead?: () => boolean;
		openActionHints?: () => boolean;
		openKeyboardHelp?: () => boolean;
		openUnreadNativeReply?: () => boolean;
		onDefer?: (callback: () => void) => void;
		onAnnounceVimModeChange?: (enabled: boolean) => void;
		onOpenNavigationShell?: () => void;
		onSwitchMruView?: (direction: "next" | "previous") => boolean;
		onToggleVimMode?: () => boolean;
	} = {},
) {
	return {
		announceVimModeChange:
			overrides.onAnnounceVimModeChange ?? (() => undefined),
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

function keyEvent(
	overrides: Partial<KeyboardEvent> & { target?: EventTarget | null } = {},
): KeyboardEvent {
	return {
		altKey: false,
		ctrlKey: false,
		defaultPrevented: false,
		isComposing: false,
		key: "Escape",
		metaKey: false,
		target: null,
		...overrides,
	} as KeyboardEvent;
}

describe("handleDashboardGlobalKeyboardAction", () => {
	it("toggles and announces Vim mode from the global main-process action", () => {
		let toggled = false;
		const announcements: boolean[] = [];

		expect(
			handleDashboardGlobalKeyboardAction(
				"TOGGLE_VIM_MODE",
				handlers({
					onAnnounceVimModeChange: (enabled) => {
						announcements.push(enabled);
					},
					onToggleVimMode: () => {
						toggled = true;
						return true;
					},
				}),
			),
		).toBe(true);
		expect(toggled).toBe(true);
		expect(announcements).toEqual([true]);
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

describe("shouldFocusDashboardShellFromEscapeKey", () => {
	it("allows plain Escape from dashboard navigation-recovery scopes", () => {
		if (typeof document === "undefined") return;

		const appButton = document.createElement("button");
		const sidebarButton = document.createElement("button");
		const sidebar = document.createElement("div");
		sidebar.dataset.dashboardSidebarRoot = "true";
		sidebar.append(sidebarButton);
		const browser = document.createElement("button");
		browser.dataset.dashboardBrowserView = "true";
		const nativeAgent = document.createElement("button");
		nativeAgent.dataset.nativeAgentViewRoot = "true";
		const terminal = document.createElement("button");
		terminal.dataset.terminalRoot = "true";
		const editor = document.createElement("button");
		editor.dataset.monacoEditor = "true";

		for (const target of [
			appButton,
			sidebarButton,
			browser,
			nativeAgent,
			terminal,
			editor,
		]) {
			expect(shouldFocusDashboardShellFromEscapeKey(keyEvent({ target }))).toBe(
				true,
			);
		}
	});

	it("does not steal Escape from editable and overlay dashboard surfaces", () => {
		if (typeof document === "undefined") return;

		const input = document.createElement("input");
		const textbox = document.createElement("button");
		textbox.setAttribute("role", "textbox");
		const editable = document.createElement("div");
		editable.contentEditable = "true";
		const command = document.createElement("button");
		command.dataset.commandPaletteCommandId = "open";
		const keyboardHelp = document.createElement("button");
		keyboardHelp.dataset.dashboardKeyboardHelp = "true";

		for (const target of [input, textbox, editable, command, keyboardHelp]) {
			expect(shouldFocusDashboardShellFromEscapeKey(keyEvent({ target }))).toBe(
				false,
			);
		}
	});

	it("ignores modified, prevented, composing, and non-Escape keys", () => {
		expect(
			shouldFocusDashboardShellFromEscapeKey(keyEvent({ key: "Enter" })),
		).toBe(false);
		expect(
			shouldFocusDashboardShellFromEscapeKey(
				keyEvent({ defaultPrevented: true }),
			),
		).toBe(false);
		expect(
			shouldFocusDashboardShellFromEscapeKey(keyEvent({ isComposing: true })),
		).toBe(false);
		expect(
			shouldFocusDashboardShellFromEscapeKey(keyEvent({ altKey: true })),
		).toBe(false);
		expect(
			shouldFocusDashboardShellFromEscapeKey(keyEvent({ ctrlKey: true })),
		).toBe(false);
		expect(
			shouldFocusDashboardShellFromEscapeKey(keyEvent({ metaKey: true })),
		).toBe(false);
	});
});
