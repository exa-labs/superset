import type { DashboardWorkspacePaneAction } from "./dashboard-workspace-pane-actions";

export type DashboardWorkspacePaneVimAction =
	| DashboardWorkspacePaneAction
	| "none";

export function dashboardWorkspacePaneVimActionFromKey(
	key: string,
): DashboardWorkspacePaneVimAction {
	if (key === "h") return "focus-left";
	if (key === "j") return "focus-down";
	if (key === "k") return "focus-up";
	if (key === "l") return "focus-right";
	if (key === "H") return "swap-left";
	if (key === "J") return "swap-down";
	if (key === "K") return "swap-up";
	if (key === "L") return "swap-right";
	if (key === "[") return "narrow-pane";
	if (key === "]") return "widen-pane";
	if (key === "=") return "equalize";
	if (key === "s") return "split-auto";
	if (key === "x") return "close-pane";
	return "none";
}
