import { DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS } from "./dashboard-web-retention";

export const DASHBOARD_BROWSER_TAB_KEEPALIVE_TTL_MS =
	DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS;
export const DASHBOARD_BROWSER_TAB_WARM_BUFFER_SIZE = 8;

export interface DashboardBrowserTabRetentionEntry {
	tabId: string;
	lastActiveAt: number;
}

export interface DashboardBrowserTabWarmCandidate {
	id: string;
	lastActiveAt: number;
}

export function areDashboardBrowserTabRetentionEntriesEqual(
	left: DashboardBrowserTabRetentionEntry[],
	right: DashboardBrowserTabRetentionEntry[],
): boolean {
	if (left.length !== right.length) return false;
	return left.every((entry, index) => {
		const other = right[index];
		return (
			other !== undefined &&
			entry.tabId === other.tabId &&
			entry.lastActiveAt === other.lastActiveAt
		);
	});
}

export function updateDashboardBrowserTabRetention({
	activeTabId,
	current,
	existingTabIds,
	now,
	splitTabId,
	ttlMs = DASHBOARD_BROWSER_TAB_KEEPALIVE_TTL_MS,
	warmTabIds = [],
}: {
	activeTabId: string | null;
	current: DashboardBrowserTabRetentionEntry[];
	existingTabIds: string[];
	now: number;
	splitTabId: string | null;
	ttlMs?: number;
	warmTabIds?: string[];
}): DashboardBrowserTabRetentionEntry[] {
	const existing = new Set(existingTabIds);
	const visible = new Set(
		[activeTabId, splitTabId].filter(
			(tabId): tabId is string => !!tabId && existing.has(tabId),
		),
	);
	const warm = new Set(
		warmTabIds.filter((tabId) => existing.has(tabId) && !visible.has(tabId)),
	);

	const entriesByTabId = new Map<string, DashboardBrowserTabRetentionEntry>();
	for (const entry of current) {
		if (!existing.has(entry.tabId)) continue;
		if (
			!visible.has(entry.tabId) &&
			!warm.has(entry.tabId) &&
			now - entry.lastActiveAt >= ttlMs
		) {
			continue;
		}
		entriesByTabId.set(entry.tabId, entry);
	}

	for (const tabId of visible) {
		entriesByTabId.set(tabId, { tabId, lastActiveAt: now });
	}
	for (const tabId of warm) {
		entriesByTabId.set(tabId, { tabId, lastActiveAt: now });
	}

	return existingTabIds
		.map((tabId) => entriesByTabId.get(tabId))
		.filter(
			(entry): entry is DashboardBrowserTabRetentionEntry =>
				entry !== undefined,
		);
}

export function selectWarmDashboardBrowserTabIds({
	activeTabId,
	limit = DASHBOARD_BROWSER_TAB_WARM_BUFFER_SIZE,
	splitTabId,
	tabs,
}: {
	activeTabId: string | null;
	limit?: number;
	splitTabId: string | null;
	tabs: DashboardBrowserTabWarmCandidate[];
}): string[] {
	if (limit <= 0) return [];
	const visible = new Set([activeTabId, splitTabId].filter(Boolean));
	return [...tabs]
		.filter((tab) => !visible.has(tab.id))
		.sort((left, right) => right.lastActiveAt - left.lastActiveAt)
		.slice(0, limit)
		.map((tab) => tab.id);
}
