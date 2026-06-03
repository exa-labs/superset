import {
	ArchiveIcon,
	ArrowDownIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowUpIcon,
	Columns2Icon,
	EqualIcon,
	FileIcon,
	GlobeIcon,
	LinkIcon,
	MessageSquareIcon,
	PanelBottomIcon,
	PanelLeftIcon,
	PanelRightIcon,
	PlusIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useQuickOpenStore } from "renderer/commandPalette/ui/QuickOpen/quickOpenStore";
import { dispatchDashboardWorkspacePaneAction } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-workspace-pane-actions";
import { useDeleteWorkspaceIntent } from "renderer/stores/delete-workspace-intent";
import { useNewWorkspaceModalStore } from "renderer/stores/new-workspace-modal";
import { useRemoveFromSidebarIntent } from "renderer/stores/remove-workspace-from-sidebar-intent";
import type { Command, CommandProvider } from "../../core/types";
import { LinkTaskFrame } from "../../ui/LinkTask/LinkTaskFrame";

export const workspaceProvider: CommandProvider = {
	id: "workspace",
	provide: (context) => {
		if (!context.workspace) return [];
		const workspace = context.workspace;
		const isMain = workspace.workspaceType === "main";

		const commands: Command[] = [
			{
				id: "workspace.new",
				title: "New workspace",
				section: "workspace",
				icon: PlusIcon,
				hotkeyId: "NEW_WORKSPACE",
				run: () =>
					useNewWorkspaceModalStore.getState().openModal(workspace.projectId),
			},
			{
				id: "files.quickOpen",
				title: "Search files",
				section: "workspace",
				icon: FileIcon,
				keywords: ["file picker", "quick open"],
				hotkeyId: "QUICK_OPEN",
				run: () =>
					useQuickOpenStore.getState().openFor({
						workspaceId: workspace.id,
					}),
			},
			{
				id: "workspace.linkTask",
				title: "Link task",
				section: "workspace",
				icon: LinkIcon,
				keywords: ["issue", "linear"],
				renderFrame: () => <LinkTaskFrame workspaceId={workspace.id} />,
			},
			{
				id: "workspace.pane.splitAuto",
				title: "Split pane automatically",
				section: "workspace",
				description: "Split the focused workspace pane along its longer side",
				icon: Columns2Icon,
				hotkeyId: "SPLIT_AUTO",
				keywords: ["pane", "layout", "keyboard"],
				shortcutLabel: "s",
				run: () => dispatchDashboardWorkspacePaneAction("split-auto"),
			},
			{
				id: "workspace.pane.splitRight",
				title: "Split pane right",
				section: "workspace",
				description: "Open a new terminal pane to the right",
				icon: Columns2Icon,
				hotkeyId: "SPLIT_RIGHT",
				keywords: ["vertical", "pane", "layout"],
				run: () => dispatchDashboardWorkspacePaneAction("split-right"),
			},
			{
				id: "workspace.pane.splitDown",
				title: "Split pane down",
				section: "workspace",
				description: "Open a new terminal pane below",
				icon: PanelBottomIcon,
				hotkeyId: "SPLIT_DOWN",
				keywords: ["horizontal", "pane", "layout"],
				run: () => dispatchDashboardWorkspacePaneAction("split-down"),
			},
			{
				id: "workspace.pane.splitChat",
				title: "Split with new chat",
				section: "workspace",
				icon: MessageSquareIcon,
				hotkeyId: "SPLIT_WITH_CHAT",
				keywords: ["pane", "agent", "chat"],
				run: () => dispatchDashboardWorkspacePaneAction("split-chat"),
			},
			{
				id: "workspace.pane.splitBrowser",
				title: "Split with new browser",
				section: "workspace",
				icon: GlobeIcon,
				hotkeyId: "SPLIT_WITH_BROWSER",
				keywords: ["pane", "chrome", "browser"],
				run: () => dispatchDashboardWorkspacePaneAction("split-browser"),
			},
			{
				id: "workspace.pane.equalize",
				title: "Equalize pane splits",
				section: "workspace",
				icon: EqualIcon,
				hotkeyId: "EQUALIZE_PANE_SPLITS",
				keywords: ["pane", "layout", "resize"],
				shortcutLabel: "=",
				run: () => dispatchDashboardWorkspacePaneAction("equalize"),
			},
			{
				id: "workspace.pane.narrow",
				title: "Narrow focused pane",
				section: "workspace",
				icon: PanelLeftIcon,
				hotkeyId: "NARROW_PANE_SPLIT",
				keywords: ["pane", "layout", "resize"],
				shortcutLabel: "[",
				run: () => dispatchDashboardWorkspacePaneAction("narrow-pane"),
			},
			{
				id: "workspace.pane.widen",
				title: "Widen focused pane",
				section: "workspace",
				icon: PanelRightIcon,
				hotkeyId: "WIDEN_PANE_SPLIT",
				keywords: ["pane", "layout", "resize"],
				shortcutLabel: "]",
				run: () => dispatchDashboardWorkspacePaneAction("widen-pane"),
			},
			{
				id: "workspace.pane.close",
				title: "Close focused pane",
				section: "workspace",
				icon: XIcon,
				hotkeyId: "CLOSE_PANE",
				keywords: ["pane", "remove"],
				shortcutLabel: "x",
				run: () => dispatchDashboardWorkspacePaneAction("close-pane"),
			},
			{
				id: "workspace.pane.focusLeft",
				title: "Focus pane left",
				section: "workspace",
				icon: ArrowLeftIcon,
				hotkeyId: "FOCUS_PANE_LEFT",
				keywords: ["pane", "move", "keyboard"],
				shortcutLabel: "h",
				run: () => dispatchDashboardWorkspacePaneAction("focus-left"),
			},
			{
				id: "workspace.pane.focusRight",
				title: "Focus pane right",
				section: "workspace",
				icon: ArrowRightIcon,
				hotkeyId: "FOCUS_PANE_RIGHT",
				keywords: ["pane", "move", "keyboard"],
				shortcutLabel: "l",
				run: () => dispatchDashboardWorkspacePaneAction("focus-right"),
			},
			{
				id: "workspace.pane.focusUp",
				title: "Focus pane up",
				section: "workspace",
				icon: ArrowUpIcon,
				hotkeyId: "FOCUS_PANE_UP",
				keywords: ["pane", "move", "keyboard"],
				shortcutLabel: "k",
				run: () => dispatchDashboardWorkspacePaneAction("focus-up"),
			},
			{
				id: "workspace.pane.focusDown",
				title: "Focus pane down",
				section: "workspace",
				icon: ArrowDownIcon,
				hotkeyId: "FOCUS_PANE_DOWN",
				keywords: ["pane", "move", "keyboard"],
				shortcutLabel: "j",
				run: () => dispatchDashboardWorkspacePaneAction("focus-down"),
			},
			{
				id: "workspace.pane.swapLeft",
				title: "Swap pane left",
				section: "workspace",
				icon: ArrowLeftIcon,
				keywords: ["pane", "move", "keyboard", "swap"],
				shortcutLabel: "H",
				run: () => dispatchDashboardWorkspacePaneAction("swap-left"),
			},
			{
				id: "workspace.pane.swapRight",
				title: "Swap pane right",
				section: "workspace",
				icon: ArrowRightIcon,
				keywords: ["pane", "move", "keyboard", "swap"],
				shortcutLabel: "L",
				run: () => dispatchDashboardWorkspacePaneAction("swap-right"),
			},
			{
				id: "workspace.pane.swapUp",
				title: "Swap pane up",
				section: "workspace",
				icon: ArrowUpIcon,
				keywords: ["pane", "move", "keyboard", "swap"],
				shortcutLabel: "K",
				run: () => dispatchDashboardWorkspacePaneAction("swap-up"),
			},
			{
				id: "workspace.pane.swapDown",
				title: "Swap pane down",
				section: "workspace",
				icon: ArrowDownIcon,
				keywords: ["pane", "move", "keyboard", "swap"],
				shortcutLabel: "J",
				run: () => dispatchDashboardWorkspacePaneAction("swap-down"),
			},
		];

		if (workspace.projectId) {
			commands.push({
				id: `workspace.removeFromSidebar:${workspace.id}`,
				title: "Remove current workspace from sidebar",
				section: "workspace",
				description:
					"Archive this workspace from the sidebar without deleting it",
				icon: ArchiveIcon,
				keywords: ["archive", "hide", "move away", "sidebar", "workspace"],
				shortcutLabel: "a/x",
				run: () =>
					useRemoveFromSidebarIntent.getState().request({
						workspaceId: workspace.id,
						workspaceName: workspace.name,
						projectId: workspace.projectId ?? "",
						isMain,
					}),
			});
		}

		if (!isMain) {
			commands.push({
				id: `workspace.delete:${workspace.id}`,
				title: `Delete current workspace: ${workspace.name}`,
				section: "workspace",
				description: "Open the workspace delete confirmation",
				icon: Trash2Icon,
				keywords: ["delete", "destroy", "archive", "remove", "close"],
				hotkeyId: "CLOSE_WORKSPACE",
				shortcutLabel: "d",
				run: () =>
					useDeleteWorkspaceIntent.getState().request({
						workspaceId: workspace.id,
						workspaceName: workspace.name,
					}),
			});
		}

		return commands;
	},
};
