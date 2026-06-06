import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_BROWSER_CURRENT_ACTION_EVENT,
	dashboardBrowserCurrentActionEventDetail,
	dispatchDashboardBrowserCurrentAction,
	isDashboardBrowserCurrentAction,
} from "./dashboard-browser-current-actions";

describe("dashboard browser current action events", () => {
	it("validates browser current action details", () => {
		expect(isDashboardBrowserCurrentAction("new-current-url-tab")).toBe(true);
		expect(isDashboardBrowserCurrentAction("new-google-tab")).toBe(true);
		expect(isDashboardBrowserCurrentAction("widen-active-split")).toBe(true);
		expect(isDashboardBrowserCurrentAction("unknown")).toBe(false);

		expect(
			dashboardBrowserCurrentActionEventDetail(
				new CustomEvent(DASHBOARD_BROWSER_CURRENT_ACTION_EVENT, {
					detail: { action: "new-current-url-tab" },
				}),
			),
		).toEqual({ action: "new-current-url-tab" });
		expect(
			dashboardBrowserCurrentActionEventDetail(
				new CustomEvent(DASHBOARD_BROWSER_CURRENT_ACTION_EVENT, {
					detail: { action: "unknown" },
				}),
			),
		).toBeNull();
	});

	it("reports handled browser actions only when a listener accepts them", () => {
		const originalWindow = globalThis.window;
		const testWindow = new EventTarget();
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: testWindow,
		});

		try {
			expect(
				dispatchDashboardBrowserCurrentAction({
					action: "new-current-url-tab",
				}),
			).toBe(false);

			const listener = (event: Event) => {
				expect(dashboardBrowserCurrentActionEventDetail(event)).toEqual({
					action: "new-current-url-tab",
				});
				event.preventDefault();
			};
			window.addEventListener(DASHBOARD_BROWSER_CURRENT_ACTION_EVENT, listener);
			expect(
				dispatchDashboardBrowserCurrentAction({
					action: "new-current-url-tab",
				}),
			).toBe(true);
			window.removeEventListener(
				DASHBOARD_BROWSER_CURRENT_ACTION_EVENT,
				listener,
			);
		} finally {
			if (originalWindow) {
				Object.defineProperty(globalThis, "window", {
					configurable: true,
					value: originalWindow,
				});
			} else {
				delete (globalThis as { window?: unknown }).window;
			}
		}
	});
});
