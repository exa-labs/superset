import overseerIconUrl from "renderer/assets/web-page-icons/overseer.png";
import sulisIconUrl from "renderer/assets/web-page-icons/sulis.png";

const STORAGE_KEY = "dashboard-web-pages-v1";

export const DASHBOARD_WEB_PAGE_DEFINITIONS = [
	{
		id: "overseer",
		label: "Overseer",
		shortLabel: "Overseer",
		url: "https://overseer.hephaestus.exa.ai/?q=lakee#clusters",
		fallbackFaviconUrl: overseerIconUrl,
		hotkeyId: "OPEN_WEB_PAGE_1",
	},
	{
		id: "sulis",
		label: "Sulis",
		shortLabel: "Sulis",
		url: "https://sulis.internal.exa.ai/",
		fallbackFaviconUrl: sulisIconUrl,
		hotkeyId: "OPEN_WEB_PAGE_2",
	},
	{
		id: "inference-overview",
		label: "Inference Overview",
		shortLabel: "Inference",
		url: "https://grafana-prometheus.exa.ai/d/master-inference-overview/inference-overview?var-rate_interval=5m&var-request_rate_interval=5m&orgId=1&from=now-3h&to=now&timezone=browser&refresh=30s",
		fallbackFaviconUrl:
			"https://grafana-prometheus.exa.ai/public/img/fav32.png",
		hotkeyId: "OPEN_WEB_PAGE_3",
	},
	{
		id: "canonical",
		label: "Canonical",
		shortLabel: "Canonical",
		url: "https://grafana-prometheus.exa.ai/d/dfcszkmmzy9kwc/canonical-search-latency-dashboard?orgId=1&from=now-6h&to=now&timezone=browser&var-rate_interval=1m&var-prometheus_cluster_selector=prometheus&var-days_ago=1&var-error_threshold=0.1&refresh=10s",
		fallbackFaviconUrl:
			"https://grafana-prometheus.exa.ai/public/img/fav32.png",
		hotkeyId: "OPEN_WEB_PAGE_4",
	},
	{
		id: "github-prs",
		label: "PR",
		shortLabel: "PR",
		url: "https://github.com/exa-labs/monorepo/pulls/lakeesiv",
		fallbackFaviconUrl: "https://github.githubassets.com/favicons/favicon.svg",
		hotkeyId: "OPEN_WEB_PAGE_5",
	},
	{
		id: "linear-horizons",
		label: "Linear",
		shortLabel: "Linear",
		url: "https://linear.app/exalabs/initiative/horizons-2026q2-4bedcc8bbb8b/overview",
		fallbackFaviconUrl:
			"https://static.linear.app/client/assets/favicon-D8hcELd9.svg",
		hotkeyId: "OPEN_WEB_PAGE_6",
	},
] as const;
export const DASHBOARD_WEB_PAGES = DASHBOARD_WEB_PAGE_DEFINITIONS;

export type DashboardWebPageDefinition =
	(typeof DASHBOARD_WEB_PAGE_DEFINITIONS)[number];
export type DashboardWebPage = Omit<DashboardWebPageDefinition, "url"> & {
	url: string;
};
export type DashboardWebPageId = DashboardWebPage["id"];

type Listener = () => void;

const listeners = new Set<Listener>();
let pageUrlsCache: Partial<Record<DashboardWebPageId, string>> | null = null;
let pagesCache: DashboardWebPage[] | null = null;

function isKnownPageId(pageId: string): pageId is DashboardWebPageId {
	return DASHBOARD_WEB_PAGE_DEFINITIONS.some((page) => page.id === pageId);
}

function readStoredPageUrls(): Partial<Record<DashboardWebPageId, string>> {
	if (pageUrlsCache) return pageUrlsCache;
	if (typeof localStorage === "undefined") {
		pageUrlsCache = {};
		return pageUrlsCache;
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			pageUrlsCache = {};
			return pageUrlsCache;
		}
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			pageUrlsCache = {};
			return pageUrlsCache;
		}

		const next: Partial<Record<DashboardWebPageId, string>> = {};
		for (const [key, value] of Object.entries(
			parsed as Record<string, unknown>,
		)) {
			if (!isKnownPageId(key) || typeof value !== "string" || !value.trim()) {
				continue;
			}
			next[key] = value.trim();
		}
		pageUrlsCache = next;
		return pageUrlsCache;
	} catch {
		pageUrlsCache = {};
		return pageUrlsCache;
	}
}

function writeStoredPageUrls(
	next: Partial<Record<DashboardWebPageId, string>>,
) {
	pageUrlsCache = next;
	pagesCache = null;
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {}
}

function notifyListeners() {
	for (const listener of listeners) listener();
}

export function subscribeDashboardWebPages(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getDashboardWebPages(): DashboardWebPage[] {
	if (pagesCache) return pagesCache;
	const storedUrls = readStoredPageUrls();
	pagesCache = DASHBOARD_WEB_PAGE_DEFINITIONS.map((page) => ({
		...page,
		url: storedUrls[page.id] ?? page.url,
	}));
	return pagesCache ?? [];
}

export function getDashboardWebPage(
	pageId: string | undefined,
): DashboardWebPage | null {
	if (!pageId) return null;
	return getDashboardWebPages().find((page) => page.id === pageId) ?? null;
}

export function setDashboardWebPageUrl(pageId: string, url: string) {
	if (!isKnownPageId(pageId)) return;
	const trimmedUrl = url.trim();
	if (!trimmedUrl) return;

	const definition = DASHBOARD_WEB_PAGE_DEFINITIONS.find(
		(page) => page.id === pageId,
	);
	if (!definition) return;

	const storedUrls = readStoredPageUrls();
	const currentUrl = storedUrls[pageId] ?? definition.url;
	if (currentUrl === trimmedUrl) return;

	writeStoredPageUrls({
		...storedUrls,
		[pageId]: trimmedUrl,
	});
	notifyListeners();
}

export function resetDashboardWebPagesForTests() {
	pageUrlsCache = null;
	pagesCache = null;
	listeners.clear();
}
