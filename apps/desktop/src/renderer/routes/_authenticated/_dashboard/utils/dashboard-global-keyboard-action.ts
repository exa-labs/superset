import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import { focusDashboardNavigationShell } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-shell-focus";
import { toggleDashboardVimMode } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { useWorkspaceSidebarStore } from "renderer/stores/workspace-sidebar-state";

export type DashboardGlobalKeyboardAction =
	| "FOCUS_DASHBOARD_SHELL"
	| "SHOW_DASHBOARD_KEYBOARD_HELP"
	| "SWITCH_DASHBOARD_VIEW_NEXT"
	| "SWITCH_DASHBOARD_VIEW_PREVIOUS"
	| "TOGGLE_VIM_MODE";

interface DashboardGlobalKeyboardActionHandlers {
	defer: (callback: () => void) => void;
	focusNavigationShell: () => boolean;
	openKeyboardHelp: () => boolean;
	openNavigationShell: () => void;
	toggleVimMode: () => boolean;
}

function defer(callback: () => void): void {
	if (typeof window !== "undefined") {
		window.setTimeout(callback, 0);
		return;
	}
	setTimeout(callback, 0);
}

const defaultHandlers: DashboardGlobalKeyboardActionHandlers = {
	defer,
	focusNavigationShell: focusDashboardNavigationShell,
	openKeyboardHelp: openDashboardKeyboardHelp,
	openNavigationShell: () => useWorkspaceSidebarStore.getState().setOpen(true),
	toggleVimMode: toggleDashboardVimMode,
};

export function handleDashboardGlobalKeyboardAction(
	action: DashboardGlobalKeyboardAction,
	handlers: Partial<DashboardGlobalKeyboardActionHandlers> = {},
): boolean {
	const resolved = { ...defaultHandlers, ...handlers };

	if (action === "TOGGLE_VIM_MODE") {
		resolved.toggleVimMode();
		return true;
	}

	if (action === "SHOW_DASHBOARD_KEYBOARD_HELP") {
		return resolved.openKeyboardHelp();
	}

	if (action !== "FOCUS_DASHBOARD_SHELL") return false;
	if (resolved.focusNavigationShell()) return true;

	resolved.openNavigationShell();
	resolved.defer(() => {
		resolved.focusNavigationShell();
	});
	return true;
}
