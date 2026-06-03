import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	KeyboardSensor,
	MeasuringStrategy,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@superset/ui/input";
import { Switch } from "@superset/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { LuSearch, LuX } from "react-icons/lu";
import { V2AvailableBanner } from "renderer/components/V2AvailableBanner";
import { useHotkeyDisplay } from "renderer/hotkeys";
import {
	toggleDashboardVimMode,
	useDashboardVimModeStore,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { useDashboardSidebarState } from "renderer/routes/_authenticated/hooks/useDashboardSidebarState";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { useOpenNewWorkspaceModal } from "renderer/stores/new-workspace-modal";
import { DashboardSidebarHeader } from "./components/DashboardSidebarHeader";
import { DashboardSidebarHelpMenu } from "./components/DashboardSidebarHelpMenu";
import { DashboardSidebarHoverCardOverlay } from "./components/DashboardSidebarHoverCardOverlay";
import { DashboardSidebarPortsList } from "./components/DashboardSidebarPortsList";
import { DashboardSidebarProjectSection } from "./components/DashboardSidebarProjectSection";
import { DashboardSidebarSectionRenameProvider } from "./components/DashboardSidebarSectionRenameContext";
import { V2SetupScriptCard } from "./components/V2SetupScriptCard";
import { useDashboardSidebarData } from "./hooks/useDashboardSidebarData";
import {
	focusFirstDashboardSidebarItem,
	useDashboardSidebarKeyboardNavigation,
} from "./hooks/useDashboardSidebarKeyboardNavigation";
import { useDashboardSidebarShortcuts } from "./hooks/useDashboardSidebarShortcuts";
import { DashboardSidebarHoverProvider } from "./providers/DashboardSidebarHoverProvider";
import type { DashboardSidebarProject } from "./types";
import { filterDashboardSidebarProjects } from "./utils/filterDashboardSidebarProjects";

interface DashboardSidebarProps {
	isCollapsed?: boolean;
}

const EXTRA_NAV_STORAGE_KEY = "dashboard-sidebar-extra-nav-visible-v1";

function readExtraNavVisible(): boolean {
	if (typeof localStorage === "undefined") return false;

	try {
		return localStorage.getItem(EXTRA_NAV_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

function writeExtraNavVisible(isVisible: boolean) {
	if (typeof localStorage === "undefined") return;

	try {
		localStorage.setItem(EXTRA_NAV_STORAGE_KEY, String(isVisible));
	} catch {}
}

interface SortableProjectWrapperProps {
	project: DashboardSidebarProject;
	isCollapsed: boolean;
	isDraggingProject: boolean;
	workspaceShortcutLabels: Map<string, string>;
	onWorkspaceHover: (workspaceId: string) => void | Promise<void>;
	onToggleCollapse: (projectId: string) => void;
}

const SortableProjectWrapper = memo(function SortableProjectWrapper({
	project,
	isCollapsed,
	isDraggingProject,
	workspaceShortcutLabels,
	onWorkspaceHover,
	onToggleCollapse,
}: SortableProjectWrapperProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: project.id });

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Translate.toString(transform),
				transition,
				opacity: isDragging ? 0.5 : undefined,
			}}
		>
			<DashboardSidebarProjectSection
				project={project}
				isSidebarCollapsed={isCollapsed}
				isDraggingProject={isDraggingProject}
				workspaceShortcutLabels={workspaceShortcutLabels}
				onWorkspaceHover={onWorkspaceHover}
				onToggleCollapse={onToggleCollapse}
				dragHandleListeners={listeners}
				dragHandleAttributes={attributes}
			/>
		</div>
	);
});

export function DashboardSidebar({
	isCollapsed = false,
}: DashboardSidebarProps) {
	const { groups, refreshWorkspacePullRequest, toggleProjectCollapsed } =
		useDashboardSidebarData();
	const { reorderProjects } = useDashboardSidebarState();
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const settingsHotkey = useHotkeyDisplay("OPEN_SETTINGS").text;
	const vimModeHotkey = useHotkeyDisplay("TOGGLE_VIM_MODE").text;
	const vimModeEnabled = useDashboardVimModeStore((state) => state.enabled);
	const openNewWorkspaceModal = useOpenNewWorkspaceModal();
	const isSettingsOpen = !!matchRoute({ to: "/settings", fuzzy: true });
	const { activeHostUrl } = useLocalHostService();
	const v2RouteMatch = matchRoute({ to: "/v2-workspace/$workspaceId" });
	const activeV2WorkspaceId = v2RouteMatch ? v2RouteMatch.workspaceId : null;
	const [showExtraNav, setShowExtraNav] = useState(readExtraNavVisible);
	const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
	const sidebarRootRef = useRef<HTMLDivElement | null>(null);
	const sidebarSearchInputRef = useRef<HTMLInputElement | null>(null);
	const clearSidebarSearch = useCallback(() => setSidebarSearchQuery(""), []);
	const focusFirstSidebarItem = useCallback(() => {
		window.setTimeout(() => {
			focusFirstDashboardSidebarItem(sidebarRootRef.current);
		}, 0);
	}, []);
	const startSidebarTypeaheadSearch = useCallback(
		(seed: string) => setSidebarSearchQuery(seed),
		[],
	);
	useDashboardSidebarKeyboardNavigation(sidebarRootRef, {
		onClearSearch: clearSidebarSearch,
		onCreateWorkspace: openNewWorkspaceModal,
		onTypeaheadSearch: startSidebarTypeaheadSearch,
		searchInputRef: sidebarSearchInputRef,
	});

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 200, tolerance: 5 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const [activeProject, setActiveProject] =
		useState<DashboardSidebarProject | null>(null);

	const handleExtraNavChange = useCallback((isVisible: boolean) => {
		setShowExtraNav(isVisible);
		writeExtraNavVisible(isVisible);
	}, []);
	const handleToggleVimMode = useCallback(() => {
		toggleDashboardVimMode();
	}, []);

	// Local project order — syncs from groups, updated on drag end
	const [projectOrder, setProjectOrder] = useState(() =>
		groups.map((p) => p.id),
	);
	useEffect(() => {
		setProjectOrder(groups.map((p) => p.id));
	}, [groups]);

	const orderedGroups = useMemo(() => {
		const byId = new Map(groups.map((g) => [g.id, g]));
		return projectOrder
			.map((id) => byId.get(id))
			.filter((g): g is DashboardSidebarProject => g != null);
	}, [groups, projectOrder]);
	const filteredGroups = useMemo(
		() => filterDashboardSidebarProjects(orderedGroups, sidebarSearchQuery),
		[orderedGroups, sidebarSearchQuery],
	);
	const isSidebarSearchActive = sidebarSearchQuery.trim().length > 0;
	const visibleProjectOrder = useMemo(
		() =>
			isSidebarSearchActive
				? filteredGroups.map((project) => project.id)
				: projectOrder,
		[filteredGroups, isSidebarSearchActive, projectOrder],
	);

	const workspaceShortcutLabels = useDashboardSidebarShortcuts(orderedGroups);

	const activeV2Project = useMemo(() => {
		if (!activeV2WorkspaceId) return null;
		for (const project of groups) {
			for (const child of project.children) {
				if (
					child.type === "workspace" &&
					child.workspace.id === activeV2WorkspaceId
				) {
					return project;
				}
				if (child.type === "section") {
					for (const ws of child.section.workspaces) {
						if (ws.id === activeV2WorkspaceId) return project;
					}
				}
			}
		}
		return null;
	}, [groups, activeV2WorkspaceId]);

	const handleDragEnd = useCallback(
		({ active, over }: DragEndEvent) => {
			if (over && active.id !== over.id) {
				const oldIndex = projectOrder.indexOf(String(active.id));
				const newIndex = projectOrder.indexOf(String(over.id));
				if (oldIndex !== -1 && newIndex !== -1) {
					const reordered = arrayMove(projectOrder, oldIndex, newIndex);
					setProjectOrder(reordered);
					reorderProjects(reordered);
				}
			}
			setActiveProject(null);
		},
		[projectOrder, reorderProjects],
	);

	return (
		<DashboardSidebarSectionRenameProvider>
			<DashboardSidebarHoverProvider>
				<DashboardSidebarHoverCardOverlay>
					<div
						ref={sidebarRootRef}
						data-dashboard-sidebar-root="true"
						className={cn(
							"flex h-full min-h-0 flex-col border-r border-border bg-muted/45 dark:bg-muted/35",
							"[&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-primary/70 [&_button:focus-visible]:ring-offset-1 [&_button:focus-visible]:ring-offset-background",
							"[&_[role=button]:focus-visible]:outline-none [&_[role=button]:focus-visible]:ring-2 [&_[role=button]:focus-visible]:ring-primary/70 [&_[role=button]:focus-visible]:ring-offset-1 [&_[role=button]:focus-visible]:ring-offset-background",
							"[&_button:focus-visible]:bg-primary/10 [&_button:focus-visible]:text-foreground [&_[role=button]:focus-visible]:bg-primary/10 [&_[role=button]:focus-visible]:text-foreground",
							"[&_[data-dashboard-sidebar-keyboard-focus=true]:focus]:outline-none [&_[data-dashboard-sidebar-keyboard-focus=true]:focus]:ring-2 [&_[data-dashboard-sidebar-keyboard-focus=true]:focus]:ring-primary/80 [&_[data-dashboard-sidebar-keyboard-focus=true]:focus]:ring-offset-1 [&_[data-dashboard-sidebar-keyboard-focus=true]:focus]:ring-offset-background",
							"[&_[data-dashboard-sidebar-keyboard-focus=true]:focus]:bg-primary/10 [&_[data-dashboard-sidebar-keyboard-focus=true]:focus]:text-foreground",
						)}
					>
						<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
							<DashboardSidebarHeader
								isCollapsed={isCollapsed}
								searchQuery={sidebarSearchQuery}
								showExtraNav={showExtraNav}
							/>
							{!isCollapsed && (
								<div className="px-2 pb-2">
									<div
										className={cn(
											"group flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/45 px-2 text-muted-foreground transition-colors",
											"focus-within:border-primary/45 focus-within:bg-background/80 focus-within:text-foreground",
										)}
									>
										<LuSearch className="size-3.5 shrink-0" />
										<Input
											ref={sidebarSearchInputRef}
											data-dashboard-sidebar-search-input="true"
											value={sidebarSearchQuery}
											onChange={(event) =>
												setSidebarSearchQuery(event.target.value)
											}
											onKeyDown={(event) => {
												if (event.key !== "Escape") return;
												event.preventDefault();
												if (sidebarSearchQuery.length > 0) {
													setSidebarSearchQuery("");
												}
												focusFirstSidebarItem();
											}}
											placeholder="Search sidebar"
											variant="ghost"
											className="h-7 flex-1 px-0 py-0 text-xs placeholder:text-muted-foreground/65 focus-visible:ring-0"
										/>
										{sidebarSearchQuery.length > 0 ? (
											<button
												type="button"
												aria-label="Clear sidebar search"
												onClick={clearSidebarSearch}
												className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
											>
												<LuX className="size-3.5" />
											</button>
										) : (
											<span className="shrink-0 rounded border border-border/70 px-1 font-mono text-[10px] leading-4 text-muted-foreground/60">
												/
											</span>
										)}
									</div>
								</div>
							)}

							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								measuring={{
									droppable: { strategy: MeasuringStrategy.Always },
								}}
								onDragStart={({ active }) => {
									const project = groups.find((p) => p.id === active.id);
									setActiveProject(project ?? null);
								}}
								onDragEnd={handleDragEnd}
								onDragCancel={() => setActiveProject(null)}
							>
								<SortableContext
									items={visibleProjectOrder}
									strategy={verticalListSortingStrategy}
								>
									{filteredGroups.map((project) => (
										<SortableProjectWrapper
											key={project.id}
											project={project}
											isCollapsed={isCollapsed}
											isDraggingProject={activeProject != null}
											workspaceShortcutLabels={workspaceShortcutLabels}
											onWorkspaceHover={refreshWorkspacePullRequest}
											onToggleCollapse={toggleProjectCollapsed}
										/>
									))}
								</SortableContext>
								{isSidebarSearchActive && filteredGroups.length === 0 && (
									<div className="px-3 py-8 text-center text-xs text-muted-foreground">
										No sidebar matches
									</div>
								)}

								{createPortal(
									<DragOverlay dropAnimation={null}>
										{activeProject && (
											<div className="bg-background shadow-lg border-b border-border">
												<DashboardSidebarProjectSection
													project={activeProject}
													isSidebarCollapsed={isCollapsed}
													isDraggingProject
													workspaceShortcutLabels={workspaceShortcutLabels}
													onWorkspaceHover={() => {}}
													onToggleCollapse={() => {}}
												/>
											</div>
										)}
									</DragOverlay>,
									document.body,
								)}
							</DndContext>
						</div>
						{!isCollapsed && <DashboardSidebarPortsList />}
						{!isCollapsed && activeV2Project && activeHostUrl && (
							<V2SetupScriptCard
								hostUrl={activeHostUrl}
								projectId={activeV2Project.id}
								projectName={activeV2Project.name}
							/>
						)}
						{!isCollapsed && <V2AvailableBanner />}
						<div
							className={cn(
								"border-t border-border",
								isCollapsed
									? "flex flex-col items-center gap-1 py-1"
									: "flex items-center gap-1 px-2 py-1",
							)}
						>
							{isCollapsed ? (
								<>
									<Tooltip delayDuration={300}>
										<TooltipTrigger asChild>
											<Switch
												checked={showExtraNav}
												onCheckedChange={handleExtraNavChange}
												aria-label="Show extra sidebar items"
											/>
										</TooltipTrigger>
										<TooltipContent side="right">Extra</TooltipContent>
									</Tooltip>

									<Tooltip delayDuration={300}>
										<TooltipTrigger asChild>
											<button
												type="button"
												aria-label="Toggle Vim mode"
												onClick={handleToggleVimMode}
												className={cn(
													"flex size-8 items-center justify-center rounded-md font-mono text-[11px] transition-colors",
													vimModeEnabled
														? "bg-primary/15 text-primary"
														: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
												)}
											>
												V
											</button>
										</TooltipTrigger>
										<TooltipContent side="right">
											Vim mode {vimModeEnabled ? "on" : "off"}
										</TooltipContent>
									</Tooltip>

									<Tooltip delayDuration={300}>
										<TooltipTrigger asChild>
											<button
												type="button"
												aria-label="Settings"
												onClick={() => navigate({ to: "/settings/account" })}
												className={cn(
													"flex size-8 items-center justify-center rounded-md transition-colors",
													isSettingsOpen
														? "bg-accent text-foreground"
														: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
												)}
											>
												<HiOutlineCog6Tooth className="size-4" />
											</button>
										</TooltipTrigger>
										<TooltipContent side="right">Settings</TooltipContent>
									</Tooltip>
								</>
							) : (
								<>
									<button
										type="button"
										onClick={handleToggleVimMode}
										className={cn(
											"group flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
											vimModeEnabled
												? "bg-primary/10 text-primary hover:bg-primary/15"
												: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
										)}
										aria-pressed={vimModeEnabled}
										aria-label="Toggle Vim mode"
									>
										<span className="font-mono">Vim</span>
										<span className="rounded border border-border/80 px-1 font-mono text-[10px] text-muted-foreground">
											{vimModeHotkey}
										</span>
									</button>

									<div className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted-foreground">
										<span className="min-w-0 flex-1 truncate">Extra</span>
										<Switch
											checked={showExtraNav}
											onCheckedChange={handleExtraNavChange}
											aria-label="Show extra sidebar items"
										/>
									</div>

									<button
										type="button"
										onClick={() => navigate({ to: "/settings/account" })}
										className={cn(
											"group flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
											isSettingsOpen
												? "bg-accent text-foreground"
												: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
										)}
									>
										<HiOutlineCog6Tooth className="size-4 shrink-0" />
										<span className="flex-1 text-left">Settings</span>
										{settingsHotkey !== "Unassigned" && (
											<span
												className={cn(
													"shrink-0 text-[10px] font-mono tabular-nums text-muted-foreground/60",
													"opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
												)}
											>
												{settingsHotkey}
											</span>
										)}
									</button>
								</>
							)}

							<DashboardSidebarHelpMenu isCollapsed={isCollapsed} />
						</div>
					</div>
				</DashboardSidebarHoverCardOverlay>
			</DashboardSidebarHoverProvider>
		</DashboardSidebarSectionRenameProvider>
	);
}
