import { beforeEach, describe, expect, it } from "bun:test";
import {
	createDashboardWebTabFolder,
	getDashboardWebTab,
	getDashboardWebTabFolder,
	getDashboardWebTabFolders,
	getDashboardWebTabs,
	moveDashboardWebTabToFolder,
	resetDashboardWebTabsForTests,
	setDashboardWebTabFolderCollapsed,
	setDashboardWebTabPinned,
	setDashboardWebTabUrl,
	subscribeDashboardWebTabs,
} from "./dashboard-web-tabs";

const mockStorage = new Map<string, string>();
const mockLocalStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, value: string) => mockStorage.set(key, value),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear(),
};

// @ts-expect-error - mocking global localStorage for Bun's node-like test env.
globalThis.localStorage = mockLocalStorage;

describe("dashboard web tabs", () => {
	beforeEach(() => {
		mockStorage.clear();
		resetDashboardWebTabsForTests();
	});

	it("notifies subscribers and persists exact URL changes", () => {
		expect(
			getDashboardWebTabs().some((tab) => tab.id === "chrome-default"),
		).toBe(true);

		let notificationCount = 0;
		const unsubscribe = subscribeDashboardWebTabs(() => {
			notificationCount += 1;
		});

		const nextUrl =
			"https://www.google.com/search?q=clankee#activity";
		setDashboardWebTabUrl("chrome-default", nextUrl);

		expect(notificationCount).toBe(1);
		expect(getDashboardWebTab("chrome-default")?.url).toBe(nextUrl);

		setDashboardWebTabUrl("chrome-default", nextUrl);
		expect(notificationCount).toBe(1);

		unsubscribe();
	});

	it("persists folder organization and pinned state", () => {
		let notificationCount = 0;
		const unsubscribe = subscribeDashboardWebTabs(() => {
			notificationCount += 1;
		});

		const folder = createDashboardWebTabFolder("chrome", "Research");
		moveDashboardWebTabToFolder("chrome-default", folder.id);
		setDashboardWebTabPinned("chrome-default", true);
		setDashboardWebTabFolderCollapsed(folder.id, true);

		expect(notificationCount).toBe(4);
		expect(getDashboardWebTabFolders()).toHaveLength(1);
		expect(getDashboardWebTabFolder(folder.id)?.isCollapsed).toBe(true);
		expect(getDashboardWebTab("chrome-default")).toMatchObject({
			folderId: folder.id,
			isPinned: true,
		});

		resetDashboardWebTabsForTests();
		expect(getDashboardWebTabFolder(folder.id)?.title).toBe("Research");
		expect(getDashboardWebTab("chrome-default")).toMatchObject({
			folderId: folder.id,
			isPinned: true,
		});

		unsubscribe();
	});
});
