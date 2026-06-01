import { toast } from "@superset/ui/sonner";
import {
	BellIcon,
	BellOffIcon,
	KeyboardIcon,
	PaletteIcon,
	PanelLeftIcon,
	PanelRightIcon,
	PlusIcon,
	RefreshCwIcon,
	SettingsIcon,
} from "lucide-react";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { electronQueryClient } from "renderer/providers/ElectronTRPCProvider";
import { toggleDashboardVimMode } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { useNewWorkspaceModalStore } from "renderer/stores/new-workspace-modal";
import { useRightSidebarToggleIntent } from "renderer/stores/right-sidebar-toggle-intent";
import { SYSTEM_THEME_ID, useThemeStore } from "renderer/stores/theme/store";
import { useWorkspaceSidebarStore } from "renderer/stores/workspace-sidebar-state";
import type { Command, CommandProvider } from "../../core/types";
import { ThemeFrame } from "../../ui/ThemeFrame/ThemeFrame";

function cycleTheme(): void {
	const current = useThemeStore.getState().activeThemeId;
	const next =
		current === "light"
			? "dark"
			: current === "dark"
				? SYSTEM_THEME_ID
				: "light";
	useThemeStore.getState().setTheme(next);
}

async function toggleNotificationSoundsMuted(
	currentlyMuted: boolean,
): Promise<void> {
	await electronTrpcClient.settings.setNotificationSoundsMuted.mutate({
		muted: !currentlyMuted,
	});
	await electronQueryClient.invalidateQueries({
		queryKey: [["settings", "getNotificationSoundsMuted"]],
	});
}

export const actionsProvider: CommandProvider = {
	id: "actions",
	provide: (context) => {
		const commands: Command[] = [
			{
				id: "actions.newWorkspace",
				title: "New workspace",
				section: "actions",
				icon: PlusIcon,
				hotkeyId: "NEW_WORKSPACE",
				keywords: ["local", "session", "workspace", "repo", "project"],
				run: () => useNewWorkspaceModalStore.getState().openModal(),
			},
			{
				id: "actions.toggleDashboardVimMode",
				title: "Toggle Vim mode",
				section: "actions",
				icon: KeyboardIcon,
				keywords: ["vim", "keyboard", "j", "k", "navigation", "dashboard"],
				run: () => {
					const enabled = toggleDashboardVimMode();
					toast.success(enabled ? "Vim mode enabled" : "Vim mode disabled");
				},
			},
			{
				id: "actions.openSettings",
				title: "Open settings",
				section: "actions",
				icon: SettingsIcon,
				hotkeyId: "OPEN_SETTINGS",
				keywords: [
					"settings",
					"preferences",
					"configuration",
					"keyboard",
					"integrations",
				],
				run: (ctx) => ctx.navigate("/settings/account"),
			},
			{
				id: "actions.toggleTheme",
				title: "Toggle theme",
				section: "actions",
				icon: PaletteIcon,
				keywords: ["dark", "light", "appearance", "color"],
				run: () => cycleTheme(),
				renderFrame: () => <ThemeFrame />,
			},
			{
				id: "actions.toggleLeftSidebar",
				title: "Toggle left sidebar",
				section: "actions",
				icon: PanelLeftIcon,
				hotkeyId: "TOGGLE_WORKSPACE_SIDEBAR",
				run: () => useWorkspaceSidebarStore.getState().toggleOpen(),
			},
		];

		if (context.workspace) {
			commands.push({
				id: "actions.toggleRightSidebar",
				title: "Toggle right sidebar",
				section: "actions",
				icon: PanelRightIcon,
				hotkeyId: "TOGGLE_SIDEBAR",
				run: () => useRightSidebarToggleIntent.getState().request(),
			});
		}

		commands.push(
			{
				id: "actions.toggleNotificationSounds",
				title: context.notificationSoundsMuted
					? "Unmute notifications"
					: "Mute notifications",
				section: "actions",
				icon: context.notificationSoundsMuted ? BellIcon : BellOffIcon,
				keywords: ["dnd", "silence", "notifications", "ringtone"],
				run: () =>
					toggleNotificationSoundsMuted(context.notificationSoundsMuted),
			},
			{
				id: "actions.showShortcuts",
				title: "Show keyboard shortcuts",
				section: "actions",
				icon: KeyboardIcon,
				hotkeyId: "SHOW_HOTKEYS",
				keywords: ["hotkeys"],
				run: (ctx) => ctx.navigate("/settings/keyboard"),
			},
			{
				id: "actions.checkUpdates",
				title: "Check for updates",
				section: "actions",
				icon: RefreshCwIcon,
				keywords: ["update", "upgrade"],
				run: async () => {
					try {
						await electronTrpcClient.autoUpdate.checkInteractive.mutate();
					} catch (error) {
						const message =
							error instanceof Error ? error.message : String(error);
						toast.error(`Failed to check for updates: ${message}`);
					}
				},
			},
		);

		return commands;
	},
};
