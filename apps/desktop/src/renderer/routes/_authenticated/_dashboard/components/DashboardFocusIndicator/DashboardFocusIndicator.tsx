import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { cn } from "@superset/ui/utils";
import { useEffect, useState } from "react";
import {
	type DashboardFocusScope,
	type DashboardFocusScopeId,
	dashboardFocusScopeForDocument,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-focus-scope";

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["Option", "K"],
	browser: ["Option", "K"],
	"command-palette": ["Enter", "Esc"],
	editor: ["Esc", "Option", "K"],
	"keyboard-help": ["?", "Esc"],
	"native-agent": ["r", "o", "b"],
	sidebar: ["↑↓", "Enter"],
	terminal: ["Option", "K"],
};

function currentDashboardFocusScope(): DashboardFocusScope {
	if (typeof document === "undefined") {
		return dashboardFocusScopeForDocument(null);
	}
	return dashboardFocusScopeForDocument(document);
}

export function DashboardFocusIndicator() {
	const [scope, setScope] = useState(currentDashboardFocusScope);

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

	const hints = HINTS_BY_SCOPE[scope.id];

	return (
		<div
			className={cn(
				"pointer-events-none fixed bottom-3 left-3 z-[890]",
				"flex items-center gap-2 rounded-md border border-border/75",
				"bg-background/88 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur",
			)}
			data-dashboard-focus-indicator="true"
			title={`${scope.description}. Press ? for keyboard shortcuts.`}
		>
			<span className="text-muted-foreground">Focus</span>
			<span className="h-3 w-px bg-border" />
			<span className="font-mono font-semibold text-foreground">
				{scope.label}
			</span>
			<KbdGroup>
				{hints.map((hint) => (
					<Kbd key={hint}>{hint}</Kbd>
				))}
			</KbdGroup>
		</div>
	);
}
