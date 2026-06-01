interface DashboardWebRouteMatch {
	pageId?: string;
	tabId?: string;
}

export function resolveDashboardWebRouteActivation({
	pathname,
	webPageMatch,
	webTabMatch,
}: {
	pathname: string;
	webPageMatch: DashboardWebRouteMatch | false;
	webTabMatch: DashboardWebRouteMatch | false;
}): {
	activeWebPageId: string | null;
	activeWebTabId: string | null;
} {
	const onDashboardWebPageRoute =
		pathname === "/web" || pathname.startsWith("/web/");
	const onDashboardWebTabRoute =
		pathname === "/web-tabs" || pathname.startsWith("/web-tabs/");

	return {
		activeWebPageId:
			onDashboardWebPageRoute && webPageMatch !== false && webPageMatch.pageId
				? webPageMatch.pageId
				: null,
		activeWebTabId:
			onDashboardWebTabRoute && webTabMatch !== false && webTabMatch.tabId
				? webTabMatch.tabId
				: null,
	};
}
