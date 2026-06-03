export const DASHBOARD_WORKSPACE_PANE_ACTION_EVENT =
	"dashboard-workspace-pane-action" as const;

export const DASHBOARD_WORKSPACE_PANE_ACTIONS = [
	"close-pane",
	"equalize",
	"split-auto",
	"split-browser",
	"split-chat",
	"split-down",
	"split-right",
] as const;

export type DashboardWorkspacePaneAction =
	(typeof DASHBOARD_WORKSPACE_PANE_ACTIONS)[number];

export interface DashboardWorkspacePaneActionDetail {
	action: DashboardWorkspacePaneAction;
}

export function isDashboardWorkspacePaneAction(
	value: unknown,
): value is DashboardWorkspacePaneAction {
	return (
		typeof value === "string" &&
		(DASHBOARD_WORKSPACE_PANE_ACTIONS as readonly string[]).includes(value)
	);
}

export function dispatchDashboardWorkspacePaneAction(
	action: DashboardWorkspacePaneAction,
): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent<DashboardWorkspacePaneActionDetail>(
			DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			{ detail: { action } },
		),
	);
}

export function addDashboardWorkspacePaneActionListener(
	listener: (action: DashboardWorkspacePaneAction) => void,
): () => void {
	if (typeof window === "undefined") return () => undefined;
	const handler = (event: Event) => {
		const action = (event as CustomEvent<DashboardWorkspacePaneActionDetail>)
			.detail?.action;
		if (isDashboardWorkspacePaneAction(action)) listener(action);
	};

	window.addEventListener(DASHBOARD_WORKSPACE_PANE_ACTION_EVENT, handler);
	return () =>
		window.removeEventListener(DASHBOARD_WORKSPACE_PANE_ACTION_EVENT, handler);
}
