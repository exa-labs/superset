import { beforeEach, describe, expect, it } from "bun:test";
import {
	getDashboardWebPage,
	getDashboardWebPages,
	resetDashboardWebPagesForTests,
	setDashboardWebPageUrl,
	subscribeDashboardWebPages,
} from "./dashboard-web-pages";

const mockStorage = new Map<string, string>();
const mockLocalStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, value: string) => mockStorage.set(key, value),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear(),
};

// @ts-expect-error - mocking global localStorage for Bun's node-like test env.
globalThis.localStorage = mockLocalStorage;

describe("dashboard web pages", () => {
	beforeEach(() => {
		mockStorage.clear();
		resetDashboardWebPagesForTests();
	});

	it("persists exact current URLs for fixed dashboard pages", () => {
		const originalUrl = getDashboardWebPage("sulis")?.url;
		expect(originalUrl).toBe("https://sulis.internal.exa.ai/");

		let notificationCount = 0;
		const unsubscribe = subscribeDashboardWebPages(() => {
			notificationCount += 1;
		});

		const nextUrl =
			"https://sulis.internal.exa.ai/project/example?view=threads#activity";
		setDashboardWebPageUrl("sulis", nextUrl);

		expect(notificationCount).toBe(1);
		expect(getDashboardWebPage("sulis")?.url).toBe(nextUrl);

		setDashboardWebPageUrl("sulis", nextUrl);
		expect(notificationCount).toBe(1);

		resetDashboardWebPagesForTests();
		expect(getDashboardWebPage("sulis")?.url).toBe(nextUrl);

		unsubscribe();
	});

	it("returns stable snapshots for sync external store consumers", () => {
		const first = getDashboardWebPages();
		const second = getDashboardWebPages();
		expect(second).toBe(first);

		setDashboardWebPageUrl("overseer", "https://overseer.hephaestus.exa.ai/");

		const third = getDashboardWebPages();
		expect(third).not.toBe(first);
		expect(getDashboardWebPage("overseer")?.url).toBe(
			"https://overseer.hephaestus.exa.ai/",
		);
	});
});
