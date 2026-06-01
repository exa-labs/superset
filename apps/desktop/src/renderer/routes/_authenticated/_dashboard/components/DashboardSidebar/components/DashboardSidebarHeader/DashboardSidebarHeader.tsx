import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { toast } from "@superset/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { HiMiniPlus, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import {
	LuClock,
	LuFolderInput,
	LuFolderPlus,
	LuLayers,
	LuPlus,
} from "react-icons/lu";
import { GATED_FEATURES, usePaywall } from "renderer/components/Paywall";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { persistentHistory } from "renderer/lib/persistent-hash-history";
import { useFolderFirstImport } from "renderer/routes/_authenticated/_dashboard/components/AddRepositoryModals/hooks/useFolderFirstImport";
import { NavigationControls } from "renderer/routes/_authenticated/_dashboard/components/NavigationControls";
import { SidebarToggle } from "renderer/routes/_authenticated/_dashboard/components/SidebarToggle";
import { ResourceConsumption } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption";
import {
	tasksSearchFromFilters,
	useTasksFilterStore,
} from "renderer/routes/_authenticated/_dashboard/tasks/stores/tasks-filter-state";
import {
	type DashboardSidebarNavigationIntent,
	dashboardSidebarNavigationIntentPath,
	resolveDashboardSidebarNavigationIntent,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-navigation-intent";
import {
	closeDashboardWebTab,
	createDashboardWebTab,
	type DashboardWebTabAppId,
	getFirstDashboardWebTabForApp,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import { getDashboardHashPathname } from "renderer/routes/_authenticated/lib/dashboardHashPathname";
import { STROKE_WIDTH_THICK } from "renderer/screens/main/components/WorkspaceSidebar/constants";
import { useOpenNewProjectModal } from "renderer/stores/add-repository-modal";
import { useOpenNewWorkspaceModal } from "renderer/stores/new-workspace-modal";
import { DashboardNativeAgentsSection } from "./components/DashboardNativeAgentsSection";
import { DashboardWebPagesGrid } from "./components/DashboardWebPagesGrid";
import { DashboardWebTabsSection } from "./components/DashboardWebTabsSection";

interface DashboardSidebarHeaderProps {
	isCollapsed?: boolean;
	showExtraNav?: boolean;
}

export function DashboardSidebarHeader({
	isCollapsed = false,
	showExtraNav = false,
}: DashboardSidebarHeaderProps) {
	const openModal = useOpenNewWorkspaceModal();
	const openNewProject = useOpenNewProjectModal();
	const navigate = useNavigate();
	const headerRef = useRef<HTMLDivElement | null>(null);
	const folderImport = useFolderFirstImport({
		onError: (message) => {
			toast.error(`Import failed: ${message}`);
		},
		onMultipleProjects: ({ candidates }) => {
			toast.error("Import failed", {
				description: `Multiple projects use this repository (${candidates.length}). Choose the project in settings to set it up on this device.`,
				action: {
					label: "Open Projects",
					onClick: () => navigate({ to: "/settings/projects" }),
				},
			});
		},
	});

	const handleImportFolder = async () => {
		const result = await folderImport.start();
		if (result) {
			toast.success("Project ready — open it from the sidebar.");
		}
	};

	const shortcutText = useHotkeyDisplay("NEW_WORKSPACE").text;
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	// Default to Mac while loading so we don't briefly cover the traffic lights.
	const isMac = platform === undefined || platform === "darwin";
	const matchRoute = useMatchRoute();
	const { gateFeature } = usePaywall();
	const isWorkspacesListOpen = !!matchRoute({ to: "/v2-workspaces" });
	const isTasksOpen = !!matchRoute({ to: "/tasks", fuzzy: true });
	const isAutomationsOpen = !!matchRoute({ to: "/automations", fuzzy: true });
	const webPageMatch = matchRoute({ to: "/web/$pageId", fuzzy: true });
	const activeWebPageId = webPageMatch !== false ? webPageMatch.pageId : null;
	const webTabMatch = matchRoute({ to: "/web-tabs/$tabId", fuzzy: true });
	const activeWebTabId = webTabMatch !== false ? webTabMatch.tabId : null;

	const {
		tab: lastTab,
		assignee: lastAssignee,
		search: lastSearch,
		typeTab: lastTypeTab,
		projectFilter: lastProjectFilter,
	} = useTasksFilterStore();

	const handleWorkspacesClick = () => {
		navigate({ to: "/v2-workspaces" });
	};

	const handleAutomationsClick = () => {
		navigate({ to: "/automations" });
	};

	const handleTasksClick = () => {
		gateFeature(GATED_FEATURES.TASKS, () => {
			navigate({
				to: "/tasks",
				search: tasksSearchFromFilters({
					tab: lastTab,
					assignee: lastAssignee,
					search: lastSearch,
					typeTab: lastTypeTab,
					projectFilter: lastProjectFilter,
				}),
			});
		});
	};

	const handleWebPageClick = (pageId: string) => {
		navigate({
			to: "/web/$pageId",
			params: { pageId },
		});
	};

	const handleWebTabClick = (tabId: string) => {
		navigate({
			to: "/web-tabs/$tabId",
			params: { tabId },
		});
	};

	const handleWebTabAppClick = (appId: DashboardWebTabAppId) => {
		const tab =
			getFirstDashboardWebTabForApp(appId) ?? createDashboardWebTab(appId);
		handleWebTabClick(tab.id);
	};

	const handleCreateWebTab = (appId: DashboardWebTabAppId) => {
		const tab = createDashboardWebTab(appId);
		handleWebTabClick(tab.id);
	};

	const handleCloseWebTab = (tabId: string) => {
		const nextTab = closeDashboardWebTab(tabId);
		if (activeWebTabId !== tabId) return;

		if (nextTab) {
			navigate({
				to: "/web-tabs/$tabId",
				params: { tabId: nextTab.id },
				replace: true,
			});
			return;
		}

		navigate({ to: "/v2-workspaces", replace: true });
	};

	const openNavigationIntent = (intent: DashboardSidebarNavigationIntent) => {
		if (intent.type === "native-provider") {
			persistentHistory.replace(
				intent.provider === "capy" ? "/native/capy" : "/native/devin",
			);
			navigate({
				to: intent.provider === "capy" ? "/native/capy" : "/native/devin",
			});
			return;
		}

		if (intent.type === "native-session") {
			if (intent.provider === "capy") {
				persistentHistory.replace(
					`/native/capy/${encodeURIComponent(intent.id)}`,
				);
				navigate({
					to: "/native/capy/$threadId",
					params: { threadId: intent.id },
				});
				return;
			}
			persistentHistory.replace(
				`/native/devin/${encodeURIComponent(intent.id)}`,
			);
			navigate({
				to: "/native/devin/$sessionId",
				params: { sessionId: intent.id },
			});
			return;
		}

		if (intent.type === "web-page") {
			navigate({
				to: "/web/$pageId",
				params: { pageId: intent.pageId },
			});
			return;
		}

		if (intent.type === "web-app") {
			const tab =
				getFirstDashboardWebTabForApp(intent.appId) ??
				createDashboardWebTab(intent.appId);
			navigate({
				to: "/web-tabs/$tabId",
				params: { tabId: tab.id },
			});
			return;
		}

		navigate({
			to: "/web-tabs/$tabId",
			params: { tabId: intent.tabId },
		});
	};

	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			if (event.defaultPrevented || event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return;
			}

			const intent = resolveDashboardSidebarNavigationIntent(event.target);
			if (!intent) return;

			const intendedPath = dashboardSidebarNavigationIntentPath(intent);
			window.setTimeout(() => {
				if (intendedPath && getDashboardHashPathname() === intendedPath) return;
				openNavigationIntent(intent);
			}, 0);
		};

		window.addEventListener("click", handleClick, true);
		return () => window.removeEventListener("click", handleClick, true);
	});

	if (isCollapsed) {
		return (
			<div
				ref={headerRef}
				className="flex flex-col items-center gap-2 border-b border-border py-2"
			>
				<DashboardWebPagesGrid
					activePageId={activeWebPageId}
					variant="collapsed"
					onOpenPage={handleWebPageClick}
				/>

				{showExtraNav && (
					<>
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={handleWorkspacesClick}
									className={cn(
										"flex size-8 items-center justify-center rounded-md transition-colors",
										isWorkspacesListOpen
											? "bg-accent text-foreground"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
									)}
								>
									<LuLayers className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">Workspaces</TooltipContent>
						</Tooltip>

						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={handleAutomationsClick}
									className={cn(
										"flex size-8 items-center justify-center rounded-md transition-colors",
										isAutomationsOpen
											? "bg-accent text-foreground"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
									)}
								>
									<LuClock className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">Automations</TooltipContent>
						</Tooltip>

						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={handleTasksClick}
									className={cn(
										"flex size-8 items-center justify-center rounded-md transition-colors",
										isTasksOpen
											? "bg-accent text-foreground"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
									)}
								>
									<HiOutlineClipboardDocumentList className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">Tasks & PRs</TooltipContent>
						</Tooltip>
					</>
				)}

				<DashboardWebTabsSection
					activeTabId={activeWebTabId}
					variant="collapsed"
					onOpenApp={handleWebTabAppClick}
					onCreateTab={handleCreateWebTab}
					onOpenTab={handleWebTabClick}
					onCloseTab={handleCloseWebTab}
				/>

				<DashboardNativeAgentsSection variant="collapsed" />

				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => openModal()}
							className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
						>
							<LuPlus className="size-4" strokeWidth={STROKE_WIDTH_THICK} />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">
						New Workspace ({shortcutText})
					</TooltipContent>
				</Tooltip>

				<DropdownMenu>
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									aria-label="Add repository"
									className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
								>
									<LuFolderPlus className="size-4" />
								</button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<TooltipContent side="right">Add repository</TooltipContent>
					</Tooltip>
					<DropdownMenuContent
						align="start"
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						<DropdownMenuItem onSelect={() => openNewProject()}>
							<HiMiniPlus className="size-4" />
							Clone from URL
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={handleImportFolder}>
							<LuFolderInput className="size-4" />
							Open from folder
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	return (
		<div
			ref={headerRef}
			className="flex flex-col gap-1 border-b border-border px-2 pt-2 pb-2"
		>
			{/* -mx-2 cancels the parent's px-2 so this row owns its own
			    horizontal inset — keeps traffic-light alignment matching the
			    TopBar's 80px pad regardless of parent padding changes. */}
			<div
				className="drag -mx-2 flex h-8 items-center gap-1.5 pr-2"
				style={{ paddingLeft: isMac ? "80px" : "8px" }}
			>
				<SidebarToggle />
				<NavigationControls />
				<ResourceConsumption surface="v2" className="ml-auto" />
			</div>

			<DashboardWebPagesGrid
				activePageId={activeWebPageId}
				variant="expanded"
				onOpenPage={handleWebPageClick}
			/>

			{showExtraNav && (
				<>
					<button
						type="button"
						onClick={handleWorkspacesClick}
						className={cn(
							"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
							isWorkspacesListOpen
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						)}
					>
						<LuLayers className="size-4 shrink-0" />
						<span className="flex-1 text-left">Workspaces</span>
					</button>

					<button
						type="button"
						onClick={handleAutomationsClick}
						className={cn(
							"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
							isAutomationsOpen
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						)}
					>
						<LuClock className="size-4 shrink-0" />
						<span className="flex-1 text-left">Automations</span>
					</button>

					<button
						type="button"
						onClick={handleTasksClick}
						className={cn(
							"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
							isTasksOpen
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						)}
					>
						<HiOutlineClipboardDocumentList className="size-4 shrink-0" />
						<span className="flex-1 text-left">Tasks & PRs</span>
					</button>
				</>
			)}

			<DashboardWebTabsSection
				activeTabId={activeWebTabId}
				variant="expanded"
				onOpenApp={handleWebTabAppClick}
				onCreateTab={handleCreateWebTab}
				onOpenTab={handleWebTabClick}
				onCloseTab={handleCloseWebTab}
			/>

			<DashboardNativeAgentsSection variant="expanded" />

			<div className="flex items-center gap-0">
				<button
					type="button"
					onClick={() => openModal()}
					className="group flex flex-1 min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
				>
					<LuPlus
						className="size-4 shrink-0"
						strokeWidth={STROKE_WIDTH_THICK}
					/>
					<span className="flex-1 truncate text-left whitespace-nowrap">
						New Workspace
					</span>
					<span
						className={cn(
							"shrink-0 text-[10px] font-mono tabular-nums text-muted-foreground/60",
							"opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
						)}
					>
						{shortcutText}
					</span>
				</button>
				<DropdownMenu>
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									aria-label="Add repository"
									className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
								>
									<LuFolderPlus className="size-4" />
								</button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<TooltipContent side="right">Add repository</TooltipContent>
					</Tooltip>
					<DropdownMenuContent
						align="end"
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						<DropdownMenuItem onSelect={() => openNewProject()}>
							<HiMiniPlus className="size-4" />
							Clone from URL
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={handleImportFolder}>
							<LuFolderInput className="size-4" />
							Open from folder
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
