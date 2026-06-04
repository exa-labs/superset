import { BookOpenIcon, HistoryIcon, SettingsIcon } from "lucide-react";
import { LuLayers } from "react-icons/lu";
import { scheduleDashboardNavigationShellFocus } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-shell-focus";
import type { Command, CommandProvider } from "../../core/types";
import { RecentlyViewedFrame } from "../../ui/RecentlyViewed/RecentlyViewedFrame";
import { WorkspaceListFrame } from "../../ui/WorkspaceList";
import { settingsTabCommands } from "../settings/commands";

function navigateDashboardShellCommand(
	navigate: (path: string) => void,
	path: string,
): void {
	navigate(path);
	scheduleDashboardNavigationShellFocus();
}

export const navigationProvider: CommandProvider = {
	id: "navigation",
	provide: () => {
		const commands: Command[] = [
			{
				id: "nav.settings",
				title: "Settings",
				section: "navigation",
				icon: SettingsIcon,
				hotkeyId: "OPEN_SETTINGS",
				children: settingsTabCommands,
				run: (ctx) => ctx.navigate("/settings/account"),
			},
			{
				id: "nav.recentlyViewed",
				title: "Recently Viewed",
				section: "navigation",
				icon: HistoryIcon,
				keywords: ["history", "recent", "back"],
				renderFrame: () => <RecentlyViewedFrame />,
			},
			{
				id: "nav.workspaces",
				title: "Switch workspace",
				section: "navigation",
				icon: LuLayers,
				keywords: ["workspace", "project", "repo", "repository", "switch"],
				renderFrame: () => <WorkspaceListFrame />,
			},
			{
				id: "nav.workspaceOverview",
				title: "Open workspace overview",
				section: "navigation",
				icon: LuLayers,
				hotkeyId: "OPEN_WORKSPACES",
				keywords: ["workspace", "project", "repo", "repository", "overview"],
				run: (ctx) =>
					navigateDashboardShellCommand(ctx.navigate, "/v2-workspaces"),
			},
			{
				id: "nav.docs",
				title: "Open documentation",
				section: "navigation",
				icon: BookOpenIcon,
				run: () => {
					window.open("https://docs.superset.sh", "_blank", "noreferrer");
				},
			},
		];

		return commands;
	},
};
