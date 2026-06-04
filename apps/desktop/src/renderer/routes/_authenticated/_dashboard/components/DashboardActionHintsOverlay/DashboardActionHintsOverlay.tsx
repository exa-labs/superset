import { useEffect, useRef, useState } from "react";
import {
	activateDashboardActionHintTarget,
	collectDashboardActionHintTargets,
	DASHBOARD_ACTION_HINTS_OPEN_EVENT,
	type DashboardActionHintTarget,
	dashboardActionHintDisplayTitle,
	dashboardActionHintKeyFromInput,
	dashboardActionHintRootForElement,
	dashboardActionHintSidebarScopeForTargets,
	dashboardActionHintTargetHasPrefix,
	dashboardActionHintTargetMatchesInput,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-action-hints";
import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import {
	dashboardVimGlobalActionFromKey,
	dashboardVimKey,
	shouldHandleDashboardVimKey,
	useDashboardVimModeStore,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";

interface ActiveHints {
	prefix: string;
	targets: DashboardActionHintTarget[];
}

interface ActionHintsPanelProps {
	activeHints: ActiveHints;
	title: string;
}

function consume(event: KeyboardEvent): void {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
}

function sidebarPanelPosition(scope: HTMLElement): {
	left: number;
	maxHeight: number;
	top: number;
} {
	const rect = scope.getBoundingClientRect();
	const viewportWidth =
		typeof window === "undefined" ? rect.right + 228 : window.innerWidth;
	const viewportHeight =
		typeof window === "undefined" ? rect.top + 180 : window.innerHeight;
	const width = 260;
	const isNativeScope = scope.matches("[data-native-agent-view-root]");
	const preferredLeft = isNativeScope
		? rect.right - width - 12
		: rect.right + 8;
	const left = Math.min(
		Math.max(8, preferredLeft),
		Math.max(8, viewportWidth - width - 8),
	);
	const top = Math.min(
		Math.max(8, rect.top + (isNativeScope ? 12 : 0)),
		Math.max(8, viewportHeight - 180),
	);
	return {
		left,
		maxHeight: Math.max(96, viewportHeight - top - 12),
		top,
	};
}

function ActionHintsPanel({ activeHints, title }: ActionHintsPanelProps) {
	const matchedLabels = new Set(
		activeHints.targets
			.filter((target) =>
				dashboardActionHintTargetHasPrefix(target, activeHints.prefix),
			)
			.map((target) => target.label),
	);

	return (
		<div className="flex min-h-0 flex-col gap-1">
			<div className="mb-1.5 flex items-center justify-between gap-2 px-1">
				<div className="min-w-0">
					<div className="text-[11px] font-semibold text-foreground">
						{title}
					</div>
					<div className="truncate text-[10px] text-muted-foreground">
						Type a key to run an action. Esc closes.
					</div>
				</div>
				{activeHints.prefix && (
					<kbd className="shrink-0 rounded border border-border/80 bg-muted px-1.5 py-1 font-mono text-[10px] font-semibold leading-none text-foreground">
						{activeHints.prefix}
					</kbd>
				)}
			</div>
			<div className="grid min-h-0 gap-1 overflow-y-auto">
				{activeHints.targets.map((target) => (
					<div
						key={target.label}
						title={target.title}
						className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-2 rounded px-1 py-0.5 text-muted-foreground transition-opacity"
						style={{
							opacity: matchedLabels.has(target.label) ? 1 : 0.32,
						}}
					>
						<kbd className="flex h-5 min-w-5 items-center justify-center rounded border border-border/80 bg-muted/70 px-1 font-mono text-[10px] font-semibold leading-none text-foreground shadow-sm">
							{target.displayLabel}
						</kbd>
						<span className="truncate text-[11px] leading-4 text-foreground/90">
							{dashboardActionHintDisplayTitle(target)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
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
			const activeElement =
				document.activeElement instanceof Element
					? document.activeElement
					: null;
			const targetRoot = dashboardActionHintRootForElement(
				activeElement,
				root ?? document.body,
			);
			if (!targetRoot) return;
			const targets = collectDashboardActionHintTargets(targetRoot);
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
				const exactTarget = currentHints.targets.find((target) =>
					dashboardActionHintTargetMatchesInput(target, nextPrefix),
				);
				if (exactTarget) {
					setActiveHints(null);
					activateDashboardActionHintTarget(exactTarget.element);
					return;
				}

				const hasPartialMatch = currentHints.targets.some((target) =>
					dashboardActionHintTargetHasPrefix(target, nextPrefix),
				);
				setActiveHints(
					hasPartialMatch ? { ...currentHints, prefix: nextPrefix } : null,
				);
				return;
			}

			if (!vimModeEnabled || !shouldHandleDashboardVimKey(event)) return;
			const action = dashboardVimGlobalActionFromKey(dashboardVimKey(event));

			if (action === "show-keyboard-help") {
				consume(event);
				openDashboardKeyboardHelp();
				return;
			}

			if (action !== "show-action-hints") return;

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

	const sidebarScope = dashboardActionHintSidebarScopeForTargets(
		activeHints.targets,
	);

	if (sidebarScope) {
		const position = sidebarPanelPosition(sidebarScope);
		const isNativeScope = sidebarScope.matches("[data-native-agent-view-root]");

		return (
			<div
				data-dashboard-action-hints-overlay="true"
				className="pointer-events-none fixed inset-0 z-[1000]"
			>
				<div
					data-dashboard-sidebar-action-hints-panel="true"
					className="absolute flex w-[260px] flex-col overflow-hidden rounded-md border border-border/85 bg-background/95 p-2 text-[11px] shadow-2xl backdrop-blur"
					style={{
						left: position.left,
						maxHeight: position.maxHeight,
						top: position.top,
					}}
				>
					<ActionHintsPanel
						activeHints={activeHints}
						title={isNativeScope ? "Session actions" : "Row actions"}
					/>
				</div>
			</div>
		);
	}

	return (
		<div
			data-dashboard-action-hints-overlay="true"
			className="pointer-events-none fixed inset-0 z-[1000]"
		>
			<div className="absolute top-14 right-3 flex max-h-[min(560px,calc(100vh-5rem))] w-[300px] flex-col overflow-hidden rounded-md border border-border/85 bg-background/95 p-2 text-[11px] shadow-2xl backdrop-blur">
				<ActionHintsPanel activeHints={activeHints} title="Visible actions" />
			</div>
		</div>
	);
}
