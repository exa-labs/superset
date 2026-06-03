import { cn } from "@superset/ui/utils";
import { useEffect, useState } from "react";
import {
	dashboardFocusIndicatorHints,
	dashboardFocusIndicatorShortcutTitle,
	dashboardFocusIndicatorVisibleHintLabels,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-focus-indicator-hints";
import {
	type DashboardFocusScope,
	dashboardFocusScopeForDocument,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-focus-scope";
import { useDashboardVimModeStore } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";

function currentDashboardFocusScope(): DashboardFocusScope {
	if (typeof document === "undefined") {
		return dashboardFocusScopeForDocument(null);
	}
	return dashboardFocusScopeForDocument(document);
}

export function DashboardFocusIndicator() {
	const [scope, setScope] = useState(currentDashboardFocusScope);
	const vimModeEnabled = useDashboardVimModeStore((state) => state.enabled);

	useEffect(() => {
		if (typeof document === "undefined" || typeof window === "undefined") {
			return;
		}

		let animationFrame: number | null = null;
		const update = () => {
			animationFrame = null;
			setScope(currentDashboardFocusScope());
		};
		const scheduleUpdate = () => {
			if (animationFrame !== null) {
				window.cancelAnimationFrame(animationFrame);
			}
			animationFrame = window.requestAnimationFrame(update);
		};

		document.addEventListener("focusin", scheduleUpdate, true);
		document.addEventListener("focusout", scheduleUpdate, true);
		document.addEventListener("keydown", scheduleUpdate, true);
		document.addEventListener("pointerdown", scheduleUpdate, true);
		scheduleUpdate();

		return () => {
			if (animationFrame !== null) {
				window.cancelAnimationFrame(animationFrame);
			}
			document.removeEventListener("focusin", scheduleUpdate, true);
			document.removeEventListener("focusout", scheduleUpdate, true);
			document.removeEventListener("keydown", scheduleUpdate, true);
			document.removeEventListener("pointerdown", scheduleUpdate, true);
		};
	}, []);

	const hints = dashboardFocusIndicatorHints(scope.id, { vimModeEnabled });
	const visibleHints = dashboardFocusIndicatorVisibleHintLabels(hints, {
		vimModeEnabled,
	});

	return (
		<div
			className={cn(
				"pointer-events-none fixed bottom-3 left-3 z-[890]",
				"flex max-w-[min(360px,calc(100vw-1.5rem))] items-center gap-2 rounded-md border border-border/75",
				"bg-background/88 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur",
			)}
			data-dashboard-focus-indicator="true"
			title={dashboardFocusIndicatorShortcutTitle(scope.description, {
				vimModeEnabled,
			})}
		>
			<span className="shrink-0 text-muted-foreground">Focus</span>
			<span className="h-3 w-px bg-border" />
			<span className="shrink-0 font-mono font-semibold text-foreground">
				{scope.label}
			</span>
			{visibleHints.length > 0 && (
				<span className="hidden min-w-0 truncate text-[11px] text-muted-foreground sm:inline">
					{visibleHints.join(" · ")}
				</span>
			)}
		</div>
	);
}
