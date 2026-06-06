import { beforeEach, describe, expect, it } from "bun:test";
import {
	createDashboardWebTabFolder,
	cycleDashboardWebTabFolderColor,
	DASHBOARD_WEB_TAB_FOLDER_COLORS,
	deleteDashboardWebTabFolder,
	getDashboardWebTab,
	getDashboardWebTabFolder,
	getDashboardWebTabFolders,
	getDashboardWebTabs,
	moveDashboardWebTabToFolder,
	renameDashboardWebTabFolder,
	resetDashboardWebTabsForTests,
	setDashboardWebTabFolderCollapsed,
	setDashboardWebTabFolderColor,
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

		const nextUrl = "https://www.google.com/search?q=clankee#activity";
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
		expect(getDashboardWebTabFolder(folder.id)?.color).toBe(
			DASHBOARD_WEB_TAB_FOLDER_COLORS[0],
		);
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

	it("renames folders and ignores blank folder names", () => {
		let notificationCount = 0;
		const unsubscribe = subscribeDashboardWebTabs(() => {
			notificationCount += 1;
		});
		const folder = createDashboardWebTabFolder("chrome", "Research");

		renameDashboardWebTabFolder(folder.id, " Dashboards ");
		renameDashboardWebTabFolder(folder.id, "   ");

		expect(notificationCount).toBe(2);
		expect(getDashboardWebTabFolder(folder.id)?.title).toBe("Dashboards");

		resetDashboardWebTabsForTests();
		expect(getDashboardWebTabFolder(folder.id)?.title).toBe("Dashboards");

		unsubscribe();
	});

	it("deletes folders while preserving their tabs", () => {
		let notificationCount = 0;
		const unsubscribe = subscribeDashboardWebTabs(() => {
			notificationCount += 1;
		});
		const folder = createDashboardWebTabFolder("chrome", "Research");
		moveDashboardWebTabToFolder("chrome-default", folder.id);

		deleteDashboardWebTabFolder(folder.id);

		expect(notificationCount).toBe(3);
		expect(getDashboardWebTabFolder(folder.id)).toBeNull();
		expect(getDashboardWebTab("chrome-default")).toMatchObject({
			folderId: null,
		});

		resetDashboardWebTabsForTests();
		expect(getDashboardWebTabFolder(folder.id)).toBeNull();
		expect(getDashboardWebTab("chrome-default")).toMatchObject({
			folderId: null,
		});

		unsubscribe();
	});

	it("persists and safely cycles folder colors", () => {
		let notificationCount = 0;
		const unsubscribe = subscribeDashboardWebTabs(() => {
			notificationCount += 1;
		});
		const folder = createDashboardWebTabFolder("chrome", "Research");

		expect(getDashboardWebTabFolder(folder.id)?.color).toBe(
			DASHBOARD_WEB_TAB_FOLDER_COLORS[0],
		);

		setDashboardWebTabFolderColor(folder.id, "#AABBCC");
		setDashboardWebTabFolderColor(folder.id, "not-a-color");

		expect(notificationCount).toBe(2);
		expect(getDashboardWebTabFolder(folder.id)?.color).toBe("#aabbcc");

		cycleDashboardWebTabFolderColor(folder.id);
		expect(notificationCount).toBe(3);
		expect(getDashboardWebTabFolder(folder.id)?.color).toBe(
			DASHBOARD_WEB_TAB_FOLDER_COLORS[0],
		);

		resetDashboardWebTabsForTests();
		expect(getDashboardWebTabFolder(folder.id)?.color).toBe(
			DASHBOARD_WEB_TAB_FOLDER_COLORS[0],
		);

		unsubscribe();
	});
});
