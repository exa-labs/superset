export type DashboardViewMruDirection = "next" | "previous";

export interface DashboardViewMruEntry {
	path: string;
	viewedAt: number;
}

export interface DashboardViewMruDisplayEntry extends DashboardViewMruEntry {
	index: number;
	subtitle: string;
	title: string;
}

export interface DashboardViewMruEntryLabel {
	subtitle: string;
	title: string;
}

export type DashboardViewMruEntryLabelResolver = (
	path: string,
) => DashboardViewMruEntryLabel | null;

type DashboardViewMruStorage = Pick<Storage, "getItem" | "setItem">;

export const DASHBOARD_VIEW_MRU_STORAGE_KEY = "dashboard-view-mru-v1";
export const DASHBOARD_VIEW_MRU_MAX_ENTRIES = 40;
export const DASHBOARD_VIEW_MRU_SWITCH_TTL_MS = 1500;
export const DASHBOARD_VIEW_MRU_OVERLAY_MAX_ENTRIES = 7;

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
	if (path === "/v2-workspaces") return path;
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

export function resolveDashboardViewMruPathname(input: {
	hashPathname: string | null;
	locationPathname: string;
}): string {
	const hashMruPath = input.hashPathname
		? normalizeDashboardViewMruPath(input.hashPathname)
		: null;
	return hashMruPath ?? input.locationPathname;
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

function titleCase(value: string): string {
	const decoded = decodeURIComponent(value);
	return decoded
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function segmentAt(path: string, index: number): string | null {
	return path.split("/").filter(Boolean)[index] ?? null;
}

export function dashboardViewMruEntryLabel(
	path: string,
): DashboardViewMruEntryLabel {
	const normalized = normalizeDashboardViewMruPath(path) ?? path;
	const first = segmentAt(normalized, 0);
	const second = segmentAt(normalized, 1);

	if (first === "web") {
		return {
			subtitle: "Pinned web",
			title: second ? titleCase(second) : "Pinned web",
		};
	}
	if (first === "web-tabs") {
		return {
			subtitle: second ?? "Chrome tabs",
			title: "Chrome",
		};
	}
	if (first === "native") {
		const provider = second === "devin" ? "Devin" : "Capy";
		const id = segmentAt(normalized, 2);
		return {
			subtitle: id ?? `${provider} inbox`,
			title: id ? `${provider} session` : provider,
		};
	}
	if (first === "v2-workspaces") {
		return {
			subtitle: "Dashboard",
			title: "Workspaces",
		};
	}
	if (first === "workspace" || first === "v2-workspace") {
		return {
			subtitle: second ?? "Local workspace",
			title: "Workspace",
		};
	}
	if (first === "root-terminal") {
		return {
			subtitle: second ?? "Root terminal",
			title: "Root terminal",
		};
	}
	if (first === "tasks") return { subtitle: "Dashboard", title: "Tasks & PRs" };
	if (first === "automations") {
		return { subtitle: "Dashboard", title: "Automations" };
	}
	return { subtitle: normalized, title: titleCase(first ?? "Dashboard") };
}

export function dashboardViewMruVisibleEntries(input: {
	activeIndex: number;
	entries: DashboardViewMruEntry[];
	labelResolver?: DashboardViewMruEntryLabelResolver;
	maxEntries?: number;
}): DashboardViewMruDisplayEntry[] {
	const maxEntries = Math.max(
		1,
		input.maxEntries ?? DASHBOARD_VIEW_MRU_OVERLAY_MAX_ENTRIES,
	);
	if (input.entries.length <= maxEntries) {
		return input.entries.map((entry, index) => ({
			...entry,
			index,
			...(input.labelResolver?.(entry.path) ??
				dashboardViewMruEntryLabel(entry.path)),
		}));
	}

	const activeIndex = Math.max(
		0,
		Math.min(input.entries.length - 1, input.activeIndex),
	);
	const halfWindow = Math.floor(maxEntries / 2);
	const start = Math.max(
		0,
		Math.min(input.entries.length - maxEntries, activeIndex - halfWindow),
	);
	return input.entries.slice(start, start + maxEntries).map((entry, offset) => {
		const index = start + offset;
		return {
			...entry,
			index,
			...(input.labelResolver?.(entry.path) ??
				dashboardViewMruEntryLabel(entry.path)),
		};
	});
}
