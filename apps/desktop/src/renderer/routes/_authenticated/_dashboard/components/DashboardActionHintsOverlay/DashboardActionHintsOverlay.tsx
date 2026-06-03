import { useEffect, useRef, useState } from "react";
import {
	activateDashboardActionHintTarget,
	collectDashboardActionHintTargets,
	DASHBOARD_ACTION_HINTS_OPEN_EVENT,
	type DashboardActionHintTarget,
	dashboardActionHintKeyFromInput,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-action-hints";
import {
	dashboardVimKey,
	shouldHandleDashboardVimKey,
	useDashboardVimModeStore,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";

interface ActiveHints {
	prefix: string;
	targets: DashboardActionHintTarget[];
}

function consume(event: KeyboardEvent): void {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
}

export function DashboardActionHintsOverlay() {
	const vimModeEnabled = useDashboardVimModeStore((state) => state.enabled);
	const [activeHints, setActiveHints] = useState<ActiveHints | null>(null);
	const activeHintsRef = useRef<ActiveHints | null>(null);

	useEffect(() => {
		activeHintsRef.current = activeHints;
	}, [activeHints]);

	useEffect(() => {
		const openActionHints = () => {
			const root = document.querySelector<HTMLElement>(
				"[data-dashboard-action-hints-root]",
			);
			const targets = collectDashboardActionHintTargets(root ?? document.body);
			if (targets.length === 0) return;
			setActiveHints({ prefix: "", targets });
		};
		const closeActionHints = () => setActiveHints(null);

		const handleKeyDown = (event: KeyboardEvent) => {
			const currentHints = activeHintsRef.current;

			if (currentHints) {
				const key = dashboardActionHintKeyFromInput(event);
				if (!key) return;
				consume(event);
				if (key === "escape") {
					setActiveHints(null);
					return;
				}

				const nextPrefix = `${currentHints.prefix}${key}`;
				const exactTarget = currentHints.targets.find(
					(target) => target.label === nextPrefix,
				);
				if (exactTarget) {
					setActiveHints(null);
					activateDashboardActionHintTarget(exactTarget.element);
					return;
				}

				const hasPartialMatch = currentHints.targets.some((target) =>
					target.label.startsWith(nextPrefix),
				);
				setActiveHints(
					hasPartialMatch ? { ...currentHints, prefix: nextPrefix } : null,
				);
				return;
			}

			if (!vimModeEnabled || !shouldHandleDashboardVimKey(event)) return;
			if (dashboardVimKey(event) !== "f") return;

			consume(event);
			openActionHints();
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		window.addEventListener(DASHBOARD_ACTION_HINTS_OPEN_EVENT, openActionHints);
		window.addEventListener("scroll", closeActionHints, true);
		window.addEventListener("resize", closeActionHints, true);
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
			window.removeEventListener(
				DASHBOARD_ACTION_HINTS_OPEN_EVENT,
				openActionHints,
			);
			window.removeEventListener("scroll", closeActionHints, true);
			window.removeEventListener("resize", closeActionHints, true);
		};
	}, [vimModeEnabled]);

	if (!activeHints) return null;

	const matchedLabels = new Set(
		activeHints.targets
			.filter((target) => target.label.startsWith(activeHints.prefix))
			.map((target) => target.label),
	);

	return (
		<div
			data-dashboard-action-hints-overlay="true"
			className="pointer-events-none fixed inset-0 z-[1000]"
		>
			{activeHints.targets.map((target) => (
				<div
					key={target.label}
					title={target.title}
					className="absolute rounded border border-primary/70 bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-primary-foreground shadow-lg"
					style={{
						left: Math.max(4, target.rect.left),
						opacity: matchedLabels.has(target.label) ? 1 : 0.25,
						top: Math.max(4, target.rect.top),
					}}
				>
					{target.label}
				</div>
			))}
		</div>
	);
}
