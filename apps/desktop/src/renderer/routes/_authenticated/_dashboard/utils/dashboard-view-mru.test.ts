import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_VIEW_MRU_STORAGE_KEY,
	dashboardViewMruEntryLabel,
	dashboardViewMruSwitchTarget,
	dashboardViewMruTargetPath,
	dashboardViewMruVisibleEntries,
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
		expect(normalizeDashboardViewMruPath("/v2-workspaces")).toBe(
			"/v2-workspaces",
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
		recordDashboardViewMruPath("/v2-workspaces", storage, 4);
		recordDashboardViewMruPath("/settings/account", storage, 5);

		expect(readDashboardViewMruEntries(storage)).toEqual([
			{ path: "/v2-workspaces", viewedAt: 4 },
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

	it("cycles MRU switch targets from the active overlay index", () => {
		const entries = [
			{ path: "/web/overseer", viewedAt: 3 },
			{ path: "/native/devin/session-1", viewedAt: 2 },
			{ path: "/native/capy/thread-1", viewedAt: 1 },
		];

		const firstTarget = dashboardViewMruSwitchTarget({
			activeIndex: null,
			currentPathname: "/web/overseer",
			direction: "next",
			entries,
		});
		expect(firstTarget).toEqual({
			index: 1,
			path: "/native/devin/session-1",
		});
		expect(
			dashboardViewMruSwitchTarget({
				activeIndex: firstTarget?.index,
				currentPathname: firstTarget?.path ?? "/native/devin/session-1",
				direction: "next",
				entries,
			}),
		).toEqual({ index: 2, path: "/native/capy/thread-1" });
		expect(
			dashboardViewMruSwitchTarget({
				activeIndex: 0,
				currentPathname: "/web/overseer",
				direction: "previous",
				entries,
			}),
		).toEqual({ index: 2, path: "/native/capy/thread-1" });
	});

	it("labels MRU entries for the switcher overlay", () => {
		expect(dashboardViewMruEntryLabel("/web/inference")).toEqual({
			subtitle: "Pinned web",
			title: "Inference",
		});
		expect(dashboardViewMruEntryLabel("/web-tabs/chrome-default")).toEqual({
			subtitle: "chrome-default",
			title: "Chrome",
		});
		expect(dashboardViewMruEntryLabel("/native/capy/thread-1")).toEqual({
			subtitle: "thread-1",
			title: "Capy session",
		});
		expect(dashboardViewMruEntryLabel("/native/devin")).toEqual({
			subtitle: "Devin inbox",
			title: "Devin",
		});
		expect(dashboardViewMruEntryLabel("/v2-workspaces")).toEqual({
			subtitle: "Dashboard",
			title: "Workspaces",
		});
		expect(dashboardViewMruEntryLabel("/root-terminal/stag")).toEqual({
			subtitle: "stag",
			title: "Root terminal",
		});
	});

	it("keeps the active MRU target visible in a centered switcher window", () => {
		const entries = Array.from({ length: 10 }, (_, index) => ({
			path: `/web/page-${index}`,
			viewedAt: index,
		}));

		expect(
			dashboardViewMruVisibleEntries({
				activeIndex: 5,
				entries,
				maxEntries: 5,
			}).map((entry) => entry.index),
		).toEqual([3, 4, 5, 6, 7]);
		expect(
			dashboardViewMruVisibleEntries({
				activeIndex: 0,
				entries,
				maxEntries: 5,
			}).map((entry) => entry.index),
		).toEqual([0, 1, 2, 3, 4]);
		expect(
			dashboardViewMruVisibleEntries({
				activeIndex: 9,
				entries,
				maxEntries: 5,
			}).map((entry) => entry.index),
		).toEqual([5, 6, 7, 8, 9]);
	});

	it("uses a custom label resolver for visible switcher entries", () => {
		const entries = [
			{ path: "/web/overseer", viewedAt: 2 },
			{ path: "/native/devin/session-1", viewedAt: 1 },
		];

		expect(
			dashboardViewMruVisibleEntries({
				activeIndex: 0,
				entries,
				labelResolver: (path) =>
					path === "/native/devin/session-1"
						? { subtitle: "session-1", title: "QES dashboard" }
						: null,
			}),
		).toEqual([
			{
				index: 0,
				path: "/web/overseer",
				subtitle: "Pinned web",
				title: "Overseer",
				viewedAt: 2,
			},
			{
				index: 1,
				path: "/native/devin/session-1",
				subtitle: "session-1",
				title: "QES dashboard",
				viewedAt: 1,
			},
		]);
	});
});
