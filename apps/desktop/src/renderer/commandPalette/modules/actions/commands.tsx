import { toast } from "@superset/ui/sonner";
import {
	ArchiveIcon,
	ArrowDownIcon,
	ArrowUpIcon,
	BellIcon,
	BellOffIcon,
	ChevronsDownIcon,
	ChevronsUpIcon,
	EllipsisIcon,
	FolderInputIcon,
	KeyboardIcon,
	MessageSquareIcon,
	PaletteIcon,
	PanelLeftIcon,
	PanelRightIcon,
	PencilIcon,
	PinIcon,
	PlusIcon,
	RefreshCwIcon,
	SearchIcon,
	SettingsIcon,
	SquareMousePointerIcon,
	Trash2Icon,
} from "lucide-react";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { electronQueryClient } from "renderer/providers/ElectronTRPCProvider";
import { handleDashboardGlobalKeyboardAction } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-global-keyboard-action";
import { toggleDashboardNavigationSidebar } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-navigation-sidebar-toggle";
import {
	type DashboardSidebarKeyboardCommand,
	dispatchDashboardSidebarKeyboardCommand,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-keyboard-command";
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
	sidebarFocusedRow: 182,
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

const FOCUSED_SIDEBAR_COMMANDS: Array<{
	command: DashboardSidebarKeyboardCommand;
	description: string;
	icon: Command["icon"];
	id: string;
	keywords: string[];
	shortcutLabel: string;
	title: string;
}> = [
	{
		command: "focus-next",
		description: "Move keyboard focus to the next visible row in the sidebar",
		icon: ArrowDownIcon,
		id: "focusNext",
		keywords: ["next", "down", "j", "sidebar", "focus", "navigation"],
		shortcutLabel: "↓/j",
		title: "Focus next sidebar item",
	},
	{
		command: "focus-previous",
		description:
			"Move keyboard focus to the previous visible row in the sidebar",
		icon: ArrowUpIcon,
		id: "focusPrevious",
		keywords: ["previous", "up", "k", "sidebar", "focus", "navigation"],
		shortcutLabel: "↑/k",
		title: "Focus previous sidebar item",
	},
	{
		command: "focus-first",
		description: "Jump keyboard focus to the first visible row in the sidebar",
		icon: ChevronsUpIcon,
		id: "focusFirst",
		keywords: ["first", "top", "home", "gg", "sidebar", "focus"],
		shortcutLabel: "Home/gg",
		title: "Focus first sidebar item",
	},
	{
		command: "focus-last",
		description: "Jump keyboard focus to the last visible row in the sidebar",
		icon: ChevronsDownIcon,
		id: "focusLast",
		keywords: ["last", "bottom", "end", "g", "sidebar", "focus"],
		shortcutLabel: "End/G",
		title: "Focus last sidebar item",
	},
	{
		command: "activate",
		description: "Open the row currently focused in the left sidebar",
		icon: SquareMousePointerIcon,
		id: "activate",
		keywords: ["open", "enter", "sidebar", "row", "focused", "navigation"],
		shortcutLabel: "Enter",
		title: "Open focused sidebar item",
	},
	{
		command: "toggle-expansion",
		description: "Collapse or expand the currently focused sidebar row",
		icon: PanelLeftIcon,
		id: "toggleExpansion",
		keywords: ["toggle", "collapse", "expand", "folder", "sidebar", "space"],
		shortcutLabel: "Space",
		title: "Toggle focused sidebar item",
	},
	{
		command: "collapse",
		description: "Collapse the currently focused sidebar group",
		icon: PanelLeftIcon,
		id: "collapse",
		keywords: ["collapse", "close", "h", "folder", "sidebar", "focused"],
		shortcutLabel: "h",
		title: "Collapse focused sidebar item",
	},
	{
		command: "expand",
		description: "Expand the currently focused sidebar group",
		icon: PanelRightIcon,
		id: "expand",
		keywords: ["expand", "open", "l", "folder", "sidebar", "focused"],
		shortcutLabel: "l",
		title: "Expand focused sidebar item",
	},
	{
		command: "action-create",
		description: "Create a new item from the focused sidebar group",
		icon: PlusIcon,
		id: "create",
		keywords: ["new", "create", "sidebar", "workspace", "thread", "session"],
		shortcutLabel: "n",
		title: "Create from focused sidebar group",
	},
	{
		command: "action-create-folder",
		description: "Create a folder in the focused sidebar group",
		icon: FolderInputIcon,
		id: "createFolder",
		keywords: ["new", "create", "folder", "group", "sidebar", "organize"],
		shortcutLabel: "N",
		title: "Create folder from focused sidebar group",
	},
	{
		command: "action-menu",
		description: "Open the action menu for the currently focused sidebar item",
		icon: EllipsisIcon,
		id: "menu",
		keywords: ["menu", "actions", "more", "sidebar", "focused", "dot"],
		shortcutLabel: ".",
		title: "Show focused sidebar item actions",
	},
	{
		command: "action-pin",
		description: "Pin or unpin the currently focused sidebar item",
		icon: PinIcon,
		id: "pin",
		keywords: ["pin", "unpin", "sidebar", "keep", "focused"],
		shortcutLabel: "p",
		title: "Pin or unpin focused sidebar item",
	},
	{
		command: "action-reply",
		description: "Reply to the focused Capy or Devin sidebar session",
		icon: MessageSquareIcon,
		id: "reply",
		keywords: ["reply", "message", "capy", "devin", "agent", "focused"],
		shortcutLabel: "r",
		title: "Reply to focused agent session",
	},
	{
		command: "action-open-browser",
		description: "Open the browser version for the focused agent session",
		icon: SquareMousePointerIcon,
		id: "openBrowser",
		keywords: ["browser", "open", "capy", "devin", "agent", "focused", "web"],
		shortcutLabel: "o",
		title: "Open focused agent in browser",
	},
	{
		command: "action-toggle-browser",
		description: "Switch the focused agent session between native and browser",
		icon: PanelRightIcon,
		id: "toggleBrowser",
		keywords: [
			"browser",
			"native",
			"toggle",
			"capy",
			"devin",
			"agent",
			"focused",
		],
		shortcutLabel: "b",
		title: "Toggle focused agent native/browser",
	},
	{
		command: "action-move",
		description: "Move the focused sidebar item into a folder",
		icon: FolderInputIcon,
		id: "move",
		keywords: ["move", "folder", "organize", "sidebar", "focused"],
		shortcutLabel: "m",
		title: "Move focused sidebar item to folder",
	},
	{
		command: "action-remove-from-folder",
		description: "Remove the focused sidebar item from its folder",
		icon: FolderInputIcon,
		id: "removeFromFolder",
		keywords: [
			"remove",
			"folder",
			"unfolder",
			"organize",
			"sidebar",
			"focused",
		],
		shortcutLabel: "F",
		title: "Remove focused sidebar item from folder",
	},
	{
		command: "action-rename",
		description: "Rename the focused sidebar item or folder",
		icon: PencilIcon,
		id: "rename",
		keywords: ["rename", "edit", "title", "folder", "sidebar", "focused"],
		shortcutLabel: "e",
		title: "Rename focused sidebar item",
	},
	{
		command: "action-color",
		description: "Change the focused folder color",
		icon: PaletteIcon,
		id: "color",
		keywords: ["color", "folder", "palette", "sidebar", "focused"],
		shortcutLabel: "c",
		title: "Change focused folder color",
	},
	{
		command: "action-delete",
		description: "Delete the focused sidebar folder or removable item",
		icon: Trash2Icon,
		id: "delete",
		keywords: ["delete", "remove", "trash", "folder", "sidebar", "focused"],
		shortcutLabel: "d",
		title: "Delete focused sidebar item",
	},
	{
		command: "action-hard-archive",
		description: "Archive the focused native Capy or Devin session",
		icon: ArchiveIcon,
		id: "hardArchive",
		keywords: [
			"archive",
			"hard",
			"session",
			"capy",
			"devin",
			"agent",
			"focused",
		],
		shortcutLabel: "X",
		title: "Archive focused native agent session",
	},
	{
		command: "action-mark-read",
		description: "Mark the focused Capy or Devin session reply read",
		icon: BellOffIcon,
		id: "markRead",
		keywords: [
			"read",
			"mark",
			"unread",
			"reply",
			"notification",
			"capy",
			"devin",
			"agent",
			"focused",
		],
		shortcutLabel: "U",
		title: "Mark focused native reply read",
	},
	{
		command: "action-archive",
		description:
			"Hide the focused sidebar item or move it away from the active list",
		icon: ArchiveIcon,
		id: "archive",
		keywords: ["archive", "hide", "overview", "remove", "sidebar", "focused"],
		shortcutLabel: "a/x",
		title: "Move focused sidebar item to overview",
	},
];

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
				keywords: ["dashboard", "left", "navigation", "sidebar", "vim", "h"],
				shortcutLabel: "H",
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

		for (const sidebarCommand of FOCUSED_SIDEBAR_COMMANDS) {
			commands.push({
				id: `actions.sidebar.${sidebarCommand.id}`,
				title: sidebarCommand.title,
				section: "actions",
				description: sidebarCommand.description,
				icon: sidebarCommand.icon,
				keywords: [
					...sidebarCommand.keywords,
					"keyboard",
					"vim",
					"command",
					"control plane",
				],
				priority: ACTION_COMMAND_PRIORITY.sidebarFocusedRow,
				shortcutLabel: sidebarCommand.shortcutLabel,
				run: () => {
					dispatchDashboardSidebarKeyboardCommand(sidebarCommand.command);
				},
			});
		}

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
