const DASHBOARD_HASH_ROUTE_CHANGE_EVENT = "clankee-dashboard-hash-route-change";
const DASHBOARD_HASH_ROUTE_PATCH_KEY = "__clankeeDashboardHashRoutePatched";

type PatchedHistory = History & {
	[DASHBOARD_HASH_ROUTE_PATCH_KEY]?: true;
};

let lastObservedHash = "";

function currentHash() {
	return typeof window === "undefined" ? "" : window.location.hash;
}

function emitHashRouteChangeIfNeeded() {
	if (typeof window === "undefined") return;
	const nextHash = currentHash();
	if (nextHash === lastObservedHash) return;
	lastObservedHash = nextHash;
	window.dispatchEvent(new Event(DASHBOARD_HASH_ROUTE_CHANGE_EVENT));
}

function installDashboardHashRouteObserver() {
	if (typeof window === "undefined") return;

	const history = window.history as PatchedHistory;
	if (history[DASHBOARD_HASH_ROUTE_PATCH_KEY]) return;
	history[DASHBOARD_HASH_ROUTE_PATCH_KEY] = true;
	lastObservedHash = currentHash();

	for (const methodName of ["pushState", "replaceState"] as const) {
		const original = history[methodName].bind(history);
		history[methodName] = (...args) => {
			const result = original(...args);
			window.queueMicrotask(emitHashRouteChangeIfNeeded);
			return result;
		};
	}
}

export function getDashboardHashPathname(): string | null {
	if (typeof window === "undefined") return null;
	if (!window.location.hash.startsWith("#/")) return null;
	return window.location.hash.slice(1).split("?")[0] ?? null;
}

export function subscribeDashboardHashPathname(
	listener: () => void,
): () => void {
	if (typeof window === "undefined") return () => undefined;

	installDashboardHashRouteObserver();
	const handleRouteChange = () => {
		lastObservedHash = currentHash();
		listener();
	};

	window.addEventListener(DASHBOARD_HASH_ROUTE_CHANGE_EVENT, handleRouteChange);
	window.addEventListener("hashchange", handleRouteChange);
	window.addEventListener("popstate", handleRouteChange);

	return () => {
		window.removeEventListener(
			DASHBOARD_HASH_ROUTE_CHANGE_EVENT,
			handleRouteChange,
		);
		window.removeEventListener("hashchange", handleRouteChange);
		window.removeEventListener("popstate", handleRouteChange);
	};
}
