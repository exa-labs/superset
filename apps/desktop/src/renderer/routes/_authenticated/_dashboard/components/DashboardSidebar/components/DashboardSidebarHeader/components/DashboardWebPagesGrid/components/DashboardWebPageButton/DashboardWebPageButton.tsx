import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useSyncExternalStore } from "react";
import { useHotkeyDisplay } from "renderer/hotkeys";
import {
	getDashboardWebPageFavicon,
	subscribeDashboardWebPageFavicons,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-page-favicons";
import type { DashboardWebPage } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	cancelDashboardWebUrlWarmup,
	warmDashboardWebUrl,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-preloader";
import { DashboardWebPageIcon } from "../DashboardWebPageIcon";

interface DashboardWebPageButtonProps {
	page: DashboardWebPage;
	isActive: boolean;
	variant: "collapsed" | "expanded";
	onOpen: (pageId: string) => void;
}

export function DashboardWebPageButton({
	page,
	isActive,
	variant,
	onOpen,
}: DashboardWebPageButtonProps) {
	const shortcut = useHotkeyDisplay(page.hotkeyId).text;
	const faviconUrl = useSyncExternalStore(
		subscribeDashboardWebPageFavicons,
		() => getDashboardWebPageFavicon(page),
		() => page.fallbackFaviconUrl ?? null,
	);
	const shortcutLabel = shortcut !== "Unassigned" ? shortcut : null;

	if (variant === "collapsed") {
		return (
			<Tooltip delayDuration={300}>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label={page.label}
						onFocus={() => warmDashboardWebUrl(page.url)}
						onMouseEnter={() => warmDashboardWebUrl(page.url)}
						onMouseLeave={cancelDashboardWebUrlWarmup}
						onClick={() => onOpen(page.id)}
						className={cn(
							"flex size-8 items-center justify-center rounded-md transition-colors",
							isActive
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						)}
					>
						<DashboardWebPageIcon
							src={faviconUrl}
							fallbackLabel={page.shortLabel}
							className="size-4"
						/>
					</button>
				</TooltipTrigger>
				<TooltipContent side="right">
					{page.label}
					{shortcutLabel ? ` (${shortcutLabel})` : ""}
				</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Tooltip delayDuration={500}>
			<TooltipTrigger asChild>
				<button
					type="button"
					onFocus={() => warmDashboardWebUrl(page.url)}
					onMouseEnter={() => warmDashboardWebUrl(page.url)}
					onMouseLeave={cancelDashboardWebUrlWarmup}
					onClick={() => onOpen(page.id)}
					className={cn(
						"flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-transparent px-1.5 text-xs font-medium transition-colors",
						isActive
							? "border-border/60 bg-accent text-foreground"
							: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
					)}
				>
					<DashboardWebPageIcon
						src={faviconUrl}
						fallbackLabel={page.shortLabel}
						className="size-3.5"
					/>
					<span className="min-w-0 flex-1 truncate text-left">
						{page.shortLabel}
					</span>
					{shortcutLabel && (
						<span className="shrink-0 text-[10px] font-mono text-muted-foreground/60">
							{shortcutLabel}
						</span>
					)}
				</button>
			</TooltipTrigger>
			<TooltipContent side="right">
				{page.label}
				{shortcutLabel ? ` (${shortcutLabel})` : ""}
			</TooltipContent>
		</Tooltip>
	);
}
