import type {
	DashboardWebTab,
	DashboardWebTabFolder,
} from "./dashboard-web-tabs";

export const DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS = 2 * 60 * 60 * 1_000;
export const DASHBOARD_WEB_VIEW_TTL_SWEEP_MS = 60_000;
export const DASHBOARD_WEB_VIEW_WARM_BUFFER_SIZE = 6;

export type DashboardWebRetainedEntry =
	| {
			cacheKey: string;
			kind: "page";
			id: string;
			lastActiveAt: number;
	  }
	| {
			cacheKey: string;
			kind: "tab";
			id: string;
			lastActiveAt: number;
	  };

export type DashboardWebRetentionTarget =
	| {
			kind: "page";
	  }
	| {
			kind: "tab";
			isPinned: boolean;
			isInCollapsedFolder: boolean;
	  };

export function areDashboardWebRetainedEntriesEqual(
	left: DashboardWebRetainedEntry[],
	right: DashboardWebRetainedEntry[],
): boolean {
	if (left.length !== right.length) return false;
	return left.every((entry, index) => {
		const other = right[index];
		return (
			other !== undefined &&
			entry.cacheKey === other.cacheKey &&
			entry.kind === other.kind &&
			entry.id === other.id &&
			entry.lastActiveAt === other.lastActiveAt
		);
	});
}

export function shouldRetainDashboardWebEntry({
	activeCacheKey,
	entry,
	now,
	target,
}: {
	activeCacheKey: string | null;
	entry: DashboardWebRetainedEntry;
	now: number;
	target: DashboardWebRetentionTarget | null;
}): boolean {
	if (!target) return false;
	if (entry.cacheKey === activeCacheKey) return true;

	if (target.kind === "page") {
		return now - entry.lastActiveAt < DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS;
	}

	if (target.isPinned) return true;
	if (target.isInCollapsedFolder) return false;

	return now - entry.lastActiveAt < DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS;
}

export function selectWarmDashboardWebTabEntries({
	activeCacheKey,
	folders,
	limit = DASHBOARD_WEB_VIEW_WARM_BUFFER_SIZE,
	now,
	tabs,
}: {
	activeCacheKey: string | null;
	folders: DashboardWebTabFolder[];
	limit?: number;
	now: number;
	tabs: DashboardWebTab[];
}): DashboardWebRetainedEntry[] {
	if (limit <= 0) return [];
	const collapsedFolderIds = new Set(
		folders.filter((folder) => folder.isCollapsed).map((folder) => folder.id),
	);

	return [...tabs]
		.filter((tab) => {
			if (activeCacheKey === `tab:${tab.id}`) return false;
			return !tab.folderId || !collapsedFolderIds.has(tab.folderId);
		})
		.sort((left, right) => {
			if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
			return right.updatedAt - left.updatedAt;
		})
		.slice(0, limit)
		.map((tab) => ({
			cacheKey: `tab:${tab.id}`,
			kind: "tab",
			id: tab.id,
			lastActiveAt: now,
		}));
}
