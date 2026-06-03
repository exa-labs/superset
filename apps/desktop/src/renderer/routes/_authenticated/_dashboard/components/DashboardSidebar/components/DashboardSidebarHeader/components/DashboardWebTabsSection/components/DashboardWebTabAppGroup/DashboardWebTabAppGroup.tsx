import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import type { DragEvent } from "react";
import { LuFolder, LuFolderPlus, LuFolderX, LuPlus } from "react-icons/lu";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { DashboardWebPageIcon } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarHeader/components/DashboardWebPagesGrid/components/DashboardWebPageIcon";
import {
	cancelDashboardWebUrlWarmup,
	warmDashboardWebUrl,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-preloader";
import {
	type DashboardWebTab,
	type DashboardWebTabApp,
	type DashboardWebTabAppId,
	type DashboardWebTabFolder,
	getDashboardWebTabFavicon,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import { DashboardWebTabRow } from "../DashboardWebTabRow";

interface DashboardWebTabAppGroupProps {
	app: DashboardWebTabApp;
	tabs: DashboardWebTab[];
	folders: DashboardWebTabFolder[];
	activeTabId: string | null;
	variant: "collapsed" | "expanded";
	isCollapsed: boolean;
	onOpenApp: (appId: DashboardWebTabAppId) => void;
	onCreateTab: (appId: DashboardWebTabAppId) => void;
	onCreateFolder: (appId: DashboardWebTabAppId) => void;
	onOpenTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
	onPinnedChange: (tabId: string, isPinned: boolean) => void;
	onMoveTabToFolder: (tabId: string, folderId: string | null) => void;
	onDeleteFolder: (folderId: string) => void;
	onFolderCollapsedChange: (folderId: string, isCollapsed: boolean) => void;
	onCollapsedChange: (
		appId: DashboardWebTabAppId,
		isCollapsed: boolean,
	) => void;
}

export function DashboardWebTabAppGroup({
	app,
	tabs,
	folders,
	activeTabId,
	variant,
	isCollapsed,
	onOpenApp,
	onCreateTab,
	onCreateFolder,
	onOpenTab,
	onCloseTab,
	onPinnedChange,
	onMoveTabToFolder,
	onDeleteFolder,
	onFolderCollapsedChange,
	onCollapsedChange,
}: DashboardWebTabAppGroupProps) {
	const isActive = tabs.some((tab) => tab.id === activeTabId);
	const faviconUrl = tabs[0]
		? getDashboardWebTabFavicon(tabs[0])
		: app.fallbackFaviconUrl;
	const shortcut = useHotkeyDisplay("OPEN_CHROME").text;
	const shortcutLabel = shortcut === "Unassigned" ? null : shortcut;
	const tabCountLabel =
		folders.length > 0
			? `${tabs.length}/${folders.length}`
			: tabs.length.toString();
	const primaryUrl = tabs[0]?.url ?? app.url;
	const folderTabs = (folderId: string) =>
		tabs.filter((tab) => tab.folderId === folderId);
	const unfolderedTabs = tabs.filter((tab) => !tab.folderId);
	const moveDraggedTabToFolder = (
		event: DragEvent,
		folderId: string | null,
	) => {
		event.preventDefault();
		const tabId = event.dataTransfer.getData("application/x-dashboard-web-tab");
		if (!tabId) return;
		onMoveTabToFolder(tabId, folderId);
	};

	if (variant === "collapsed") {
		return (
			<Tooltip delayDuration={300}>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label={app.label}
						data-dashboard-web-app-trigger={app.id}
						onFocus={() => warmDashboardWebUrl(primaryUrl)}
						onMouseEnter={() => warmDashboardWebUrl(primaryUrl)}
						onMouseLeave={cancelDashboardWebUrlWarmup}
						onClick={() => onOpenApp(app.id)}
						className={cn(
							"flex size-8 items-center justify-center rounded-md transition-colors",
							isActive
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						)}
					>
						<DashboardWebPageIcon
							src={faviconUrl}
							fallbackLabel={app.label}
							className="size-4"
						/>
					</button>
				</TooltipTrigger>
				<TooltipContent side="right">{app.label}</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			<div
				data-dashboard-sidebar-action-scope
				className="flex items-center gap-1"
			>
				<button
					type="button"
					aria-label={`Open ${app.label}`}
					data-dashboard-web-app-trigger={app.id}
					onFocus={() => warmDashboardWebUrl(primaryUrl)}
					onMouseEnter={() => warmDashboardWebUrl(primaryUrl)}
					onMouseLeave={cancelDashboardWebUrlWarmup}
					onClick={() => onOpenApp(app.id)}
					className={cn(
						"flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors",
						isActive
							? "bg-accent/70 text-foreground"
							: "text-muted-foreground hover:bg-accent/35 hover:text-foreground",
					)}
				>
					<DashboardWebPageIcon
						src={faviconUrl}
						fallbackLabel={app.label}
						className="size-4"
					/>
					<span className="min-w-0 flex-1 truncate text-left">{app.label}</span>
					{shortcutLabel && (
						<span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
							{shortcutLabel}
						</span>
					)}
				</button>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-expanded={!isCollapsed}
							aria-label={`${isCollapsed ? "Show" : "Hide"} ${app.label} sidebar sessions`}
							onClick={() => onCollapsedChange(app.id, !isCollapsed)}
							className={cn(
								"flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/60 px-1 font-mono text-[10px] tabular-nums text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
								isActive && "border-foreground/15 text-foreground/75",
							)}
						>
							{tabCountLabel}
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">
						{isCollapsed
							? `Show ${app.label} sidebar sessions`
							: `Hide ${app.label} sidebar sessions`}
					</TooltipContent>
				</Tooltip>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label={`New ${app.label} tab`}
							data-dashboard-sidebar-action="create"
							onClick={() => onCreateTab(app.id)}
							className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
						>
							<LuPlus className="size-3.5" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">New {app.label} tab</TooltipContent>
				</Tooltip>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label={`New ${app.label} folder`}
							onClick={() => onCreateFolder(app.id)}
							className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
						>
							<LuFolderPlus className="size-3.5" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">New folder</TooltipContent>
				</Tooltip>
			</div>
			{!isCollapsed && (
				<ul
					className="ml-4 flex flex-col gap-1 border-l border-border/70 pl-2"
					onDragOver={(event) => event.preventDefault()}
					onDrop={(event) => moveDraggedTabToFolder(event, null)}
				>
					{folders.map((folder) => {
						const tabsInFolder = folderTabs(folder.id);
						return (
							<li
								key={folder.id}
								className="flex flex-col gap-1 rounded-md"
								onDragOver={(event) => event.preventDefault()}
								onDrop={(event) => {
									event.stopPropagation();
									moveDraggedTabToFolder(event, folder.id);
								}}
							>
								<div className="group/folder flex h-7 min-w-0 items-center gap-2 rounded-md border border-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border/50 hover:bg-accent/25 hover:text-foreground">
									<LuFolder className="size-3 shrink-0 text-muted-foreground/70" />
									<button
										type="button"
										data-dashboard-sidebar-roving-item="true"
										aria-expanded={!folder.isCollapsed}
										onClick={() =>
											onFolderCollapsedChange(folder.id, !folder.isCollapsed)
										}
										className="min-w-0 flex-1 truncate text-left"
									>
										{folder.title}
									</button>
									<span className="rounded-sm bg-muted-foreground/10 px-1 font-mono text-[10px]">
										{tabsInFolder.length === 0 ? "empty" : tabsInFolder.length}
									</span>
									<button
										type="button"
										aria-label={`Delete ${folder.title}`}
										onClick={() => onDeleteFolder(folder.id)}
										className="flex size-5 items-center justify-center rounded opacity-0 transition hover:bg-accent group-hover/folder:opacity-100 group-focus-within/folder:opacity-100"
									>
										<LuFolderX className="size-3" />
									</button>
								</div>
								{!folder.isCollapsed && (
									<ul className="flex flex-col gap-1">
										{tabsInFolder.map((tab) => (
											<DashboardWebTabRow
												key={tab.id}
												tab={tab}
												isActive={activeTabId === tab.id}
												shortcutLabel={null}
												onOpen={onOpenTab}
												onClose={onCloseTab}
												onPinnedChange={onPinnedChange}
											/>
										))}
									</ul>
								)}
							</li>
						);
					})}
					{unfolderedTabs.map((tab) => (
						<DashboardWebTabRow
							key={tab.id}
							tab={tab}
							isActive={activeTabId === tab.id}
							shortcutLabel={null}
							onOpen={onOpenTab}
							onClose={onCloseTab}
							onPinnedChange={onPinnedChange}
						/>
					))}
				</ul>
			)}
		</div>
	);
}
