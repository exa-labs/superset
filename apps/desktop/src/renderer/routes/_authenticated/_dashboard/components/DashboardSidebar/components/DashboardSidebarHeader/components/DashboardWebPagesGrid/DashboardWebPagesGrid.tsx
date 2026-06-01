import { cn } from "@superset/ui/utils";
import { DASHBOARD_WEB_PAGES } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import { DashboardWebPageButton } from "./components/DashboardWebPageButton";

interface DashboardWebPagesGridProps {
	activePageId: string | null;
	variant: "collapsed" | "expanded";
	onOpenPage: (pageId: string) => void;
}

export function DashboardWebPagesGrid({
	activePageId,
	variant,
	onOpenPage,
}: DashboardWebPagesGridProps) {
	return (
		<div
			className={cn(
				variant === "collapsed"
					? "grid grid-cols-1 gap-1"
					: "grid grid-cols-2 gap-1 py-0.5",
			)}
		>
			{DASHBOARD_WEB_PAGES.map((page) => (
				<DashboardWebPageButton
					key={page.id}
					page={page}
					isActive={activePageId === page.id}
					variant={variant}
					onOpen={onOpenPage}
				/>
			))}
		</div>
	);
}
