import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { cn } from "@superset/ui/utils";
import {
	type DashboardViewMruDirection,
	type DashboardViewMruEntry,
	type DashboardViewMruEntryLabelResolver,
	dashboardViewMruVisibleEntries,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-view-mru";

interface DashboardMruSwitcherOverlayProps {
	activeIndex: number;
	direction: DashboardViewMruDirection;
	entries: DashboardViewMruEntry[];
	labelResolver?: DashboardViewMruEntryLabelResolver;
}

export function DashboardMruSwitcherOverlay({
	activeIndex,
	direction,
	entries,
	labelResolver,
}: DashboardMruSwitcherOverlayProps) {
	if (entries.length < 2) return null;

	const visibleEntries = dashboardViewMruVisibleEntries({
		activeIndex,
		entries,
		labelResolver,
	});
	const activeEntry = entries[activeIndex];
	const activeLabel = activeEntry
		? dashboardViewMruVisibleEntries({
				activeIndex,
				entries: [activeEntry],
				labelResolver,
			})[0]
		: null;

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed top-4 left-1/2 z-[950] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2"
			data-dashboard-mru-switcher-overlay="true"
		>
			<div className="rounded-md border border-border/90 bg-background/95 p-2 shadow-2xl backdrop-blur">
				<div className="flex items-center justify-between gap-3 border-border/70 border-b px-2 pb-2">
					<div className="min-w-0">
						<div className="text-[11px] font-medium text-muted-foreground uppercase tracking-normal">
							Switching view
						</div>
						<div className="truncate text-sm font-semibold text-foreground">
							{activeLabel?.title ?? "Dashboard"}
						</div>
					</div>
					<KbdGroup className="shrink-0">
						<Kbd>Option</Kbd>
						<Kbd>{direction === "previous" ? "Shift" : "Tab"}</Kbd>
						{direction === "previous" && <Kbd>Tab</Kbd>}
					</KbdGroup>
				</div>
				<div className="mt-2 flex flex-col gap-1">
					{visibleEntries.map((entry) => {
						const active = entry.index === activeIndex;
						return (
							<div
								key={`${entry.path}:${entry.index}`}
								className={cn(
									"grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 rounded px-2 py-1.5",
									active
										? "bg-accent text-foreground"
										: "text-muted-foreground",
								)}
							>
								<span
									className={cn(
										"flex size-5 items-center justify-center rounded-sm border font-mono text-[10px]",
										active
											? "border-foreground/25 bg-background/70 text-foreground"
											: "border-border/70 bg-muted/25",
									)}
								>
									{entry.index + 1}
								</span>
								<span className="min-w-0">
									<span className="block truncate text-sm font-medium">
										{entry.title}
									</span>
									<span className="block truncate text-[11px] text-muted-foreground">
										{entry.subtitle}
									</span>
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
