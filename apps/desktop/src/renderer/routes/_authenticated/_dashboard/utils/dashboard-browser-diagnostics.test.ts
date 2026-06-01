import { describe, expect, it } from "bun:test";
import {
	getDashboardBrowserDiagnosticsSnapshotForTests,
	getDashboardBrowserMemoryPressure,
	recordDashboardBrowserDeckState,
	recordDashboardBrowserPaneEvent,
	recordDashboardBrowserSwitchStarted,
	resetDashboardBrowserDiagnosticsForTests,
} from "./dashboard-browser-diagnostics";

describe("dashboard browser diagnostics", () => {
	it("reports normal memory pressure for a small retained browser set", () => {
		expect(
			getDashboardBrowserMemoryPressure({
				activeCount: 1,
				retainedCount: 2,
				sleepingCount: 0,
				warmCount: 1,
				memory: null,
			}),
		).toMatchObject({
			level: "normal",
			retainedCount: 2,
			activeCount: 1,
			warmCount: 1,
			sleepingCount: 0,
		});
	});

	it("reports elevated memory pressure when several webviews are warm", () => {
		expect(
			getDashboardBrowserMemoryPressure({
				activeCount: 1,
				retainedCount: 8,
				sleepingCount: 3,
				warmCount: 7,
				memory: null,
			}).level,
		).toBe("elevated");
	});

	it("reports high memory pressure when renderer heap is near its limit", () => {
		expect(
			getDashboardBrowserMemoryPressure({
				activeCount: 1,
				retainedCount: 3,
				sleepingCount: 0,
				warmCount: 2,
				memory: {
					jsHeapSizeLimit: 100,
					usedJSHeapSize: 80,
				},
			}),
		).toMatchObject({
			level: "high",
			rendererHeapUsageRatio: 0.8,
		});
	});

	it("records switch latency when the target webview focuses", () => {
		resetDashboardBrowserDiagnosticsForTests();
		recordDashboardBrowserDeckState({
			activeCacheKey: "tab:devin-default",
			bounds: { height: 700, left: 272, top: 48, width: 1200 },
			keepAliveTtlMs: 7_200_000,
			retainedEntries: [
				{
					cacheKey: "tab:devin-default",
					kind: "tab",
					id: "devin-default",
					lastActiveAt: Date.now(),
				},
			],
			sweepIntervalMs: 60_000,
		});
		recordDashboardBrowserSwitchStarted({
			fromCacheKey: "tab:capy-default",
			toCacheKey: "tab:devin-default",
		});
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:devin-default:default",
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "activated",
		});
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:devin-default:default",
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "focused",
		});

		const snapshot = getDashboardBrowserDiagnosticsSnapshotForTests();
		expect(snapshot.deck).toMatchObject({
			bounds: { height: 700, left: 272, top: 48, width: 1200 },
			switchCount: 1,
			lastSwitchFromCacheKey: "tab:capy-default",
			lastSwitchToCacheKey: "tab:devin-default",
		});
		expect(typeof snapshot.deck?.lastSwitchLatencyMs).toBe("number");
		expect(snapshot.deck?.lastSwitchLatencyMs).toBeGreaterThanOrEqual(0);
		expect(
			snapshot.events.some((event) => event.event === "switch-complete"),
		).toBe(true);
	});

	it("keeps pane diagnostics after a webview unmounts so sleeps are inspectable", () => {
		resetDashboardBrowserDiagnosticsForTests();
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:devin-default:background",
			tabId: "background",
			cacheKey: "tab:devin-default",
			event: "mounted",
			url: "https://app.devin.ai/sessions/one",
		});
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:devin-default:background",
			tabId: "background",
			cacheKey: "tab:devin-default",
			event: "dom-ready",
			url: "https://app.devin.ai/sessions/one",
		});
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:devin-default:background",
			tabId: "background",
			cacheKey: "tab:devin-default",
			event: "unmounted",
			url: "https://app.devin.ai/sessions/one",
		});

		const pane = getDashboardBrowserDiagnosticsSnapshotForTests().panes.find(
			(item) => item.paneId === "dashboard-web:devin-default:background",
		);
		expect(pane).toMatchObject({
			isMounted: false,
			isReady: false,
			mountCount: 1,
			retentionState: "sleeping",
			unmountCount: 1,
			url: "https://app.devin.ai/sessions/one",
		});
	});

	it("tracks whether a retained webview is active, split, warm, or sleeping", () => {
		resetDashboardBrowserDiagnosticsForTests();
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:capy-default:default",
			tabId: "default",
			cacheKey: "tab:capy-default",
			event: "activated",
			retentionState: "active",
		});
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:capy-default:default",
			tabId: "default",
			cacheKey: "tab:capy-default",
			event: "retention-state",
			retentionState: "split",
		});
		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:capy-default:default",
			tabId: "default",
			cacheKey: "tab:capy-default",
			event: "retention-state",
			retentionState: "warm",
		});

		let pane = getDashboardBrowserDiagnosticsSnapshotForTests().panes.find(
			(item) => item.paneId === "dashboard-web:capy-default:default",
		);
		expect(pane).toMatchObject({
			isActive: false,
			retentionState: "warm",
		});

		recordDashboardBrowserPaneEvent({
			paneId: "dashboard-web:capy-default:default",
			tabId: "default",
			cacheKey: "tab:capy-default",
			event: "unmounted",
			retentionState: "sleeping",
		});

		pane = getDashboardBrowserDiagnosticsSnapshotForTests().panes.find(
			(item) => item.paneId === "dashboard-web:capy-default:default",
		);
		expect(pane).toMatchObject({
			isActive: false,
			retentionState: "sleeping",
		});
	});

	it("records failed loads and renderer crashes without leaving stale ready/loading state", () => {
		resetDashboardBrowserDiagnosticsForTests();
		const paneId = "dashboard-web:devin-default:default";

		recordDashboardBrowserPaneEvent({
			paneId,
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "mounted",
			url: "https://app.devin.ai/org/exa",
		});
		recordDashboardBrowserPaneEvent({
			paneId,
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "dom-ready",
			url: "https://app.devin.ai/org/exa",
		});
		recordDashboardBrowserPaneEvent({
			paneId,
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "load-start",
			url: "https://app.devin.ai/org/exa",
		});
		recordDashboardBrowserPaneEvent({
			paneId,
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "did-fail-load",
			url: "https://app.devin.ai/org/exa",
			detail: "ERR_ABORTED",
		});

		let pane = getDashboardBrowserDiagnosticsSnapshotForTests().panes.find(
			(item) => item.paneId === paneId,
		);
		expect(pane).toMatchObject({
			failLoadCount: 1,
			isLoading: false,
			isMounted: true,
			isReady: true,
			loadCount: 1,
		});

		recordDashboardBrowserPaneEvent({
			paneId,
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "load-start",
			url: "https://app.devin.ai/org/exa",
		});
		recordDashboardBrowserPaneEvent({
			paneId,
			tabId: "default",
			cacheKey: "tab:devin-default",
			event: "render-process-gone",
			url: "https://app.devin.ai/org/exa",
			detail: "crashed",
		});

		pane = getDashboardBrowserDiagnosticsSnapshotForTests().panes.find(
			(item) => item.paneId === paneId,
		);
		expect(pane).toMatchObject({
			isLoading: false,
			isMounted: true,
			isReady: false,
			renderGoneCount: 1,
		});
		expect(
			getDashboardBrowserDiagnosticsSnapshotForTests().events.some(
				(event) =>
					event.event === "render-process-gone" && event.detail === "crashed",
			),
		).toBe(true);
	});
});
