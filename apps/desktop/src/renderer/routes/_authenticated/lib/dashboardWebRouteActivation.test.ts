import { describe, expect, it } from "bun:test";
import {
	resolveDashboardWebPathname,
	resolveDashboardWebRouteActivation,
} from "./dashboardWebRouteActivation";

describe("resolveDashboardWebRouteActivation", () => {
	it("prefers the actual dashboard web hash over a stale router pathname", () => {
		expect(
			resolveDashboardWebPathname({
				hashPathname: "/web-tabs/chrome-default",
				locationPathname: "/web/overseer",
			}),
		).toBe("/web-tabs/chrome-default");
	});

	it("ignores a stale dashboard web hash on non-browser routes", () => {
		expect(
			resolveDashboardWebPathname({
				hashPathname: "/web-tabs/chrome-default",
				locationPathname: "/workspace/workspace-id",
			}),
		).toBe("/workspace/workspace-id");
	});

	it("ignores a stale dashboard web hash on native routes", () => {
		const pathname = resolveDashboardWebPathname({
			hashPathname: "/web-tabs/chrome-default",
			locationPathname: "/native/devin/devin-123",
		});

		expect(pathname).toBe("/native/devin/devin-123");
		expect(
			resolveDashboardWebRouteActivation({
				pathname,
				webPageMatch: false,
				webTabMatch: { tabId: "chrome-default" },
			}),
		).toEqual({
			activeWebPageId: null,
			activeWebTabId: null,
		});
	});

	it("keeps native routes inactive when the actual hash is native", () => {
		expect(
			resolveDashboardWebPathname({
				hashPathname: "/native/capy",
				locationPathname: "/native/capy",
			}),
		).toBe("/native/capy");
	});

	it("prefers native hashes over stale browser pathnames", () => {
		const pathname = resolveDashboardWebPathname({
			hashPathname: "/native/devin/devin-123",
			locationPathname: "/web-tabs/chrome-default",
		});

		expect(pathname).toBe("/native/devin/devin-123");
		expect(
			resolveDashboardWebRouteActivation({
				pathname,
				webPageMatch: false,
				webTabMatch: { tabId: "chrome-default" },
			}),
		).toEqual({
			activeWebPageId: null,
			activeWebTabId: null,
		});
	});

	it("does not let /web fuzzy matches activate while a web tab route is active", () => {
		expect(
			resolveDashboardWebRouteActivation({
				pathname: "/web-tabs/devin-default",
				webPageMatch: { pageId: "sulis" },
				webTabMatch: { tabId: "devin-default" },
			}),
		).toEqual({
			activeWebPageId: null,
			activeWebTabId: "devin-default",
		});
	});

	it("does not let /web-tabs fuzzy matches activate while a fixed web page route is active", () => {
		expect(
			resolveDashboardWebRouteActivation({
				pathname: "/web/sulis",
				webPageMatch: { pageId: "sulis" },
				webTabMatch: { tabId: "devin-default" },
			}),
		).toEqual({
			activeWebPageId: "sulis",
			activeWebTabId: null,
		});
	});

	it("ignores both dashboard browser targets on unrelated routes", () => {
		expect(
			resolveDashboardWebRouteActivation({
				pathname: "/settings/account",
				webPageMatch: { pageId: "sulis" },
				webTabMatch: { tabId: "devin-default" },
			}),
		).toEqual({
			activeWebPageId: null,
			activeWebTabId: null,
		});
	});

	it("falls back to path parsing when hash-router match objects are unavailable", () => {
		expect(
			resolveDashboardWebRouteActivation({
				pathname: "/web-tabs/chrome-default",
				webPageMatch: false,
				webTabMatch: false,
			}),
		).toEqual({
			activeWebPageId: null,
			activeWebTabId: "chrome-default",
		});
	});

	it("prefers the parsed tab pathname over a stale fuzzy match", () => {
		expect(
			resolveDashboardWebRouteActivation({
				pathname: "/web-tabs/chrome-new",
				webPageMatch: false,
				webTabMatch: { tabId: "chrome-default" },
			}),
		).toEqual({
			activeWebPageId: null,
			activeWebTabId: "chrome-new",
		});
	});
});
