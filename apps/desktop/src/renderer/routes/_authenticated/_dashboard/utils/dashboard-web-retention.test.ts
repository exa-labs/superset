import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS,
	type DashboardWebRetainedEntry,
	selectWarmDashboardWebTabEntries,
	shouldRetainDashboardWebEntry,
} from "./dashboard-web-retention";
import type {
	DashboardWebTab,
	DashboardWebTabFolder,
} from "./dashboard-web-tabs";

const NOW = 1_000_000;

function tabEntry(overrides: Partial<DashboardWebRetainedEntry> = {}) {
	return {
		cacheKey: "tab:one",
		kind: "tab",
		id: "one",
		lastActiveAt: NOW,
		...overrides,
	} satisfies DashboardWebRetainedEntry;
}

function dashboardWebTab(
	id: string,
	overrides: Partial<DashboardWebTab> = {},
): DashboardWebTab {
	return {
		id,
		appId: "chrome",
		title: id,
		browserTitle: null,
		isTitleCustomized: false,
		url: `https://example.com/${id}`,
		faviconUrl: null,
		folderId: null,
		isPinned: false,
		createdAt: 0,
		updatedAt: 0,
		...overrides,
	};
}

function dashboardWebFolder(
	id: string,
	overrides: Partial<DashboardWebTabFolder> = {},
): DashboardWebTabFolder {
	return {
		id,
		appId: "chrome",
		title: id,
		isCollapsed: false,
		color: "#38bdf8",
		createdAt: 0,
		updatedAt: 0,
		...overrides,
	};
}

describe("shouldRetainDashboardWebEntry", () => {
	it("always keeps the active entry warm", () => {
		expect(
			shouldRetainDashboardWebEntry({
				activeCacheKey: "tab:one",
				entry: tabEntry({
					lastActiveAt: NOW - DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS * 2,
				}),
				now: NOW,
				target: {
					kind: "tab",
					isInCollapsedFolder: true,
					isPinned: false,
				},
			}),
		).toBe(true);
	});

	it("expires inactive unpinned entries after the keepalive TTL", () => {
		expect(
			shouldRetainDashboardWebEntry({
				activeCacheKey: "tab:other",
				entry: tabEntry({
					lastActiveAt: NOW - DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS - 1,
				}),
				now: NOW,
				target: {
					kind: "tab",
					isInCollapsedFolder: false,
					isPinned: false,
				},
			}),
		).toBe(false);
	});

	it("keeps pinned tabs beyond the keepalive TTL", () => {
		expect(
			shouldRetainDashboardWebEntry({
				activeCacheKey: null,
				entry: tabEntry({
					lastActiveAt: NOW - DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS * 2,
				}),
				now: NOW,
				target: {
					kind: "tab",
					isInCollapsedFolder: false,
					isPinned: true,
				},
			}),
		).toBe(true);
	});

	it("sleeps inactive tabs inside collapsed folders immediately", () => {
		expect(
			shouldRetainDashboardWebEntry({
				activeCacheKey: "tab:other",
				entry: tabEntry(),
				now: NOW,
				target: {
					kind: "tab",
					isInCollapsedFolder: true,
					isPinned: false,
				},
			}),
		).toBe(false);
	});

	it("drops entries whose target no longer exists", () => {
		expect(
			shouldRetainDashboardWebEntry({
				activeCacheKey: null,
				entry: tabEntry(),
				now: NOW,
				target: null,
			}),
		).toBe(false);
	});

	it("selects pinned and recent sidebar tabs for the warm buffer", () => {
		expect(
			selectWarmDashboardWebTabEntries({
				activeCacheKey: "tab:active",
				folders: [dashboardWebFolder("collapsed", { isCollapsed: true })],
				limit: 3,
				now: NOW,
				tabs: [
					dashboardWebTab("active", { updatedAt: 100 }),
					dashboardWebTab("old", { updatedAt: 1 }),
					dashboardWebTab("pinned", { isPinned: true, updatedAt: 2 }),
					dashboardWebTab("collapsed-tab", {
						folderId: "collapsed",
						updatedAt: 500,
					}),
					dashboardWebTab("recent", { updatedAt: 400 }),
					dashboardWebTab("middle", { updatedAt: 200 }),
				],
			}).map((entry) => entry.id),
		).toEqual(["pinned", "recent", "middle"]);
	});
});
