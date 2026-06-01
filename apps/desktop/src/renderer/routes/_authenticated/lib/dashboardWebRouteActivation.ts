interface DashboardWebRouteMatch {
	pageId?: string;
	tabId?: string;
}

function isDashboardWebPathname(pathname: string): boolean {
	return (
		pathname === "/web" ||
		pathname.startsWith("/web/") ||
		pathname === "/web-tabs" ||
		pathname.startsWith("/web-tabs/")
	);
}

export function resolveDashboardWebPathname({
	hashPathname,
	locationPathname,
}: {
	hashPathname: string | null;
	locationPathname: string;
}): string {
	if (!hashPathname?.startsWith("/")) return locationPathname;
	if (!isDashboardWebPathname(locationPathname)) return locationPathname;
	return hashPathname;
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
	const fallbackWebPageId = onDashboardWebPageRoute
		? pathname.split("/").filter(Boolean)[1]
		: null;
	const fallbackWebTabId = onDashboardWebTabRoute
		? pathname.split("/").filter(Boolean)[1]
		: null;

	return {
		activeWebPageId:
			onDashboardWebPageRoute && (webPageMatch !== false || fallbackWebPageId)
				? (fallbackWebPageId ??
					(webPageMatch ? (webPageMatch.pageId ?? null) : null))
				: null,
		activeWebTabId:
			onDashboardWebTabRoute && (webTabMatch !== false || fallbackWebTabId)
				? (fallbackWebTabId ??
					(webTabMatch ? (webTabMatch.tabId ?? null) : null))
				: null,
	};
}
