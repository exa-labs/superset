import { cn } from "@superset/ui/utils";
import { useDashboardVimModeStore } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";

export function DashboardVimModeIndicator() {
	const enabled = useDashboardVimModeStore((state) => state.enabled);
	const pendingPrefix = useDashboardVimModeStore(
		(state) => state.pendingPrefix,
	);

	if (!enabled) return null;

	return (
		<div
			data-dashboard-vim-mode-indicator="true"
			className={cn(
				"pointer-events-none fixed right-3 bottom-3 z-[900]",
				"flex items-center gap-2 rounded-md border border-border/80",
				"bg-background/90 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur",
			)}
			title="Vim mode active. Press ? for the keyboard guide or f for visible action hints."
		>
			<span className="font-semibold text-foreground">Vim</span>
			{pendingPrefix ? (
				<>
					<span className="h-3 w-px bg-border" />
					<span className="font-mono text-[11px] text-muted-foreground">
						{pendingPrefix}...
					</span>
				</>
			) : null}
		</div>
	);
}
