import { DESKTOP_BROWSER_PARTITION } from "shared/constants";

const PRELOAD_DELAY_MS = 140;
const PRELOAD_TTL_MS = 45_000;

let pendingPreloadTimer: number | null = null;
let cleanupPreloadTimer: number | null = null;
let preloadedUrl: string | null = null;
let preloadWebview: Electron.WebviewTag | null = null;

function normalizePreloadUrl(url: string): string | null {
	const trimmedUrl = url.trim();
	if (!trimmedUrl) return null;

	try {
		return new URL(trimmedUrl).href;
	} catch {
		return null;
	}
}

function clearPendingPreload() {
	if (pendingPreloadTimer === null) return;
	window.clearTimeout(pendingPreloadTimer);
	pendingPreloadTimer = null;
}

function schedulePreloadCleanup() {
	if (cleanupPreloadTimer !== null) {
		window.clearTimeout(cleanupPreloadTimer);
	}

	cleanupPreloadTimer = window.setTimeout(() => {
		preloadWebview?.remove();
		preloadWebview = null;
		preloadedUrl = null;
		cleanupPreloadTimer = null;
	}, PRELOAD_TTL_MS);
}

function startPreload(url: string) {
	if (preloadedUrl === url) {
		schedulePreloadCleanup();
		return;
	}

	preloadWebview?.remove();
	const webview = document.createElement("webview") as Electron.WebviewTag;
	webview.src = url;
	webview.partition = DESKTOP_BROWSER_PARTITION;
	webview.setAttribute("data-dashboard-web-preloader", "true");
	webview.style.cssText = [
		"position: fixed",
		"left: -10000px",
		"top: -10000px",
		"width: 1px",
		"height: 1px",
		"opacity: 0",
		"pointer-events: none",
		"visibility: hidden",
	].join(";");
	document.body.appendChild(webview);
	preloadWebview = webview;
	preloadedUrl = url;
	schedulePreloadCleanup();
}

export function warmDashboardWebUrl(url: string) {
	if (typeof document === "undefined" || typeof window === "undefined") return;

	const normalizedUrl = normalizePreloadUrl(url);
	if (!normalizedUrl) return;
	clearPendingPreload();

	pendingPreloadTimer = window.setTimeout(() => {
		pendingPreloadTimer = null;
		startPreload(normalizedUrl);
	}, PRELOAD_DELAY_MS);
}

export function cancelDashboardWebUrlWarmup() {
	clearPendingPreload();
}
