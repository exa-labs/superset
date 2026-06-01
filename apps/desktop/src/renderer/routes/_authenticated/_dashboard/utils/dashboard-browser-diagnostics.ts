const MAX_DIAGNOSTIC_EVENTS = 300;

export type DashboardBrowserDiagnosticEventType =
	| "activated"
	| "deactivated"
	| "deck-updated"
	| "did-fail-load"
	| "dom-ready"
	| "favicon-updated"
	| "focused"
	| "load-start"
	| "load-stop"
	| "mounted"
	| "navigate"
	| "register-deferred"
	| "registered"
	| "reload-requested"
	| "retention-state"
	| "render-process-gone"
	| "slept"
	| "switch-complete"
	| "switch-start"
	| "title-updated"
	| "unmounted";

export interface DashboardBrowserDiagnosticEvent {
	at: number;
	event: DashboardBrowserDiagnosticEventType;
	paneId?: string;
	tabId?: string | null;
	cacheKey?: string | null;
	url?: string | null;
	title?: string | null;
	webContentsId?: number | null;
	detail?: string | null;
	retentionState?: "active" | "sleeping" | "split" | "warm";
}

export interface DashboardBrowserPaneDiagnostics {
	paneId: string;
	tabId: string | null;
	url: string | null;
	title: string | null;
	webContentsId: number | null;
	isActive: boolean;
	isMounted: boolean;
	isReady: boolean;
	isLoading: boolean;
	retentionState: "active" | "sleeping" | "split" | "warm";
	activationCount: number;
	domReadyCount: number;
	mountCount: number;
	unmountCount: number;
	navigationCount: number;
	loadCount: number;
	reloadRequestCount: number;
	failLoadCount: number;
	renderGoneCount: number;
	lastActivatedAt: number | null;
	lastMountedAt: number | null;
	lastUnmountedAt: number | null;
	lastReadyAt: number | null;
	lastLoadStartedAt: number | null;
	lastLoadStoppedAt: number | null;
	lastFocusLatencyMs: number | null;
	lastEvent: DashboardBrowserDiagnosticEventType;
	lastEventAt: number;
}

export type DashboardBrowserMemoryPressureLevel =
	| "normal"
	| "elevated"
	| "high";

export interface DashboardBrowserMemoryPressureDiagnostics {
	level: DashboardBrowserMemoryPressureLevel;
	retainedCount: number;
	activeCount: number;
	warmCount: number;
	sleepingCount: number;
	rendererHeapUsedBytes: number | null;
	rendererHeapLimitBytes: number | null;
	rendererHeapUsageRatio: number | null;
	reason: string;
}

export interface DashboardBrowserDeckDiagnostics {
	activeCacheKey: string | null;
	bounds: DashboardBrowserDeckBounds | null;
	keepAliveTtlMs: number;
	sweepIntervalMs: number;
	switchCount: number;
	lastSwitchFromCacheKey: string | null;
	lastSwitchToCacheKey: string | null;
	lastSwitchStartedAt: number | null;
	lastSwitchCompletedAt: number | null;
	lastSwitchLatencyMs: number | null;
	memoryPressure: DashboardBrowserMemoryPressureDiagnostics;
	retainedEntries: Array<{
		cacheKey: string;
		kind: "page" | "tab";
		id: string;
		lastActiveAt: number;
		ageMs: number;
		expiresAt: number | null;
		remainingTtlMs: number | null;
		isActive: boolean;
		isPinned: boolean;
		retentionState: "active" | "warm";
	}>;
	recentlySleptEntries: Array<{
		cacheKey: string;
		kind: "page" | "tab";
		id: string;
		lastActiveAt: number;
		sleptAt: number;
		ageMs: number;
	}>;
	lastUpdatedAt: number;
}

export interface DashboardBrowserDeckBounds {
	height: number;
	left: number;
	top: number;
	width: number;
}

export interface DashboardBrowserDiagnosticsSnapshot {
	deck: DashboardBrowserDeckDiagnostics | null;
	panes: DashboardBrowserPaneDiagnostics[];
	events: DashboardBrowserDiagnosticEvent[];
}

interface MutableDiagnosticState {
	deck: DashboardBrowserDeckDiagnostics | null;
	panes: Map<string, DashboardBrowserPaneDiagnostics>;
	events: DashboardBrowserDiagnosticEvent[];
	switches: {
		count: number;
		pending: {
			fromCacheKey: string | null;
			toCacheKey: string;
			startedAt: number;
		} | null;
		lastFromCacheKey: string | null;
		lastToCacheKey: string | null;
		lastStartedAt: number | null;
		lastCompletedAt: number | null;
		lastLatencyMs: number | null;
	};
}

interface DashboardBrowserDiagnosticsHandle {
	getSnapshot: () => DashboardBrowserDiagnosticsSnapshot;
	clear: () => void;
}

declare global {
	interface Window {
		__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?:
			| DashboardBrowserDiagnosticsHandle
			| undefined;
	}
}

const state: MutableDiagnosticState = {
	deck: null,
	panes: new Map(),
	events: [],
	switches: {
		count: 0,
		pending: null,
		lastFromCacheKey: null,
		lastToCacheKey: null,
		lastStartedAt: null,
		lastCompletedAt: null,
		lastLatencyMs: null,
	},
};

function now() {
	return Date.now();
}

function getSnapshot(): DashboardBrowserDiagnosticsSnapshot {
	const retainedEntries =
		state.deck?.retainedEntries.map((entry) => ({
			...entry,
		})) ?? [];
	const recentlySleptEntries =
		state.deck?.recentlySleptEntries.map((entry) => ({
			...entry,
		})) ?? [];

	return {
		deck: state.deck
			? {
					...state.deck,
					memoryPressure:
						state.deck.memoryPressure ??
						getDashboardBrowserMemoryPressure({
							activeCount: retainedEntries.filter((entry) => entry.isActive)
								.length,
							retainedCount: retainedEntries.length,
							sleepingCount: recentlySleptEntries.length,
							warmCount: retainedEntries.filter(
								(entry) => entry.retentionState === "warm",
							).length,
						}),
					retainedEntries,
					recentlySleptEntries,
				}
			: null,
		panes: Array.from(state.panes.values()).map((pane) => ({ ...pane })),
		events: state.events.map((event) => ({ ...event })),
	};
}

function clear() {
	state.deck = null;
	state.panes.clear();
	state.events = [];
	state.switches = {
		count: 0,
		pending: null,
		lastFromCacheKey: null,
		lastToCacheKey: null,
		lastStartedAt: null,
		lastCompletedAt: null,
		lastLatencyMs: null,
	};
}

function exposeDiagnosticsHandle() {
	if (typeof window === "undefined") return;
	window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__ = {
		getSnapshot,
		clear,
	};
}

function pushEvent(event: DashboardBrowserDiagnosticEvent) {
	state.events.push(event);
	if (state.events.length > MAX_DIAGNOSTIC_EVENTS) {
		state.events.splice(0, state.events.length - MAX_DIAGNOSTIC_EVENTS);
	}
}

function switchFields() {
	return {
		switchCount: state.switches.count,
		lastSwitchFromCacheKey: state.switches.lastFromCacheKey,
		lastSwitchToCacheKey: state.switches.lastToCacheKey,
		lastSwitchStartedAt: state.switches.lastStartedAt,
		lastSwitchCompletedAt: state.switches.lastCompletedAt,
		lastSwitchLatencyMs: state.switches.lastLatencyMs,
	};
}

export function recordDashboardBrowserSwitchStarted({
	fromCacheKey,
	toCacheKey,
}: {
	fromCacheKey: string | null;
	toCacheKey: string | null;
}) {
	if (!toCacheKey || fromCacheKey === toCacheKey) return;

	const at = now();
	exposeDiagnosticsHandle();
	state.switches = {
		count: fromCacheKey ? state.switches.count + 1 : state.switches.count,
		pending: {
			fromCacheKey,
			toCacheKey,
			startedAt: at,
		},
		lastFromCacheKey: fromCacheKey,
		lastToCacheKey: toCacheKey,
		lastStartedAt: at,
		lastCompletedAt: null,
		lastLatencyMs: null,
	};
	pushEvent({
		at,
		event: "switch-start",
		cacheKey: toCacheKey,
		detail: fromCacheKey ? `${fromCacheKey} -> ${toCacheKey}` : toCacheKey,
	});
}

function completePendingSwitch({
	at,
	cacheKey,
	paneId,
}: {
	at: number;
	cacheKey: string | null;
	paneId: string;
}) {
	const pending = state.switches.pending;
	if (!pending || !cacheKey || pending.toCacheKey !== cacheKey) return;

	const latencyMs = Math.max(0, at - pending.startedAt);
	state.switches = {
		...state.switches,
		pending: null,
		lastCompletedAt: at,
		lastLatencyMs: latencyMs,
	};
	if (state.deck) {
		state.deck = {
			...state.deck,
			...switchFields(),
			lastUpdatedAt: at,
		};
	}
	pushEvent({
		at,
		event: "switch-complete",
		paneId,
		cacheKey,
		detail: `${latencyMs}ms`,
	});
}

interface BrowserMemorySnapshot {
	usedJSHeapSize?: number;
	jsHeapSizeLimit?: number;
}

function readBrowserMemorySnapshot(): BrowserMemorySnapshot | null {
	if (typeof performance === "undefined") return null;
	const memory = (
		performance as Performance & {
			memory?: BrowserMemorySnapshot;
		}
	).memory;
	return memory ?? null;
}

export function getDashboardBrowserMemoryPressure({
	activeCount,
	retainedCount,
	sleepingCount,
	warmCount,
	memory = readBrowserMemorySnapshot(),
}: {
	activeCount: number;
	retainedCount: number;
	sleepingCount: number;
	warmCount: number;
	memory?: BrowserMemorySnapshot | null;
}): DashboardBrowserMemoryPressureDiagnostics {
	const rendererHeapUsedBytes =
		typeof memory?.usedJSHeapSize === "number" ? memory.usedJSHeapSize : null;
	const rendererHeapLimitBytes =
		typeof memory?.jsHeapSizeLimit === "number" ? memory.jsHeapSizeLimit : null;
	const rendererHeapUsageRatio =
		rendererHeapUsedBytes !== null &&
		rendererHeapLimitBytes !== null &&
		rendererHeapLimitBytes > 0
			? rendererHeapUsedBytes / rendererHeapLimitBytes
			: null;

	const isHigh =
		retainedCount >= 16 ||
		warmCount >= 12 ||
		(rendererHeapUsageRatio !== null && rendererHeapUsageRatio >= 0.75);
	const isElevated =
		isHigh ||
		retainedCount >= 8 ||
		warmCount >= 6 ||
		(rendererHeapUsageRatio !== null && rendererHeapUsageRatio >= 0.5);

	const level: DashboardBrowserMemoryPressureLevel = isHigh
		? "high"
		: isElevated
			? "elevated"
			: "normal";

	const reason =
		rendererHeapUsageRatio === null
			? `${retainedCount} retained, ${warmCount} warm, ${sleepingCount} sleeping`
			: `${retainedCount} retained, ${warmCount} warm, ${sleepingCount} sleeping, ${(rendererHeapUsageRatio * 100).toFixed(1)}% renderer heap`;

	return {
		level,
		retainedCount,
		activeCount,
		warmCount,
		sleepingCount,
		rendererHeapUsedBytes,
		rendererHeapLimitBytes,
		rendererHeapUsageRatio,
		reason,
	};
}

function getOrCreatePane(
	paneId: string,
	tabId: string | null,
	event: DashboardBrowserDiagnosticEventType,
	at: number,
): DashboardBrowserPaneDiagnostics {
	const existing = state.panes.get(paneId);
	if (existing) {
		if (tabId) existing.tabId = tabId;
		return existing;
	}

	const pane: DashboardBrowserPaneDiagnostics = {
		paneId,
		tabId,
		url: null,
		title: null,
		webContentsId: null,
		isActive: false,
		isMounted: false,
		isReady: false,
		isLoading: false,
		retentionState: "sleeping",
		activationCount: 0,
		domReadyCount: 0,
		mountCount: 0,
		unmountCount: 0,
		navigationCount: 0,
		loadCount: 0,
		reloadRequestCount: 0,
		failLoadCount: 0,
		renderGoneCount: 0,
		lastActivatedAt: null,
		lastMountedAt: null,
		lastUnmountedAt: null,
		lastReadyAt: null,
		lastLoadStartedAt: null,
		lastLoadStoppedAt: null,
		lastFocusLatencyMs: null,
		lastEvent: event,
		lastEventAt: at,
	};
	state.panes.set(paneId, pane);
	return pane;
}

export function recordDashboardBrowserPaneEvent({
	paneId,
	tabId = null,
	event,
	cacheKey = null,
	url = null,
	title = null,
	webContentsId = null,
	detail = null,
	retentionState,
}: {
	paneId: string;
	tabId?: string | null;
	event: DashboardBrowserDiagnosticEventType;
	cacheKey?: string | null;
	url?: string | null;
	title?: string | null;
	webContentsId?: number | null;
	detail?: string | null;
	retentionState?: "active" | "sleeping" | "split" | "warm";
}) {
	const at = now();
	exposeDiagnosticsHandle();
	pushEvent({
		at,
		event,
		paneId,
		tabId,
		cacheKey,
		url,
		title,
		webContentsId,
		detail,
		retentionState,
	});

	const pane = getOrCreatePane(paneId, tabId, event, at);
	if (url) pane.url = url;
	if (title) pane.title = title;
	if (webContentsId !== null) pane.webContentsId = webContentsId;
	if (retentionState) {
		pane.retentionState = retentionState;
		pane.isActive = retentionState === "active";
	}
	pane.lastEvent = event;
	pane.lastEventAt = at;

	if (event === "activated") {
		pane.isActive = true;
		pane.retentionState = "active";
		pane.activationCount += 1;
		pane.lastActivatedAt = at;
	}
	if (event === "deactivated") pane.isActive = false;
	if (event === "mounted") {
		pane.isMounted = true;
		pane.mountCount += 1;
		pane.lastMountedAt = at;
	}
	if (event === "dom-ready") {
		pane.isReady = true;
		pane.domReadyCount += 1;
		pane.lastReadyAt = at;
		if (pane.lastActivatedAt !== null && pane.lastActivatedAt <= at) {
			pane.lastFocusLatencyMs = at - pane.lastActivatedAt;
		}
		completePendingSwitch({ at, cacheKey, paneId });
	}
	if (event === "focused" && pane.lastActivatedAt !== null) {
		pane.lastFocusLatencyMs = at - pane.lastActivatedAt;
		completePendingSwitch({ at, cacheKey, paneId });
	}
	if (event === "load-start") {
		pane.isLoading = true;
		pane.loadCount += 1;
		pane.lastLoadStartedAt = at;
	}
	if (event === "load-stop") {
		pane.isLoading = false;
		pane.lastLoadStoppedAt = at;
	}
	if (event === "navigate") pane.navigationCount += 1;
	if (event === "reload-requested") pane.reloadRequestCount += 1;
	if (event === "did-fail-load") {
		pane.failLoadCount += 1;
		pane.isLoading = false;
		pane.lastLoadStoppedAt = at;
	}
	if (event === "render-process-gone") {
		pane.renderGoneCount += 1;
		pane.isLoading = false;
		pane.isReady = false;
		pane.lastLoadStoppedAt = at;
	}
	if (event === "unmounted") {
		pane.isActive = false;
		pane.isMounted = false;
		pane.isReady = false;
		pane.isLoading = false;
		pane.retentionState = "sleeping";
		pane.unmountCount += 1;
		pane.lastUnmountedAt = at;
	}
}

export function removeDashboardBrowserPaneDiagnostics(paneId: string) {
	state.panes.delete(paneId);
	exposeDiagnosticsHandle();
}

export function recordDashboardBrowserDeckState({
	activeCacheKey,
	bounds,
	keepAliveTtlMs,
	retainedEntries,
	sweepIntervalMs,
}: {
	activeCacheKey: string | null;
	bounds?: DashboardBrowserDeckBounds | null;
	keepAliveTtlMs: number;
	retainedEntries: Array<{
		cacheKey: string;
		kind: "page" | "tab";
		id: string;
		lastActiveAt: number;
		isPinned?: boolean;
	}>;
	sweepIntervalMs: number;
}) {
	const at = now();
	exposeDiagnosticsHandle();
	const nextRetainedEntries = retainedEntries.map((entry) => {
		const isActive = entry.cacheKey === activeCacheKey;
		const isPinned = entry.isPinned === true;
		const ageMs = Math.max(0, at - entry.lastActiveAt);
		const expiresAt =
			isActive || isPinned ? null : entry.lastActiveAt + keepAliveTtlMs;
		const remainingTtlMs = expiresAt ? Math.max(0, expiresAt - at) : null;
		return {
			...entry,
			ageMs,
			expiresAt,
			remainingTtlMs,
			isActive,
			isPinned,
			retentionState: isActive ? ("active" as const) : ("warm" as const),
		};
	});
	const sleepingCount = state.deck?.recentlySleptEntries.length ?? 0;
	state.deck = {
		activeCacheKey,
		bounds: bounds ?? null,
		keepAliveTtlMs,
		sweepIntervalMs,
		...switchFields(),
		memoryPressure: getDashboardBrowserMemoryPressure({
			activeCount: nextRetainedEntries.filter((entry) => entry.isActive).length,
			retainedCount: nextRetainedEntries.length,
			sleepingCount,
			warmCount: nextRetainedEntries.filter(
				(entry) => entry.retentionState === "warm",
			).length,
		}),
		retainedEntries: nextRetainedEntries,
		recentlySleptEntries: state.deck?.recentlySleptEntries ?? [],
		lastUpdatedAt: at,
	};
	pushEvent({
		at,
		event: "deck-updated",
		cacheKey: activeCacheKey,
		detail: `${retainedEntries.length} retained`,
	});
}

export function getDashboardBrowserDiagnosticsSnapshotForTests() {
	return getSnapshot();
}

export function resetDashboardBrowserDiagnosticsForTests() {
	clear();
}

export function recordDashboardBrowserEntrySlept(entry: {
	cacheKey: string;
	kind: "page" | "tab";
	id: string;
	lastActiveAt: number;
}) {
	const at = now();
	exposeDiagnosticsHandle();
	const sleptEntry = {
		...entry,
		sleptAt: at,
		ageMs: Math.max(0, at - entry.lastActiveAt),
	};
	if (state.deck) {
		state.deck = {
			...state.deck,
			recentlySleptEntries: [
				sleptEntry,
				...state.deck.recentlySleptEntries.filter(
					(item) => item.cacheKey !== entry.cacheKey,
				),
			].slice(0, 20),
			lastUpdatedAt: at,
		};
	}
	pushEvent({
		at,
		event: "slept",
		cacheKey: entry.cacheKey,
		detail: `${entry.kind}:${entry.id}`,
	});
}
