import { describe, expect, it } from "bun:test";
import {
	selectWarmDashboardBrowserTabIds,
	updateDashboardBrowserTabRetention,
} from "./dashboard-browser-tab-retention";

describe("dashboard browser tab retention", () => {
	it("mounts only active and split tabs from a restored tab set", () => {
		expect(
			updateDashboardBrowserTabRetention({
				activeTabId: "active",
				current: [],
				existingTabIds: ["active", "background", "split"],
				now: 1_000,
				splitTabId: "split",
				ttlMs: 10_000,
			}),
		).toEqual([
			{ tabId: "active", lastActiveAt: 1_000 },
			{ tabId: "split", lastActiveAt: 1_000 },
		]);
	});

	it("keeps previously visited inactive tabs warm until the TTL expires", () => {
		expect(
			updateDashboardBrowserTabRetention({
				activeTabId: "next",
				current: [{ tabId: "previous", lastActiveAt: 1_000 }],
				existingTabIds: ["previous", "next"],
				now: 5_000,
				splitTabId: null,
				ttlMs: 10_000,
			}),
		).toEqual([
			{ tabId: "previous", lastActiveAt: 1_000 },
			{ tabId: "next", lastActiveAt: 5_000 },
		]);
	});

	it("sleeps inactive tabs after the TTL and drops closed tabs", () => {
		expect(
			updateDashboardBrowserTabRetention({
				activeTabId: "active",
				current: [
					{ tabId: "expired", lastActiveAt: 1_000 },
					{ tabId: "closed", lastActiveAt: 9_000 },
				],
				existingTabIds: ["expired", "active"],
				now: 12_000,
				splitTabId: null,
				ttlMs: 10_000,
			}),
		).toEqual([{ tabId: "active", lastActiveAt: 12_000 }]);
	});

	it("keeps restored warm tabs mounted before the first activation", () => {
		expect(
			updateDashboardBrowserTabRetention({
				activeTabId: "active",
				current: [],
				existingTabIds: ["active", "recent", "older"],
				now: 20_000,
				splitTabId: null,
				ttlMs: 10_000,
				warmTabIds: ["recent", "older"],
			}),
		).toEqual([
			{ tabId: "active", lastActiveAt: 20_000 },
			{ tabId: "recent", lastActiveAt: 20_000 },
			{ tabId: "older", lastActiveAt: 20_000 },
		]);
	});

	it("selects the most recently active hidden tabs for the warm buffer", () => {
		expect(
			selectWarmDashboardBrowserTabIds({
				activeTabId: "active",
				limit: 2,
				splitTabId: "split",
				tabs: [
					{ id: "old", lastActiveAt: 1 },
					{ id: "recent", lastActiveAt: 5 },
					{ id: "active", lastActiveAt: 6 },
					{ id: "newest", lastActiveAt: 10 },
					{ id: "split", lastActiveAt: 11 },
				],
			}),
		).toEqual(["newest", "recent"]);
	});
});
