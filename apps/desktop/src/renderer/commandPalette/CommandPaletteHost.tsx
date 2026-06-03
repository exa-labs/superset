import { type ReactNode, useEffect } from "react";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { focusDashboardNavigationShell } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-shell-focus";
import {
	isDashboardVimModeEnabled,
	toggleDashboardVimMode,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { CommandContextProvider } from "./core/ContextProvider";
import { useFrameStackStore } from "./core/frames";
import { registerAllModules } from "./modules";
import { CommandPalette } from "./ui/CommandPalette/CommandPalette";
import { DeleteWorkspaceMount } from "./ui/DeleteWorkspaceMount/DeleteWorkspaceMount";
import { RemoveFromSidebarMount } from "./ui/RemoveFromSidebarMount/RemoveFromSidebarMount";
import { SetPreferredOpenInAppMount } from "./ui/SetPreferredOpenInAppMount/SetPreferredOpenInAppMount";

export function CommandPaletteHost({ children }: { children?: ReactNode }) {
	useEffect(() => {
		const unregister = registerAllModules();
		return unregister;
	}, []);

	return (
		<CommandContextProvider>
			<CommandPaletteTrigger />
			<GlobalKeyboardActionTrigger />
			<CommandPalette />
			<DeleteWorkspaceMount />
			<RemoveFromSidebarMount />
			<SetPreferredOpenInAppMount />
			{children}
		</CommandContextProvider>
	);
}

function CommandPaletteTrigger() {
	const setOpen = useFrameStackStore((s) => s.setOpen);
	useHotkey("OPEN_COMMAND_PALETTE", () => setOpen(true));
	useHotkey("OPEN_CONTROL_PLANE", () => setOpen(true));
	electronTrpc.browser.onOpenControlPlane.useSubscription(undefined, {
		onData: () => setOpen(true),
	});
	return null;
}

function GlobalKeyboardActionTrigger() {
	electronTrpc.browser.onGlobalKeyboardAction.useSubscription(undefined, {
		onData: ({ action }) => {
			if (action === "TOGGLE_VIM_MODE") {
				toggleDashboardVimMode();
			}
			if (action === "FOCUS_DASHBOARD_SHELL" && isDashboardVimModeEnabled()) {
				focusDashboardNavigationShell();
			}
		},
	});
	return null;
}
