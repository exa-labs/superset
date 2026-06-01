import type { DashboardWebPage } from "./dashboard-web-pages";

const STORAGE_KEY = "dashboard-web-page-favicons-v3";

type FaviconMap = Record<string, string>;
type Listener = () => void;

let faviconMap: FaviconMap | null = null;
const listeners = new Set<Listener>();

function readStoredFavicons(): FaviconMap {
	if (faviconMap) return faviconMap;
	if (typeof localStorage === "undefined") {
		faviconMap = {};
		return faviconMap;
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			faviconMap = {};
			return faviconMap;
		}
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			faviconMap = {};
			return faviconMap;
		}
		faviconMap = Object.fromEntries(
			Object.entries(parsed).filter(
				(entry): entry is [string, string] => typeof entry[1] === "string",
			),
		);
		return faviconMap;
	} catch {
		faviconMap = {};
		return faviconMap;
	}
}

function writeStoredFavicons(next: FaviconMap) {
	faviconMap = next;
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {}
}

function notifyListeners() {
	for (const listener of listeners) listener();
}

export function subscribeDashboardWebPageFavicons(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getDashboardWebPageFavicon(
	page: DashboardWebPage,
): string | null {
	return readStoredFavicons()[page.id] ?? page.fallbackFaviconUrl ?? null;
}

export function setDashboardWebPageFavicon(pageId: string, faviconUrl: string) {
	const trimmedUrl = faviconUrl.trim();
	if (!trimmedUrl) return;

	const current = readStoredFavicons();
	if (current[pageId] === trimmedUrl) return;

	writeStoredFavicons({ ...current, [pageId]: trimmedUrl });
	notifyListeners();
}
