import { describe, expect, it } from "bun:test";
import { shouldDashboardBrowserWebViewReceivePointerEvents } from "./dashboard-browser-webview-interaction";

describe("shouldDashboardBrowserWebViewReceivePointerEvents", () => {
	it("allows visible browser panes to receive input only while their route is active", () => {
		expect(
			shouldDashboardBrowserWebViewReceivePointerEvents({
				isViewActive: true,
				placement: "full",
			}),
		).toBe(true);
		expect(
			shouldDashboardBrowserWebViewReceivePointerEvents({
				isViewActive: true,
				placement: "right",
			}),
		).toBe(true);
		expect(
			shouldDashboardBrowserWebViewReceivePointerEvents({
				isViewActive: false,
				placement: "full",
			}),
		).toBe(false);
	});

	it("keeps hidden warm tabs from intercepting clicks", () => {
		expect(
			shouldDashboardBrowserWebViewReceivePointerEvents({
				isViewActive: true,
				placement: "hidden",
			}),
		).toBe(false);
	});
});
