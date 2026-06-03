import { describe, expect, it } from "bun:test";
import {
	dashboardBrowserVimActionFromKey,
	nextDashboardBrowserTabId,
} from "./dashboard-browser-vim";

describe("dashboard browser vim", () => {
	it("maps scoped browser keys to browser actions", () => {
		expect(dashboardBrowserVimActionFromKey("n")).toBe("new-tab");
		expect(dashboardBrowserVimActionFromKey("r")).toBe("reload");
		expect(dashboardBrowserVimActionFromKey("s")).toBe("toggle-split");
		expect(dashboardBrowserVimActionFromKey("w")).toBe("swap-split");
		expect(dashboardBrowserVimActionFromKey("[")).toBe("narrow-active-split");
		expect(dashboardBrowserVimActionFromKey("]")).toBe("widen-active-split");
		expect(dashboardBrowserVimActionFromKey("=")).toBe("equalize-split");
		expect(dashboardBrowserVimActionFromKey("x")).toBe("close-tab");
		expect(dashboardBrowserVimActionFromKey("h")).toBe("previous-tab");
		expect(dashboardBrowserVimActionFromKey("l")).toBe("next-tab");
		expect(dashboardBrowserVimActionFromKey("j")).toBe("none");
	});

	it("wraps across browser tabs without changing the tab list", () => {
		const tabs = ["first", "second", "third"];

		expect(nextDashboardBrowserTabId(tabs, "first", 1)).toBe("second");
		expect(nextDashboardBrowserTabId(tabs, "third", 1)).toBe("first");
		expect(nextDashboardBrowserTabId(tabs, "first", -1)).toBe("third");
		expect(nextDashboardBrowserTabId(tabs, "missing", 1)).toBe("first");
		expect(nextDashboardBrowserTabId([], "first", 1)).toBeNull();
	});
});
