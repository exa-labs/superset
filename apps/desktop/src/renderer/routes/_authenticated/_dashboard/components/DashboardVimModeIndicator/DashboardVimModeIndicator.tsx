import { Kbd, KbdGroup } from "@superset/ui/kbd";
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
			title="Vim mode active. Press ? for keyboard shortcuts."
		>
			<span className="font-semibold text-foreground">Vim</span>
			<span className="h-3 w-px bg-border" />
			{pendingPrefix ? (
				<KbdGroup>
					<Kbd>{pendingPrefix}</Kbd>
					<span className="font-mono text-muted-foreground">...</span>
				</KbdGroup>
			) : (
				<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
					<span className="inline-flex items-center gap-1">
						<Kbd>?</Kbd>
						Help
					</span>
					<span className="inline-flex items-center gap-1">
						<Kbd>f</Kbd>
						Actions
					</span>
				</div>
			)}
		</div>
	);
}
