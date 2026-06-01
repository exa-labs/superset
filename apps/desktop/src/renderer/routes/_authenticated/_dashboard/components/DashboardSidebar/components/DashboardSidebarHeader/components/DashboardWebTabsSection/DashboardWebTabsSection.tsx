import { cn } from "@superset/ui/utils";
import { useState, useSyncExternalStore } from "react";
import {
	createDashboardWebTabFolder,
	DASHBOARD_WEB_TAB_APPS,
	type DashboardWebTabAppId,
	deleteDashboardWebTabFolder,
	getDashboardWebTabFolders,
	getDashboardWebTabs,
	moveDashboardWebTabToFolder,
	setDashboardWebTabFolderCollapsed,
	setDashboardWebTabPinned,
	subscribeDashboardWebTabs,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import { DashboardWebTabAppGroup } from "./components/DashboardWebTabAppGroup";

interface DashboardWebTabsSectionProps {
	activeTabId: string | null;
	variant: "collapsed" | "expanded";
	onOpenApp: (appId: DashboardWebTabAppId) => void;
	onCreateTab: (appId: DashboardWebTabAppId) => void;
	onOpenTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
}

const COLLAPSED_APPS_STORAGE_KEY = "dashboard-web-tab-collapsed-apps-v1";

function isKnownAppId(appId: string): appId is DashboardWebTabAppId {
	return DASHBOARD_WEB_TAB_APPS.some((app) => app.id === appId);
}

function readCollapsedAppIds(): DashboardWebTabAppId[] {
	if (typeof localStorage === "undefined") return [];

	try {
		const raw = localStorage.getItem(COLLAPSED_APPS_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(appId): appId is DashboardWebTabAppId =>
				typeof appId === "string" && isKnownAppId(appId),
		);
	} catch {
		return [];
	}
}

function writeCollapsedAppIds(appIds: Set<DashboardWebTabAppId>) {
	if (typeof localStorage === "undefined") return;

	try {
		localStorage.setItem(
			COLLAPSED_APPS_STORAGE_KEY,
			JSON.stringify([...appIds]),
		);
	} catch {}
}

export function DashboardWebTabsSection({
	activeTabId,
	variant,
	onOpenApp,
	onCreateTab,
	onOpenTab,
	onCloseTab,
}: DashboardWebTabsSectionProps) {
	const tabs = useSyncExternalStore(
		subscribeDashboardWebTabs,
		getDashboardWebTabs,
		getDashboardWebTabs,
	);
	const folders = useSyncExternalStore(
		subscribeDashboardWebTabs,
		getDashboardWebTabFolders,
		getDashboardWebTabFolders,
	);
	const [collapsedAppIds, setCollapsedAppIds] = useState(
		() => new Set(readCollapsedAppIds()),
	);

	const setAppCollapsed = (
		appId: DashboardWebTabAppId,
		isCollapsed: boolean,
	) => {
		setCollapsedAppIds((current) => {
			const next = new Set(current);
			if (isCollapsed) {
				next.add(appId);
			} else {
				next.delete(appId);
			}
			writeCollapsedAppIds(next);
			return next;
		});
	};

	const handleCreateTab = (appId: DashboardWebTabAppId) => {
		setAppCollapsed(appId, false);
		onCreateTab(appId);
	};

	const handleCreateFolder = (appId: DashboardWebTabAppId) => {
		createDashboardWebTabFolder(appId);
		setAppCollapsed(appId, false);
	};

	return (
		<div
			className={cn(
				"flex flex-col",
				variant === "collapsed" ? "items-center gap-2" : "gap-1",
			)}
		>
			{DASHBOARD_WEB_TAB_APPS.map((app) => (
				<DashboardWebTabAppGroup
					key={app.id}
					app={app}
					tabs={tabs.filter((tab) => tab.appId === app.id)}
					folders={folders.filter((folder) => folder.appId === app.id)}
					activeTabId={activeTabId}
					variant={variant}
					isCollapsed={collapsedAppIds.has(app.id)}
					onOpenApp={onOpenApp}
					onCreateTab={handleCreateTab}
					onCreateFolder={handleCreateFolder}
					onOpenTab={onOpenTab}
					onCloseTab={onCloseTab}
					onPinnedChange={setDashboardWebTabPinned}
					onMoveTabToFolder={moveDashboardWebTabToFolder}
					onDeleteFolder={deleteDashboardWebTabFolder}
					onFolderCollapsedChange={setDashboardWebTabFolderCollapsed}
					onCollapsedChange={setAppCollapsed}
				/>
			))}
		</div>
	);
}
