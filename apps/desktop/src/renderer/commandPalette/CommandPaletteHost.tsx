import { type ReactNode, useEffect } from "react";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import {
	type DashboardGlobalKeyboardAction,
	handleDashboardGlobalKeyboardAction,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-global-keyboard-action";
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
	const openRoot = useFrameStackStore((s) => s.openRoot);
	useHotkey("OPEN_COMMAND_PALETTE", () => openRoot());
	useHotkey("OPEN_CONTROL_PLANE", () => openRoot());
	electronTrpc.browser.onOpenControlPlane.useSubscription(undefined, {
		onData: () => openRoot(),
	});
	return null;
}

function GlobalKeyboardActionTrigger() {
	electronTrpc.browser.onGlobalKeyboardAction.useSubscription(undefined, {
		onData: ({ action }) => {
			handleDashboardGlobalKeyboardAction(
				action as DashboardGlobalKeyboardAction,
			);
		},
	});
	return null;
}
