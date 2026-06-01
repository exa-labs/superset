import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	DASHBOARD_WEB_PAGES,
	getDashboardWebPage,
} from "../../utils/dashboard-web-pages";

export const Route = createFileRoute("/_authenticated/_dashboard/web/$pageId/")(
	{
		component: DashboardWebPageRoute,
	},
);

function DashboardWebPageRoute() {
	const navigate = useNavigate();
	const { pageId } = Route.useParams();
	const page = getDashboardWebPage(pageId);

	useEffect(() => {
		if (page) return;
		void navigate({
			to: "/web/$pageId",
			params: { pageId: DASHBOARD_WEB_PAGES[0].id },
			replace: true,
		});
	}, [navigate, page]);

	return null;
}
