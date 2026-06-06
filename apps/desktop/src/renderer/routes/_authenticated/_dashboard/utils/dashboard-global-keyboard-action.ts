import { toast } from "@superset/ui/sonner";
import { openDashboardActionHints } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-action-hints";
import { dashboardFocusScopeForElement } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-focus-scope";
import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import { focusDashboardNavigationShell } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-shell-focus";
import { toggleDashboardVimMode } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { useWorkspaceSidebarStore } from "renderer/stores/workspace-sidebar-state";

export type DashboardGlobalKeyboardAction =
	| "FOCUS_DASHBOARD_SHELL"
	| "MARK_LATEST_NATIVE_REPLY_READ"
	| "OPEN_UNREAD_NATIVE_REPLY"
	| "SHOW_DASHBOARD_ACTION_HINTS"
	| "SHOW_DASHBOARD_KEYBOARD_HELP"
	| "SWITCH_DASHBOARD_VIEW_NEXT"
	| "SWITCH_DASHBOARD_VIEW_PREVIOUS"
	| "TOGGLE_VIM_MODE";
type DashboardMruSwitchDirection = "next" | "previous";

export const DASHBOARD_OPEN_UNREAD_NATIVE_REPLY_EVENT =
	"dashboard-native-agent-open-unread-reply";
export const DASHBOARD_MARK_LATEST_NATIVE_REPLY_READ_EVENT =
	"dashboard-native-agent-mark-latest-reply-read";

interface DashboardGlobalKeyboardActionHandlers {
	defer: (callback: () => void) => void;
	focusNavigationShell: () => boolean;
	markLatestNativeReplyRead: () => boolean;
	openActionHints: () => boolean;
	openKeyboardHelp: () => boolean;
	openNavigationShell: () => void;
	openUnreadNativeReply: () => boolean;
	switchMruView: (direction: DashboardMruSwitchDirection) => boolean;
	toggleVimMode: () => boolean;
	announceVimModeChange: (enabled: boolean) => void;
}

function defer(callback: () => void): void {
	if (typeof window !== "undefined") {
		window.setTimeout(callback, 0);
		return;
	}
	setTimeout(callback, 0);
}

export function dispatchDashboardViewMruSwitch(
	direction: DashboardMruSwitchDirection,
): boolean {
	if (typeof window === "undefined") return false;
	const event = new CustomEvent("dashboard-view-mru-switch", {
		cancelable: true,
		detail: { direction },
	});
	window.dispatchEvent(event);
	return event.defaultPrevented;
}

export function dispatchDashboardOpenUnreadNativeReply(): boolean {
	if (typeof window === "undefined") return false;
	window.dispatchEvent(
		new CustomEvent(DASHBOARD_OPEN_UNREAD_NATIVE_REPLY_EVENT, {
			cancelable: true,
		}),
	);
	return true;
}

export function dispatchDashboardMarkLatestNativeReplyRead(): boolean {
	if (typeof window === "undefined") return false;
	window.dispatchEvent(
		new CustomEvent(DASHBOARD_MARK_LATEST_NATIVE_REPLY_READ_EVENT, {
			cancelable: true,
		}),
	);
	return true;
}

const defaultHandlers: DashboardGlobalKeyboardActionHandlers = {
	defer,
	focusNavigationShell: focusDashboardNavigationShell,
	markLatestNativeReplyRead: dispatchDashboardMarkLatestNativeReplyRead,
	openActionHints: openDashboardActionHints,
	openKeyboardHelp: openDashboardKeyboardHelp,
	openNavigationShell: () => useWorkspaceSidebarStore.getState().setOpen(true),
	openUnreadNativeReply: dispatchDashboardOpenUnreadNativeReply,
	switchMruView: dispatchDashboardViewMruSwitch,
	toggleVimMode: toggleDashboardVimMode,
	announceVimModeChange: (enabled) => {
		toast.success(enabled ? "Vim mode enabled" : "Vim mode disabled");
	},
};

const ESCAPE_RECOVERY_BLOCKED_TARGET_SELECTOR = [
	"input",
	"textarea",
	"select",
	"[contenteditable='true']",
	"[contenteditable='']",
	"[role='textbox']",
	"[data-command-palette-input]",
	"[data-command-palette-command-id]",
	"[data-dashboard-keyboard-help]",
].join(",");

function isEscapeRecoveryBlockedTarget(target: EventTarget | null): boolean {
	if (typeof HTMLElement === "undefined") return false;
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	return target.closest(ESCAPE_RECOVERY_BLOCKED_TARGET_SELECTOR) != null;
}

export function shouldFocusDashboardShellFromEscapeKey(
	event: KeyboardEvent,
): boolean {
	if (event.defaultPrevented) return false;
	if (event.isComposing) return false;
	if (event.altKey || event.ctrlKey || event.metaKey) return false;
	if (event.key !== "Escape") return false;
	if (isEscapeRecoveryBlockedTarget(event.target)) return false;

	const eventTarget =
		typeof Element !== "undefined" && event.target instanceof Element
			? event.target
			: null;
	const activeElement =
		typeof document !== "undefined" &&
		typeof Element !== "undefined" &&
		document.activeElement instanceof Element
			? document.activeElement
			: null;
	const scope = dashboardFocusScopeForElement(eventTarget ?? activeElement);
	return (
		scope.id === "app" ||
		scope.id === "browser" ||
		scope.id === "editor" ||
		scope.id === "native-agent" ||
		scope.id === "sidebar" ||
		scope.id === "terminal"
	);
}

export function handleDashboardGlobalKeyboardAction(
	action: DashboardGlobalKeyboardAction,
	handlers: Partial<DashboardGlobalKeyboardActionHandlers> = {},
): boolean {
	const resolved = { ...defaultHandlers, ...handlers };

	if (action === "TOGGLE_VIM_MODE") {
		const enabled = resolved.toggleVimMode();
		resolved.announceVimModeChange(enabled);
		return true;
	}

	if (action === "SHOW_DASHBOARD_KEYBOARD_HELP") {
		return resolved.openKeyboardHelp();
	}

	if (action === "SHOW_DASHBOARD_ACTION_HINTS") {
		return resolved.openActionHints();
	}

	if (action === "OPEN_UNREAD_NATIVE_REPLY") {
		return resolved.openUnreadNativeReply();
	}

	if (action === "MARK_LATEST_NATIVE_REPLY_READ") {
		return resolved.markLatestNativeReplyRead();
	}

	if (action === "SWITCH_DASHBOARD_VIEW_NEXT") {
		return resolved.switchMruView("next");
	}

	if (action === "SWITCH_DASHBOARD_VIEW_PREVIOUS") {
		return resolved.switchMruView("previous");
	}

	if (action !== "FOCUS_DASHBOARD_SHELL") return false;
	if (resolved.focusNavigationShell()) return true;

	resolved.openNavigationShell();
	resolved.defer(() => {
		resolved.focusNavigationShell();
	});
	return true;
}
