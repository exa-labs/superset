export const DASHBOARD_WEB_TAB_APPS = [
	{
		id: "chrome",
		label: "Chrome",
		url: "https://www.google.com/search?q=",
		fallbackFaviconUrl: "https://www.google.com/favicon.ico",
	},
] as const;

const STORAGE_KEY = "dashboard-web-tabs-v1";
const CLOSED_DEFAULT_TABS_STORAGE_KEY = "dashboard-web-tabs-closed-defaults-v1";
const FOLDERS_STORAGE_KEY = "dashboard-web-tab-folders-v1";
const CHANGE_EVENT = "dashboard-web-tabs-change";

export type DashboardWebTabApp = (typeof DASHBOARD_WEB_TAB_APPS)[number];
export type DashboardWebTabAppId = DashboardWebTabApp["id"];

export interface DashboardWebTab {
	id: string;
	appId: DashboardWebTabAppId;
	title: string;
	browserTitle: string | null;
	isTitleCustomized: boolean;
	url: string;
	faviconUrl: string | null;
	folderId: string | null;
	isPinned: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface DashboardWebTabFolder {
	id: string;
	appId: DashboardWebTabAppId;
	title: string;
	isCollapsed: boolean;
	createdAt: number;
	updatedAt: number;
}

interface CreateDashboardWebTabOptions {
	title?: string;
	url?: string;
	folderId?: string | null;
	isPinned?: boolean;
}

type Listener = () => void;

let tabsCache: DashboardWebTab[] | null = null;
let foldersCache: DashboardWebTabFolder[] | null = null;
const listeners = new Set<Listener>();

function isKnownAppId(appId: string): appId is DashboardWebTabAppId {
	return DASHBOARD_WEB_TAB_APPS.some((app) => app.id === appId);
}

export function getDashboardWebTabApp(
	appId: DashboardWebTabAppId,
): DashboardWebTabApp {
	const app = DASHBOARD_WEB_TAB_APPS.find((item) => item.id === appId);
	if (app) return app;
	throw new Error(`Unknown dashboard web tab app: ${appId}`);
}

function makeDefaultTabs(): DashboardWebTab[] {
	return DASHBOARD_WEB_TAB_APPS.map((app) => ({
		id: `${app.id}-default`,
		appId: app.id,
		title: app.label,
		browserTitle: null,
		isTitleCustomized: false,
		url: app.url,
		faviconUrl: null,
		folderId: null,
		isPinned: false,
		createdAt: 0,
		updatedAt: 0,
	}));
}

function normalizeTab(tab: unknown): DashboardWebTab | null {
	if (!tab || typeof tab !== "object" || Array.isArray(tab)) return null;
	const record = tab as Record<string, unknown>;
	if (typeof record.id !== "string") return null;
	if (typeof record.appId !== "string" || !isKnownAppId(record.appId)) {
		return null;
	}
	const app = getDashboardWebTabApp(record.appId);
	const title = typeof record.title === "string" ? record.title.trim() : "";
	const browserTitle =
		typeof record.browserTitle === "string" && record.browserTitle.trim()
			? record.browserTitle.trim()
			: null;
	const url = typeof record.url === "string" ? record.url.trim() : "";
	const faviconUrl =
		typeof record.faviconUrl === "string" && record.faviconUrl.trim()
			? record.faviconUrl.trim()
			: null;
	const folderId =
		typeof record.folderId === "string" && record.folderId.trim()
			? record.folderId.trim()
			: null;
	return {
		id: record.id,
		appId: record.appId,
		title: title || app.label,
		browserTitle,
		isTitleCustomized: record.isTitleCustomized === true,
		url: url || app.url,
		faviconUrl,
		folderId,
		isPinned: record.isPinned === true,
		createdAt:
			typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
				? record.createdAt
				: Date.now(),
		updatedAt:
			typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
				? record.updatedAt
				: Date.now(),
	};
}

function normalizeFolder(folder: unknown): DashboardWebTabFolder | null {
	if (!folder || typeof folder !== "object" || Array.isArray(folder)) {
		return null;
	}
	const record = folder as Record<string, unknown>;
	if (typeof record.id !== "string") return null;
	if (typeof record.appId !== "string" || !isKnownAppId(record.appId)) {
		return null;
	}
	const title = typeof record.title === "string" ? record.title.trim() : "";
	const now = Date.now();
	return {
		id: record.id,
		appId: record.appId,
		title: title || "Folder",
		isCollapsed: record.isCollapsed === true,
		createdAt:
			typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
				? record.createdAt
				: now,
		updatedAt:
			typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
				? record.updatedAt
				: now,
	};
}

function readClosedDefaultTabIds(): Set<string> {
	if (typeof localStorage === "undefined") return new Set();

	try {
		const raw = localStorage.getItem(CLOSED_DEFAULT_TABS_STORAGE_KEY);
		if (!raw) return new Set();
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return new Set();
		return new Set(
			parsed.filter((tabId): tabId is string => typeof tabId === "string"),
		);
	} catch {
		return new Set();
	}
}

function writeClosedDefaultTabIds(tabIds: Set<string>) {
	if (typeof localStorage === "undefined") return;

	try {
		localStorage.setItem(
			CLOSED_DEFAULT_TABS_STORAGE_KEY,
			JSON.stringify([...tabIds]),
		);
	} catch {}
}

function isDefaultTab(tab: DashboardWebTab): boolean {
	return tab.id === `${tab.appId}-default`;
}

function ensureDefaultTabs(tabs: DashboardWebTab[]): DashboardWebTab[] {
	const closedDefaultTabIds = readClosedDefaultTabIds();
	const existingIds = new Set(tabs.map((tab) => tab.id));
	const missingDefaults = makeDefaultTabs().filter(
		(tab) => !existingIds.has(tab.id) && !closedDefaultTabIds.has(tab.id),
	);
	return [...missingDefaults, ...tabs];
}

function readStoredFolders(): DashboardWebTabFolder[] {
	if (foldersCache) return foldersCache;
	if (typeof localStorage === "undefined") {
		foldersCache = [];
		return foldersCache;
	}

	try {
		const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
		if (!raw) {
			foldersCache = [];
			return foldersCache;
		}
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) {
			foldersCache = [];
			return foldersCache;
		}
		foldersCache = parsed
			.map(normalizeFolder)
			.filter((folder): folder is DashboardWebTabFolder => folder !== null);
		return foldersCache;
	} catch {
		foldersCache = [];
		return foldersCache;
	}
}

function writeStoredFolders(next: DashboardWebTabFolder[]) {
	foldersCache = next;
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(next));
	} catch {}
}

function validFolderIdForTab(tab: DashboardWebTab): string | null {
	if (!tab.folderId) return null;
	const folder = readStoredFolders().find((item) => item.id === tab.folderId);
	return folder?.appId === tab.appId ? folder.id : null;
}

function readStoredTabs(): DashboardWebTab[] {
	if (tabsCache) return tabsCache;
	if (typeof localStorage === "undefined") {
		tabsCache = makeDefaultTabs();
		return tabsCache;
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			tabsCache = makeDefaultTabs();
			return tabsCache;
		}
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) {
			tabsCache = makeDefaultTabs();
			return tabsCache;
		}
		tabsCache = ensureDefaultTabs(
			parsed
				.map(normalizeTab)
				.filter((tab): tab is DashboardWebTab => tab !== null),
		).map((tab) => ({ ...tab, folderId: validFolderIdForTab(tab) }));
		return tabsCache;
	} catch {
		tabsCache = makeDefaultTabs();
		return tabsCache;
	}
}

function writeStoredTabs(next: DashboardWebTab[]) {
	tabsCache = next;
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {}
}

function notifyListeners() {
	for (const listener of listeners) listener();
}

function dispatchChangeEvent() {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

function notifyStoreChanged() {
	if (typeof window === "undefined") {
		notifyListeners();
		return;
	}
	dispatchChangeEvent();
}

function invalidateCaches() {
	tabsCache = null;
	foldersCache = null;
}

function makeTabId(appId: DashboardWebTabAppId): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return `${appId}-${crypto.randomUUID()}`;
	}
	return `${appId}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2)}`;
}

function makeFolderId(appId: DashboardWebTabAppId): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return `${appId}-folder-${crypto.randomUUID()}`;
	}
	return `${appId}-folder-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2)}`;
}

export function subscribeDashboardWebTabs(listener: Listener) {
	listeners.add(listener);
	if (typeof window === "undefined") {
		return () => listeners.delete(listener);
	}

	const handleExternalChange = () => {
		invalidateCaches();
		listener();
	};
	const handleStorageChange = (event: StorageEvent) => {
		if (
			event.key !== STORAGE_KEY &&
			event.key !== FOLDERS_STORAGE_KEY &&
			event.key !== CLOSED_DEFAULT_TABS_STORAGE_KEY
		) {
			return;
		}
		handleExternalChange();
	};

	window.addEventListener(CHANGE_EVENT, handleExternalChange);
	window.addEventListener("storage", handleStorageChange);

	return () => {
		listeners.delete(listener);
		window.removeEventListener(CHANGE_EVENT, handleExternalChange);
		window.removeEventListener("storage", handleStorageChange);
	};
}

export function getDashboardWebTabs(): DashboardWebTab[] {
	return readStoredTabs();
}

export function getDashboardWebTabFolders(): DashboardWebTabFolder[] {
	return readStoredFolders();
}

export function getDashboardWebTab(
	tabId: string | undefined,
): DashboardWebTab | null {
	if (!tabId) return null;
	return readStoredTabs().find((tab) => tab.id === tabId) ?? null;
}

export function getDashboardWebTabFolder(
	folderId: string | null | undefined,
): DashboardWebTabFolder | null {
	if (!folderId) return null;
	return readStoredFolders().find((folder) => folder.id === folderId) ?? null;
}

export function getFirstDashboardWebTabForApp(
	appId: DashboardWebTabAppId,
): DashboardWebTab | null {
	return readStoredTabs().find((tab) => tab.appId === appId) ?? null;
}

export function getDashboardWebTabFavicon(tab: DashboardWebTab): string | null {
	return tab.faviconUrl ?? getDashboardWebTabApp(tab.appId).fallbackFaviconUrl;
}

export function createDashboardWebTab(
	appId: DashboardWebTabAppId,
	options: CreateDashboardWebTabOptions = {},
): DashboardWebTab {
	const app = getDashboardWebTabApp(appId);
	const tabs = readStoredTabs();
	const count = tabs.filter((tab) => tab.appId === appId).length + 1;
	const now = Date.now();
	const title = options.title?.trim();
	const url = options.url?.trim();
	const folder =
		options.folderId == null
			? null
			: getDashboardWebTabFolder(options.folderId);
	const tab: DashboardWebTab = {
		id: makeTabId(appId),
		appId,
		title: title || (count <= 1 ? app.label : `${app.label} ${count}`),
		browserTitle: null,
		isTitleCustomized: false,
		url: url || app.url,
		faviconUrl: null,
		folderId: folder?.appId === appId ? folder.id : null,
		isPinned: options.isPinned === true,
		createdAt: now,
		updatedAt: now,
	};
	writeStoredTabs([...tabs, tab]);
	notifyStoreChanged();
	return tab;
}

export function createDashboardWebTabFolder(
	appId: DashboardWebTabAppId,
	title = "Folder",
): DashboardWebTabFolder {
	const now = Date.now();
	const trimmedTitle = title.trim();
	const folder: DashboardWebTabFolder = {
		id: makeFolderId(appId),
		appId,
		title: trimmedTitle || "Folder",
		isCollapsed: false,
		createdAt: now,
		updatedAt: now,
	};
	writeStoredFolders([...readStoredFolders(), folder]);
	notifyStoreChanged();
	return folder;
}

export function renameDashboardWebTabFolder(folderId: string, title: string) {
	const trimmedTitle = title.trim();
	if (!trimmedTitle) return;
	const folders = readStoredFolders();
	const folder = folders.find((item) => item.id === folderId);
	if (!folder || folder.title === trimmedTitle) return;

	writeStoredFolders(
		folders.map((item) =>
			item.id === folderId
				? { ...item, title: trimmedTitle, updatedAt: Date.now() }
				: item,
		),
	);
	notifyStoreChanged();
}

export function setDashboardWebTabFolderCollapsed(
	folderId: string,
	isCollapsed: boolean,
) {
	const folders = readStoredFolders();
	const folder = folders.find((item) => item.id === folderId);
	if (!folder || folder.isCollapsed === isCollapsed) return;

	writeStoredFolders(
		folders.map((item) =>
			item.id === folderId
				? { ...item, isCollapsed, updatedAt: Date.now() }
				: item,
		),
	);
	notifyStoreChanged();
}

export function deleteDashboardWebTabFolder(folderId: string) {
	const folders = readStoredFolders();
	if (!folders.some((folder) => folder.id === folderId)) return;

	writeStoredFolders(folders.filter((folder) => folder.id !== folderId));
	writeStoredTabs(
		readStoredTabs().map((tab) =>
			tab.folderId === folderId
				? { ...tab, folderId: null, updatedAt: Date.now() }
				: tab,
		),
	);
	notifyStoreChanged();
}

export function moveDashboardWebTabToFolder(
	tabId: string,
	folderId: string | null,
) {
	const tabs = readStoredTabs();
	const tab = tabs.find((item) => item.id === tabId);
	if (!tab) return;

	const folder = folderId ? getDashboardWebTabFolder(folderId) : null;
	const nextFolderId = folder?.appId === tab.appId ? folder.id : null;
	if (tab.folderId === nextFolderId) return;

	writeStoredTabs(
		tabs.map((item) =>
			item.id === tabId
				? { ...item, folderId: nextFolderId, updatedAt: Date.now() }
				: item,
		),
	);
	notifyStoreChanged();
}

export function setDashboardWebTabPinned(tabId: string, isPinned: boolean) {
	const tabs = readStoredTabs();
	const tab = tabs.find((item) => item.id === tabId);
	if (!tab || tab.isPinned === isPinned) return;

	writeStoredTabs(
		tabs.map((item) =>
			item.id === tabId ? { ...item, isPinned, updatedAt: Date.now() } : item,
		),
	);
	notifyStoreChanged();
}

export function renameDashboardWebTab(tabId: string, title: string) {
	const trimmedTitle = title.trim();
	if (!trimmedTitle) return;
	const tabs = readStoredTabs();
	const next = tabs.map((tab) =>
		tab.id === tabId
			? {
					...tab,
					title: trimmedTitle,
					isTitleCustomized: true,
					updatedAt: Date.now(),
				}
			: tab,
	);
	writeStoredTabs(next);
	notifyStoreChanged();
}

export function closeDashboardWebTab(tabId: string): DashboardWebTab | null {
	const tabs = readStoredTabs();
	const closedIndex = tabs.findIndex((tab) => tab.id === tabId);
	if (closedIndex === -1) return null;

	const closedTab = tabs[closedIndex];
	if (!closedTab) return null;

	if (isDefaultTab(closedTab)) {
		const closedDefaultTabIds = readClosedDefaultTabIds();
		closedDefaultTabIds.add(closedTab.id);
		writeClosedDefaultTabIds(closedDefaultTabIds);
	}

	const nextTabs = tabs.filter((tab) => tab.id !== tabId);
	writeStoredTabs(nextTabs);
	notifyStoreChanged();

	const sameAppTabs = nextTabs.filter((tab) => tab.appId === closedTab.appId);
	if (sameAppTabs.length > 0) {
		return sameAppTabs[Math.min(closedIndex, sameAppTabs.length - 1)] ?? null;
	}

	if (nextTabs.length === 0) return null;
	return nextTabs[Math.min(closedIndex, nextTabs.length - 1)] ?? nextTabs[0];
}

export function setDashboardWebTabBrowserTitle(tabId: string, title: string) {
	const trimmedTitle = title.trim();
	if (!trimmedTitle) return;

	const tabs = readStoredTabs();
	const tab = tabs.find((item) => item.id === tabId);
	if (tab && trimmedTitle === getDashboardWebTabApp(tab.appId).label) return;
	if (
		!tab ||
		(tab.browserTitle === trimmedTitle &&
			(tab.isTitleCustomized || tab.title === trimmedTitle))
	) {
		return;
	}

	const next = tabs.map((item) =>
		item.id === tabId
			? {
					...item,
					browserTitle: trimmedTitle,
					title: item.isTitleCustomized ? item.title : trimmedTitle,
					updatedAt: Date.now(),
				}
			: item,
	);
	writeStoredTabs(next);
	notifyStoreChanged();
}

export function setDashboardWebTabUrl(tabId: string, url: string) {
	const trimmedUrl = url.trim();
	if (!trimmedUrl) return;

	const tabs = readStoredTabs();
	const tab = tabs.find((item) => item.id === tabId);
	if (!tab || tab.url === trimmedUrl) return;

	const next = tabs.map((item) =>
		item.id === tabId
			? { ...item, url: trimmedUrl, updatedAt: Date.now() }
			: item,
	);
	writeStoredTabs(next);
	notifyStoreChanged();
}

export function setDashboardWebTabFavicon(tabId: string, faviconUrl: string) {
	const trimmedUrl = faviconUrl.trim();
	if (!trimmedUrl) return;

	const tabs = readStoredTabs();
	const tab = tabs.find((item) => item.id === tabId);
	if (!tab || tab.faviconUrl === trimmedUrl) return;

	const next = tabs.map((item) =>
		item.id === tabId
			? { ...item, faviconUrl: trimmedUrl, updatedAt: Date.now() }
			: item,
	);
	writeStoredTabs(next);
	notifyStoreChanged();
}

export function resetDashboardWebTabsForTests() {
	tabsCache = null;
	foldersCache = null;
	listeners.clear();
}
