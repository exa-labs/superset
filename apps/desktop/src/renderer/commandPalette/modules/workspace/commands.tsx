import {
	ArchiveIcon,
	Columns2Icon,
	EqualIcon,
	FileIcon,
	GlobeIcon,
	LinkIcon,
	MessageSquareIcon,
	PanelBottomIcon,
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
				run: () => dispatchDashboardWorkspacePaneAction("equalize"),
			},
			{
				id: "workspace.pane.close",
				title: "Close focused pane",
				section: "workspace",
				icon: XIcon,
				hotkeyId: "CLOSE_PANE",
				keywords: ["pane", "remove"],
				run: () => dispatchDashboardWorkspacePaneAction("close-pane"),
			},
		];

		if (workspace.projectId) {
			commands.push({
				id: `workspace.removeFromSidebar:${workspace.id}`,
				title: "Remove from sidebar",
				section: "workspace",
				icon: ArchiveIcon,
				keywords: ["hide"],
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
				title: `Delete ${workspace.name}`,
				section: "workspace",
				icon: Trash2Icon,
				keywords: ["archive", "remove", "close"],
				hotkeyId: "CLOSE_WORKSPACE",
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
