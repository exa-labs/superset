import { eq } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import {
	createFileRoute,
	Outlet,
	useMatchRoute,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useIsV2CloudEnabled } from "renderer/hooks/useIsV2CloudEnabled";
import { useHotkey } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT } from "renderer/lib/terminal/terminal-dashboard-events";
import { DashboardActionHintsOverlay } from "renderer/routes/_authenticated/_dashboard/components/DashboardActionHintsOverlay";
import { DashboardFocusIndicator } from "renderer/routes/_authenticated/_dashboard/components/DashboardFocusIndicator";
import { DashboardKeyboardShortcutsDialog } from "renderer/routes/_authenticated/_dashboard/components/DashboardKeyboardShortcutsDialog";
import { DashboardMruSwitcherOverlay } from "renderer/routes/_authenticated/_dashboard/components/DashboardMruSwitcherOverlay";
import { DashboardSidebar } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar";
import { DashboardSidebarDeleteDialog } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarDeleteDialog";
import { DashboardVimModeIndicator } from "renderer/routes/_authenticated/_dashboard/components/DashboardVimModeIndicator";
import {
	handleDashboardGlobalKeyboardAction,
	shouldFocusDashboardShellFromEscapeKey,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-global-keyboard-action";
import {
	DASHBOARD_KEYBOARD_HELP_OPEN_EVENT,
	shouldOpenDashboardKeyboardHelpFromQuestionKey,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import { toggleDashboardNavigationSidebar } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-navigation-sidebar-toggle";
import { scheduleDashboardNavigationShellFocus } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-shell-focus";
import {
	DASHBOARD_VIEW_MRU_SWITCH_TTL_MS,
	type DashboardViewMruDirection,
	type DashboardViewMruEntry,
	dashboardViewMruSwitchTarget,
	readDashboardViewMruEntries,
	recordDashboardViewMruPath,
	resolveDashboardViewMruPathname,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-view-mru";
import { dashboardViewMruRegistryLabelResolver } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-view-mru-labels";
import { useDashboardSidebarState } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState";
import { useDevSeedV2Sidebar } from "renderer/routes/_authenticated/hooks/useDevSeedV2Sidebar";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import { ResizablePanel } from "renderer/screens/main/components/ResizablePanel";
import { WorkspaceSidebar } from "renderer/screens/main/components/WorkspaceSidebar";
import { DeleteWorkspaceDialog } from "renderer/screens/main/components/WorkspaceSidebar/WorkspaceListItem/components";
import { useOpenNewWorkspaceModal } from "renderer/stores/new-workspace-modal";
import {
	COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
	DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
	MAX_WORKSPACE_SIDEBAR_WIDTH,
	useWorkspaceSidebarStore,
} from "renderer/stores/workspace-sidebar-state";
import {
	getDashboardHashPathname,
	subscribeDashboardHashPathname,
} from "../lib/dashboardHashPathname";
import { AddRepositoryModals } from "./components/AddRepositoryModals";
import { CrossVersionMismatchState } from "./components/CrossVersionMismatchState";
import { TopBar } from "./components/TopBar";

export const Route = createFileRoute("/_authenticated/_dashboard")({
	component: DashboardLayout,
});

type DeleteTarget =
	| {
			version: "v1";
			workspaceId: string;
			workspaceName: string;
			workspaceType: "worktree" | "branch";
	  }
	| {
			version: "v2";
			workspaceId: string;
			workspaceName: string;
			open: boolean;
	  };

interface DashboardMruSwitcherState {
	activeIndex: number;
	direction: DashboardViewMruDirection;
	entries: DashboardViewMruEntry[];
}

interface ActiveDashboardMruSwitch {
	activeIndex: number;
	entries: DashboardViewMruEntry[];
	timeoutId: number | null;
}

function DashboardLayout() {
	const navigate = useNavigate();
	const openNewWorkspaceModal = useOpenNewWorkspaceModal();
	const isV2CloudEnabled = useIsV2CloudEnabled();
	const collections = useCollections();
	const { removeWorkspaceFromSidebar } = useDashboardSidebarState();
	const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
	const [mruSwitcherState, setMruSwitcherState] =
		useState<DashboardMruSwitcherState | null>(null);
	const latestMruPathRef = useRef<string | null>(null);
	const activeMruSwitchRef = useRef<ActiveDashboardMruSwitch | null>(null);
	useDevSeedV2Sidebar();
	// Get current workspace from route to pre-select project in new workspace modal
	const matchRoute = useMatchRoute();
	const currentPathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const currentWorkspaceMatch = matchRoute({
		to: "/workspace/$workspaceId",
		fuzzy: true,
	});
	const currentWorkspaceId =
		currentWorkspaceMatch !== false ? currentWorkspaceMatch.workspaceId : null;
	const v2WorkspaceMatch = matchRoute({
		to: "/v2-workspace/$workspaceId",
		fuzzy: true,
	});
	const currentV2WorkspaceId =
		v2WorkspaceMatch !== false ? v2WorkspaceMatch.workspaceId : null;
	const onV1WorkspaceRoute =
		currentPathname === "/workspace" ||
		currentPathname.startsWith("/workspace/");
	const onV2WorkspaceRoute =
		currentPathname === "/v2-workspace" ||
		currentPathname.startsWith("/v2-workspace/");
	const versionMismatch =
		(isV2CloudEnabled && onV1WorkspaceRoute) ||
		(!isV2CloudEnabled && onV2WorkspaceRoute);

	useEffect(() => {
		const recordCurrentMruPath = () => {
			const mruPath = resolveDashboardViewMruPathname({
				hashPathname: getDashboardHashPathname(),
				locationPathname: currentPathname,
			});
			latestMruPathRef.current = mruPath;
			if (!activeMruSwitchRef.current) {
				recordDashboardViewMruPath(mruPath);
			}
		};

		recordCurrentMruPath();
		return subscribeDashboardHashPathname(recordCurrentMruPath);
	}, [currentPathname]);

	useEffect(() => {
		return () => {
			const activeSwitch = activeMruSwitchRef.current;
			if (activeSwitch?.timeoutId != null) {
				window.clearTimeout(activeSwitch.timeoutId);
			}
		};
	}, []);

	useEffect(() => {
		const finishMruSwitch = () => {
			const latestMruPath = latestMruPathRef.current;
			activeMruSwitchRef.current = null;
			setMruSwitcherState(null);
			if (latestMruPath) {
				recordDashboardViewMruPath(latestMruPath);
			}
		};

		const handleMruSwitch = (event: Event) => {
			if (event.defaultPrevented) return;
			const detail = (event as CustomEvent<{ direction?: unknown }>).detail;
			const direction = detail?.direction === "previous" ? "previous" : "next";
			const activeSwitch = activeMruSwitchRef.current;
			const entries = activeSwitch?.entries ?? readDashboardViewMruEntries();
			const target = dashboardViewMruSwitchTarget({
				activeIndex: activeSwitch?.activeIndex ?? null,
				currentPathname: latestMruPathRef.current ?? currentPathname,
				direction,
				entries,
			});
			if (!target) return;

			event.preventDefault();
			if (activeSwitch?.timeoutId != null) {
				window.clearTimeout(activeSwitch.timeoutId);
			}

			const timeoutId = window.setTimeout(
				finishMruSwitch,
				DASHBOARD_VIEW_MRU_SWITCH_TTL_MS,
			);
			activeMruSwitchRef.current = {
				activeIndex: target.index,
				entries,
				timeoutId,
			};
			setMruSwitcherState({
				activeIndex: target.index,
				direction,
				entries,
			});
			void navigate({ to: target.path });
			scheduleDashboardNavigationShellFocus();
		};

		window.addEventListener("dashboard-view-mru-switch", handleMruSwitch);
		return () => {
			window.removeEventListener("dashboard-view-mru-switch", handleMruSwitch);
		};
	}, [currentPathname, navigate]);

	const { data: currentWorkspace } = electronTrpc.workspaces.get.useQuery(
		{ id: currentWorkspaceId ?? "" },
		{ enabled: !!currentWorkspaceId },
	);

	const { data: currentV2Workspaces = [] } = useLiveQuery(
		(q) =>
			q
				.from({ workspaces: collections.v2Workspaces })
				.where(({ workspaces }) =>
					eq(workspaces.id, currentV2WorkspaceId ?? ""),
				),
		[collections, currentV2WorkspaceId],
	);
	const currentV2Workspace =
		currentV2WorkspaceId != null ? (currentV2Workspaces[0] ?? null) : null;

	const {
		isOpen: isWorkspaceSidebarOpen,
		width: workspaceSidebarWidth,
		setWidth: setWorkspaceSidebarWidth,
		isResizing: isWorkspaceSidebarResizing,
		setIsResizing: setWorkspaceSidebarIsResizing,
		isCollapsed: isWorkspaceSidebarCollapsed,
	} = useWorkspaceSidebarStore();

	// Global hotkeys for dashboard
	useHotkey("OPEN_SETTINGS", () => navigate({ to: "/settings/account" }));
	useHotkey("SHOW_HOTKEYS", () => setKeyboardHelpOpen(true));
	useHotkey("TOGGLE_WORKSPACE_SIDEBAR", toggleDashboardNavigationSidebar);
	useHotkey("NEW_WORKSPACE", () =>
		openNewWorkspaceModal(currentWorkspace?.projectId),
	);

	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

	useEffect(() => {
		const handleOpenKeyboardHelp = (event: Event) => {
			event.preventDefault();
			setKeyboardHelpOpen(true);
		};
		const handleTerminalFocusDashboardShell = (event: Event) => {
			event.preventDefault();
			handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL");
		};
		const handleQuestionKeyKeyboardHelp = (event: KeyboardEvent) => {
			if (!shouldOpenDashboardKeyboardHelpFromQuestionKey(event)) return;
			event.preventDefault();
			event.stopPropagation();
			setKeyboardHelpOpen(true);
		};
		const handleEscapeFocusDashboardShell = (event: KeyboardEvent) => {
			if (!shouldFocusDashboardShellFromEscapeKey(event)) return;
			event.preventDefault();
			event.stopPropagation();
			handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL");
		};

		window.addEventListener(
			DASHBOARD_KEYBOARD_HELP_OPEN_EVENT,
			handleOpenKeyboardHelp,
		);
		window.addEventListener(
			TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT,
			handleTerminalFocusDashboardShell,
		);
		window.addEventListener("keydown", handleEscapeFocusDashboardShell, true);
		window.addEventListener("keydown", handleQuestionKeyKeyboardHelp, true);
		return () => {
			window.removeEventListener(
				DASHBOARD_KEYBOARD_HELP_OPEN_EVENT,
				handleOpenKeyboardHelp,
			);
			window.removeEventListener(
				TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT,
				handleTerminalFocusDashboardShell,
			);
			window.removeEventListener(
				"keydown",
				handleEscapeFocusDashboardShell,
				true,
			);
			window.removeEventListener(
				"keydown",
				handleQuestionKeyKeyboardHelp,
				true,
			);
		};
	}, []);

	useHotkey(
		"CLOSE_WORKSPACE",
		() => {
			if (currentWorkspaceId && currentWorkspace) {
				setDeleteTarget({
					workspaceId: currentWorkspaceId,
					workspaceName: currentWorkspace.name,
					workspaceType: currentWorkspace.type,
					version: "v1",
				});
				return;
			}

			if (
				currentV2WorkspaceId &&
				currentV2Workspace &&
				currentV2Workspace.type !== "main"
			) {
				setDeleteTarget({
					workspaceId: currentV2WorkspaceId,
					workspaceName: currentV2Workspace.name || currentV2Workspace.branch,
					version: "v2",
					open: true,
				});
			}
		},
		{
			enabled:
				(!!currentWorkspaceId && !!currentWorkspace) ||
				(!!currentV2WorkspaceId &&
					!!currentV2Workspace &&
					currentV2Workspace.type !== "main"),
		},
	);

	const sidebarPanel = isWorkspaceSidebarOpen && (
		<ResizablePanel
			width={workspaceSidebarWidth}
			onWidthChange={setWorkspaceSidebarWidth}
			isResizing={isWorkspaceSidebarResizing}
			onResizingChange={setWorkspaceSidebarIsResizing}
			minWidth={COLLAPSED_WORKSPACE_SIDEBAR_WIDTH}
			maxWidth={MAX_WORKSPACE_SIDEBAR_WIDTH}
			handleSide="right"
			clampWidth={false}
			onDoubleClickHandle={() =>
				setWorkspaceSidebarWidth(DEFAULT_WORKSPACE_SIDEBAR_WIDTH)
			}
		>
			{isV2CloudEnabled ? (
				<DashboardSidebar isCollapsed={isWorkspaceSidebarCollapsed()} />
			) : (
				<WorkspaceSidebar
					isCollapsed={isWorkspaceSidebarCollapsed()}
					activeProjectId={currentWorkspace?.projectId ?? null}
					activeProjectName={currentWorkspace?.project?.name ?? null}
				/>
			)}
		</ResizablePanel>
	);

	// Only lift the sidebar out of the TopBar column when v2 + expanded.
	// Collapsed/closed sidebars stay inside so the TopBar runs full-width.
	const sidebarOutsideColumn =
		isV2CloudEnabled &&
		isWorkspaceSidebarOpen &&
		!isWorkspaceSidebarCollapsed();

	return (
		<div
			data-dashboard-action-hints-root="true"
			className="flex h-full w-full overflow-hidden"
		>
			{sidebarOutsideColumn && sidebarPanel}
			<div className="flex flex-1 flex-col min-w-0 min-h-0">
				<TopBar />
				<div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
					{!sidebarOutsideColumn && sidebarPanel}
					<div
						data-dashboard-web-view-deck-anchor=""
						className="relative flex flex-1 min-h-0 min-w-0"
					>
						{versionMismatch ? <CrossVersionMismatchState /> : <Outlet />}
					</div>
				</div>
			</div>
			<div id="workspace-right-sidebar-slot" className="flex h-full shrink-0" />
			<AddRepositoryModals />
			<DashboardKeyboardShortcutsDialog
				open={keyboardHelpOpen}
				onOpenChange={setKeyboardHelpOpen}
			/>
			{mruSwitcherState && (
				<DashboardMruSwitcherOverlay
					activeIndex={mruSwitcherState.activeIndex}
					direction={mruSwitcherState.direction}
					entries={mruSwitcherState.entries}
					labelResolver={dashboardViewMruRegistryLabelResolver}
				/>
			)}
			<DashboardFocusIndicator />
			<DashboardVimModeIndicator />
			<DashboardActionHintsOverlay />
			{deleteTarget?.version === "v1" && (
				<DeleteWorkspaceDialog
					workspaceId={deleteTarget.workspaceId}
					workspaceName={deleteTarget.workspaceName}
					workspaceType={deleteTarget.workspaceType}
					open={true}
					onOpenChange={(open) => {
						if (!open) setDeleteTarget(null);
					}}
				/>
			)}
			{deleteTarget?.version === "v2" && (
				<DashboardSidebarDeleteDialog
					workspaceId={deleteTarget.workspaceId}
					workspaceName={deleteTarget.workspaceName}
					open={deleteTarget.open}
					onOpenChange={(open) => {
						setDeleteTarget((target) =>
							target?.version === "v2" ? { ...target, open } : target,
						);
					}}
					onDeleted={() => {
						removeWorkspaceFromSidebar(deleteTarget.workspaceId);
						setDeleteTarget(null);
					}}
				/>
			)}
		</div>
	);
}
