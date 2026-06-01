import { describe, expect, it } from "bun:test";
import { resolveDashboardWebRouteActivation } from "./dashboardWebRouteActivation";

describe("resolveDashboardWebRouteActivation", () => {
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
});
