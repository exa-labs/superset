export const DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT =
	"dashboard-sidebar-search-focus";

export interface DashboardSidebarSearchFocusDetail {
	seed?: string;
}

export function focusDashboardSidebarSearch(
	detail: DashboardSidebarSearchFocusDetail = {},
): boolean {
	if (typeof window === "undefined") return false;
	window.dispatchEvent(
		new CustomEvent<DashboardSidebarSearchFocusDetail>(
			DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT,
			{
				detail,
			},
		),
	);
	return true;
}
