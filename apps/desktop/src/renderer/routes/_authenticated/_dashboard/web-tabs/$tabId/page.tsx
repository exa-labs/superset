import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";
import {
	getDashboardWebTab,
	getDashboardWebTabs,
	subscribeDashboardWebTabs,
} from "../../utils/dashboard-web-tabs";

export const Route = createFileRoute(
	"/_authenticated/_dashboard/web-tabs/$tabId/",
)({
	component: DashboardWebTabRoute,
});

function DashboardWebTabRoute() {
	const navigate = useNavigate();
	const { tabId } = Route.useParams();
	const tab = useSyncExternalStore(
		subscribeDashboardWebTabs,
		() => getDashboardWebTab(tabId),
		() => getDashboardWebTab(tabId),
	);

	useEffect(() => {
		if (tab) return;
		const firstTab = getDashboardWebTabs()[0];
		if (!firstTab) return;
		void navigate({
			to: "/web-tabs/$tabId",
			params: { tabId: firstTab.id },
			replace: true,
		});
	}, [navigate, tab]);

	return null;
}
