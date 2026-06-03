import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_VIEW_MRU_STORAGE_KEY,
	dashboardViewMruTargetPath,
	normalizeDashboardViewMruPath,
	readDashboardViewMruEntries,
	recordDashboardViewMruPath,
	resolveDashboardViewMruPathname,
} from "./dashboard-view-mru";

function memoryStorage(initial: Record<string, string> = {}) {
	const values = { ...initial };
	return {
		getItem: (key: string) => values[key] ?? null,
		setItem: (key: string, value: string) => {
			values[key] = value;
		},
		values,
	};
}

describe("dashboard view MRU", () => {
	it("normalizes meaningful keyboard-switchable dashboard paths", () => {
		expect(normalizeDashboardViewMruPath("/web/overseer?x=1")).toBe(
			"/web/overseer",
		);
		expect(normalizeDashboardViewMruPath("/web-tabs/chrome-1")).toBe(
			"/web-tabs/chrome-1",
		);
		expect(normalizeDashboardViewMruPath("/native/capy/thread-1")).toBe(
			"/native/capy/thread-1",
		);
		expect(normalizeDashboardViewMruPath("/v2-workspace/ws-1/")).toBe(
			"/v2-workspace/ws-1",
		);
		expect(normalizeDashboardViewMruPath("/settings/keyboard")).toBeNull();
	});

	it("resolves hash-backed dashboard paths for MRU tracking", () => {
		expect(
			resolveDashboardViewMruPathname({
				hashPathname: "/web-tabs/chrome-default",
				locationPathname: "/web-tabs",
			}),
		).toBe("/web-tabs/chrome-default");
		expect(
			resolveDashboardViewMruPathname({
				hashPathname: "/native/devin/devin-123",
				locationPathname: "/native/devin",
			}),
		).toBe("/native/devin/devin-123");
		expect(
			resolveDashboardViewMruPathname({
				hashPathname: null,
				locationPathname: "/web/overseer",
			}),
		).toBe("/web/overseer");
		expect(
			resolveDashboardViewMruPathname({
				hashPathname: "/settings/keyboard",
				locationPathname: "/web/overseer",
			}),
		).toBe("/web/overseer");
	});

	it("records hash-backed views through the resolved MRU pathname", () => {
		const storage = memoryStorage();

		recordDashboardViewMruPath(
			resolveDashboardViewMruPathname({
				hashPathname: "/web-tabs/chrome-default",
				locationPathname: "/web-tabs",
			}),
			storage,
			1,
		);
		recordDashboardViewMruPath(
			resolveDashboardViewMruPathname({
				hashPathname: "/native/capy/thread-1",
				locationPathname: "/native/capy",
			}),
			storage,
			2,
		);

		expect(readDashboardViewMruEntries(storage)).toEqual([
			{ path: "/native/capy/thread-1", viewedAt: 2 },
			{ path: "/web-tabs/chrome-default", viewedAt: 1 },
		]);
	});

	it("records unique views with newest first", () => {
		const storage = memoryStorage();

		recordDashboardViewMruPath("/web/overseer", storage, 1);
		recordDashboardViewMruPath("/native/devin/session-1", storage, 2);
		recordDashboardViewMruPath("/web/overseer", storage, 3);
		recordDashboardViewMruPath("/settings/account", storage, 4);

		expect(readDashboardViewMruEntries(storage)).toEqual([
			{ path: "/web/overseer", viewedAt: 3 },
			{ path: "/native/devin/session-1", viewedAt: 2 },
		]);
	});

	it("ignores invalid persisted entries", () => {
		const storage = memoryStorage({
			[DASHBOARD_VIEW_MRU_STORAGE_KEY]: JSON.stringify([
				{ path: "/settings/account", viewedAt: 1 },
				{ path: "/web/overseer", viewedAt: 2 },
				{ path: "/web/overseer", viewedAt: 3 },
				{ path: "/native/capy/thread-1", viewedAt: "bad" },
			]),
		});

		expect(readDashboardViewMruEntries(storage)).toEqual([
			{ path: "/web/overseer", viewedAt: 2 },
			{ path: "/native/capy/thread-1", viewedAt: 0 },
		]);
	});

	it("selects next and previous targets around the current view", () => {
		const entries = [
			{ path: "/web/overseer", viewedAt: 3 },
			{ path: "/native/devin/session-1", viewedAt: 2 },
			{ path: "/native/capy/thread-1", viewedAt: 1 },
		];

		expect(
			dashboardViewMruTargetPath({
				currentPathname: "/web/overseer",
				direction: "next",
				entries,
			}),
		).toEqual({ index: 1, path: "/native/devin/session-1" });
		expect(
			dashboardViewMruTargetPath({
				currentPathname: "/web/overseer",
				direction: "previous",
				entries,
			}),
		).toEqual({ index: 2, path: "/native/capy/thread-1" });
		expect(
			dashboardViewMruTargetPath({
				currentPathname: "/settings/keyboard",
				direction: "next",
				entries,
			}),
		).toEqual({ index: 0, path: "/web/overseer" });
	});
});
