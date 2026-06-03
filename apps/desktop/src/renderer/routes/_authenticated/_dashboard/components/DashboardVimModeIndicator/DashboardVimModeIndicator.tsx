import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { cn } from "@superset/ui/utils";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { useDashboardVimModeStore } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";

export function DashboardVimModeIndicator() {
	const enabled = useDashboardVimModeStore((state) => state.enabled);
	const pendingPrefix = useDashboardVimModeStore(
		(state) => state.pendingPrefix,
	);
	const toggleHotkey = useHotkeyDisplay("TOGGLE_VIM_MODE").text;
	const hasToggleHotkey = toggleHotkey !== "Unassigned";
	const title = hasToggleHotkey
		? `Vim mode active. Press ${toggleHotkey} to disable, ? for the keyboard guide, or f for visible action hints.`
		: "Vim mode active. Press ? for the keyboard guide or f for visible action hints.";

	if (!enabled) return null;

	return (
		<div
			data-dashboard-vim-mode-indicator="true"
			aria-live="polite"
			className={cn(
				"pointer-events-none fixed right-3 bottom-3 z-[900]",
				"flex items-center gap-2 rounded-md border border-border/80",
				"bg-background/90 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur",
			)}
			title={title}
		>
			<span className="sr-only">{title}</span>
			<span className="font-semibold text-foreground">Vim</span>
			{hasToggleHotkey ? (
				<>
					<span className="h-3 w-px bg-border" />
					<KbdGroup className="gap-1 text-[11px] text-muted-foreground">
						<Kbd className="h-4 min-w-4 bg-muted/70 px-1 font-mono text-[10px]">
							{toggleHotkey}
						</Kbd>
						<span>off</span>
					</KbdGroup>
				</>
			) : null}
			<span className="h-3 w-px bg-border" />
			<KbdGroup className="gap-1 text-[11px] text-muted-foreground">
				<Kbd className="h-4 min-w-4 bg-muted/70 px-1 font-mono text-[10px]">
					?
				</Kbd>
				<span>map</span>
			</KbdGroup>
			<KbdGroup className="gap-1 text-[11px] text-muted-foreground">
				<Kbd className="h-4 min-w-4 bg-muted/70 px-1 font-mono text-[10px]">
					f
				</Kbd>
				<span>hints</span>
			</KbdGroup>
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
