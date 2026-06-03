export type DashboardViewMruDirection = "next" | "previous";

export interface DashboardViewMruEntry {
	path: string;
	viewedAt: number;
}

type DashboardViewMruStorage = Pick<Storage, "getItem" | "setItem">;

export const DASHBOARD_VIEW_MRU_STORAGE_KEY = "dashboard-view-mru-v1";
export const DASHBOARD_VIEW_MRU_MAX_ENTRIES = 40;
export const DASHBOARD_VIEW_MRU_SWITCH_TTL_MS = 1500;

function getLocalStorage(): DashboardViewMruStorage | null {
	if (typeof localStorage === "undefined") return null;
	return localStorage;
}

function stripUrlNoise(pathname: string): string {
	const queryIndex = pathname.indexOf("?");
	const hashIndex = pathname.indexOf("#");
	const cutoffs = [queryIndex, hashIndex].filter((index) => index >= 0);
	const path =
		cutoffs.length === 0
			? pathname
			: pathname.substring(0, Math.min(...cutoffs));
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function normalizeDashboardViewMruPath(pathname: string): string | null {
	const path = stripUrlNoise(pathname);
	if (path === "/workspace" || path.startsWith("/workspace/")) return path;
	if (path === "/v2-workspace" || path.startsWith("/v2-workspace/")) {
		return path;
	}
	if (path === "/web" || path.startsWith("/web/")) return path;
	if (path === "/web-tabs" || path.startsWith("/web-tabs/")) return path;
	if (path === "/native/capy" || path.startsWith("/native/capy/")) return path;
	if (path === "/native/devin" || path.startsWith("/native/devin/")) {
		return path;
	}
	if (path === "/tasks" || path.startsWith("/tasks/")) return path;
	if (path === "/automations" || path.startsWith("/automations/")) return path;
	if (path.startsWith("/root-terminal/")) return path;
	return null;
}

export function readDashboardViewMruEntries(
	storage: DashboardViewMruStorage | null = getLocalStorage(),
): DashboardViewMruEntry[] {
	if (!storage) return [];
	const raw = storage.getItem(DASHBOARD_VIEW_MRU_STORAGE_KEY);
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];

		const seen = new Set<string>();
		const entries: DashboardViewMruEntry[] = [];
		for (const entry of parsed) {
			if (!entry || typeof entry !== "object") continue;
			const record = entry as Record<string, unknown>;
			const path =
				typeof record.path === "string"
					? normalizeDashboardViewMruPath(record.path)
					: null;
			const viewedAt =
				typeof record.viewedAt === "number" && Number.isFinite(record.viewedAt)
					? record.viewedAt
					: 0;
			if (!path || seen.has(path)) continue;
			seen.add(path);
			entries.push({ path, viewedAt });
			if (entries.length >= DASHBOARD_VIEW_MRU_MAX_ENTRIES) break;
		}
		return entries;
	} catch {
		return [];
	}
}

export function writeDashboardViewMruEntries(
	entries: DashboardViewMruEntry[],
	storage: DashboardViewMruStorage | null = getLocalStorage(),
): void {
	if (!storage) return;
	storage.setItem(
		DASHBOARD_VIEW_MRU_STORAGE_KEY,
		JSON.stringify(entries.slice(0, DASHBOARD_VIEW_MRU_MAX_ENTRIES)),
	);
}

export function recordDashboardViewMruPath(
	pathname: string,
	storage: DashboardViewMruStorage | null = getLocalStorage(),
	now = Date.now(),
): DashboardViewMruEntry[] {
	const path = normalizeDashboardViewMruPath(pathname);
	const entries = readDashboardViewMruEntries(storage);
	if (!path) return entries;

	const next = [
		{ path, viewedAt: now },
		...entries.filter((entry) => entry.path !== path),
	].slice(0, DASHBOARD_VIEW_MRU_MAX_ENTRIES);
	writeDashboardViewMruEntries(next, storage);
	return next;
}

export function dashboardViewMruTargetPath(input: {
	currentPathname: string;
	direction: DashboardViewMruDirection;
	entries: DashboardViewMruEntry[];
}): { index: number; path: string } | null {
	if (input.entries.length < 2) return null;
	const currentPath = normalizeDashboardViewMruPath(input.currentPathname);
	const currentIndex = currentPath
		? input.entries.findIndex((entry) => entry.path === currentPath)
		: -1;
	const delta = input.direction === "next" ? 1 : -1;
	const targetIndex =
		currentIndex === -1
			? 0
			: (currentIndex + delta + input.entries.length) % input.entries.length;
	const target = input.entries[targetIndex];
	if (!target || target.path === currentPath) return null;
	return { index: targetIndex, path: target.path };
}
