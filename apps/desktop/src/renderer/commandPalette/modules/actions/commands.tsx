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
	SearchIcon,
	SettingsIcon,
} from "lucide-react";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { electronQueryClient } from "renderer/providers/ElectronTRPCProvider";
import { handleDashboardGlobalKeyboardAction } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-global-keyboard-action";
import { toggleDashboardNavigationSidebar } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-navigation-sidebar-toggle";
import { focusDashboardSidebarSearch } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-search-focus";
import {
	isDashboardVimModeEnabled,
	toggleDashboardVimMode,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { useNewWorkspaceModalStore } from "renderer/stores/new-workspace-modal";
import { useRightSidebarToggleIntent } from "renderer/stores/right-sidebar-toggle-intent";
import { SYSTEM_THEME_ID, useThemeStore } from "renderer/stores/theme/store";
import { openCommandPaletteKeyboardHelp } from "../../core/keyboard-help";
import type { Command, CommandProvider } from "../../core/types";
import { ThemeFrame } from "../../ui/ThemeFrame/ThemeFrame";

const ACTION_COMMAND_PRIORITY = {
	focusRecovery: 180,
	keyboardHelp: 170,
	markUnreadNativeReply: 188,
	newWorkspace: 160,
	sidebarSearch: 178,
	unreadNativeReply: 190,
	vimMode: 150,
	viewSwitching: 140,
} as const;

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
		const vimModeEnabled = isDashboardVimModeEnabled();
		const commands: Command[] = [
			{
				id: "actions.newWorkspace",
				title: "New workspace",
				section: "actions",
				icon: PlusIcon,
				hotkeyId: "NEW_WORKSPACE",
				priority: ACTION_COMMAND_PRIORITY.newWorkspace,
				keywords: ["local", "session", "workspace", "repo", "project"],
				run: () => useNewWorkspaceModalStore.getState().openModal(),
			},
			{
				id: "actions.toggleDashboardVimMode",
				title: vimModeEnabled ? "Disable Vim mode" : "Enable Vim mode",
				section: "actions",
				description: vimModeEnabled
					? "Turn off j/k, g-prefix navigation, and local Vim action keys"
					: "Turn on j/k, g-prefix navigation, and local Vim action keys",
				icon: KeyboardIcon,
				hotkeyId: "TOGGLE_VIM_MODE",
				priority: ACTION_COMMAND_PRIORITY.vimMode,
				keywords: [
					"vim",
					"toggle",
					"keyboard",
					"j",
					"k",
					"navigation",
					"dashboard",
					vimModeEnabled ? "enabled" : "disabled",
				],
				run: () => {
					const enabled = toggleDashboardVimMode();
					toast.success(enabled ? "Vim mode enabled" : "Vim mode disabled");
				},
			},
			{
				id: "actions.switchDashboardViewNext",
				title: "Switch MRU view",
				section: "actions",
				icon: KeyboardIcon,
				hotkeyId: "SWITCH_DASHBOARD_VIEW_NEXT",
				priority: ACTION_COMMAND_PRIORITY.viewSwitching,
				keywords: ["mru", "recent", "switch", "tab", "view", "keyboard"],
				run: () => {
					handleDashboardGlobalKeyboardAction("SWITCH_DASHBOARD_VIEW_NEXT");
				},
			},
			{
				id: "actions.switchDashboardViewPrevious",
				title: "Switch MRU view back",
				section: "actions",
				icon: KeyboardIcon,
				hotkeyId: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
				priority: ACTION_COMMAND_PRIORITY.viewSwitching,
				keywords: ["mru", "recent", "switch", "tab", "back", "view"],
				run: () => {
					handleDashboardGlobalKeyboardAction("SWITCH_DASHBOARD_VIEW_PREVIOUS");
				},
			},
			{
				id: "actions.openUnreadNativeReply",
				title: "Open unread native reply",
				section: "actions",
				description: "Jump to the newest unread Capy or Devin response",
				icon: BellIcon,
				hotkeyId: "OPEN_UNREAD_NATIVE_REPLY",
				priority: ACTION_COMMAND_PRIORITY.unreadNativeReply,
				keywords: [
					"capy",
					"devin",
					"unread",
					"reply",
					"notification",
					"inbox",
					"agent",
				],
				run: () => {
					handleDashboardGlobalKeyboardAction("OPEN_UNREAD_NATIVE_REPLY");
				},
			},
			{
				id: "actions.markLatestNativeReplyRead",
				title: "Mark latest native reply read",
				section: "actions",
				description:
					"Acknowledge the newest unread Capy or Devin response without opening it",
				icon: BellOffIcon,
				hotkeyId: "MARK_LATEST_NATIVE_REPLY_READ",
				priority: ACTION_COMMAND_PRIORITY.markUnreadNativeReply,
				keywords: [
					"capy",
					"devin",
					"unread",
					"read",
					"acknowledge",
					"dismiss",
					"notification",
					"inbox",
					"agent",
				],
				run: () => {
					handleDashboardGlobalKeyboardAction("MARK_LATEST_NATIVE_REPLY_READ");
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
				run: toggleDashboardNavigationSidebar,
			},
			{
				id: "actions.focusNavigationShell",
				title: "Focus navigation sidebar",
				section: "actions",
				description: "Return keyboard focus to the left sidebar",
				icon: PanelLeftIcon,
				keywords: ["escape", "sidebar", "focus", "navigation", "shell"],
				shortcutLabel: "Esc",
				priority: ACTION_COMMAND_PRIORITY.focusRecovery,
				run: () => {
					handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL");
				},
			},
			{
				id: "actions.searchSidebar",
				title: "Search sidebar",
				section: "actions",
				description:
					"Focus the left sidebar search from browsers, terminals, settings, and native agents",
				icon: SearchIcon,
				keywords: [
					"sidebar",
					"search",
					"filter",
					"typeahead",
					"navigation",
					"shell",
				],
				priority: ACTION_COMMAND_PRIORITY.sidebarSearch,
				shortcutLabel: "/",
				run: () => {
					focusDashboardSidebarSearch();
				},
			},
			{
				id: "actions.showDashboardActionHints",
				title: "Show action hints",
				section: "actions",
				description: "Label visible dashboard buttons and links with Vim keys",
				icon: KeyboardIcon,
				hotkeyId: "SHOW_DASHBOARD_ACTION_HINTS",
				keywords: ["vim", "hints", "links", "buttons", "keyboard", "f"],
				priority: ACTION_COMMAND_PRIORITY.keyboardHelp,
				run: () => {
					handleDashboardGlobalKeyboardAction("SHOW_DASHBOARD_ACTION_HINTS");
				},
			},
			{
				id: "actions.showDashboardKeyboardGuide",
				title: "Show dashboard keyboard guide",
				section: "actions",
				description:
					"Open the dashboard keyboard map from browsers, terminals, and native agents",
				icon: KeyboardIcon,
				hotkeyId: "SHOW_DASHBOARD_KEYBOARD_HELP",
				priority: ACTION_COMMAND_PRIORITY.keyboardHelp,
				keywords: [
					"dashboard",
					"keyboard",
					"help",
					"vim",
					"shortcuts",
					"guide",
				],
				run: (ctx) => {
					openCommandPaletteKeyboardHelp(ctx);
				},
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
				run: (ctx) => {
					openCommandPaletteKeyboardHelp(ctx);
				},
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
