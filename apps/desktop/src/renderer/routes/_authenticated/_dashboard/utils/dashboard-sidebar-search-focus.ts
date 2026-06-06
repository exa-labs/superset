import {
	COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
	DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
	useWorkspaceSidebarStore,
} from "renderer/stores/workspace-sidebar-state";

export const DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT =
	"dashboard-sidebar-search-focus";

export interface DashboardSidebarSearchFocusDetail {
	seed?: string;
}

export function focusDashboardSidebarSearch(
	detail: DashboardSidebarSearchFocusDetail = {},
): boolean {
	if (typeof window === "undefined") return false;
	const targetWindow = window;
	const sidebarState = useWorkspaceSidebarStore.getState();
	if (!sidebarState.isOpen) {
		sidebarState.setOpen(true);
	}
	const visibleSidebarState = useWorkspaceSidebarStore.getState();
	if (visibleSidebarState.isCollapsed()) {
		visibleSidebarState.setWidth(
			visibleSidebarState.lastExpandedWidth > COLLAPSED_WORKSPACE_SIDEBAR_WIDTH
				? visibleSidebarState.lastExpandedWidth
				: DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
		);
	}

	globalThis.setTimeout(() => {
		targetWindow.dispatchEvent(
			new CustomEvent<DashboardSidebarSearchFocusDetail>(
				DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT,
				{
					detail,
				},
			),
		);
	}, 0);
	return true;
}
