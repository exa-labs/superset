import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	LuArrowLeft,
	LuArrowRight,
	LuColumns2,
	LuExternalLink,
	LuKeyRound,
	LuLoaderCircle,
	LuPlus,
	LuRefreshCw,
	LuX,
} from "react-icons/lu";
import { electronTrpc } from "renderer/lib/electron-trpc";
import {
	recordDashboardBrowserPaneEvent,
	removeDashboardBrowserPaneDiagnostics,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-browser-diagnostics";
import {
	type DashboardBrowserShortcutAction,
	type DashboardBrowserShortcutSection,
	dashboardBrowserShortcutDescriptors,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-browser-shortcuts";
import {
	areDashboardBrowserTabRetentionEntriesEqual,
	DASHBOARD_BROWSER_TAB_KEEPALIVE_TTL_MS,
	type DashboardBrowserTabRetentionEntry,
	selectWarmDashboardBrowserTabIds,
	updateDashboardBrowserTabRetention,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-browser-tab-retention";
import {
	dashboardBrowserVimActionFromKey,
	nextDashboardBrowserTabId,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-browser-vim";
import {
	dashboardVimKey,
	shouldHandleDashboardVimKey,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import {
	getDashboardWebTab,
	setDashboardWebTabPinned,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import {
	DashboardBrowserWebView,
	type DashboardBrowserWebViewState,
} from "./components/DashboardBrowserWebView";

const DEFAULT_BROWSER_TAB_ID = "default";
const BROWSER_TABS_STORAGE_PREFIX = "dashboard-browser-tabs-v1:";
const ACTIVE_BROWSER_TAB_STORAGE_PREFIX = "dashboard-browser-active-tab-v1:";
const SPLIT_BROWSER_TAB_STORAGE_PREFIX = "dashboard-browser-split-tab-v1:";
const SPLIT_BROWSER_RATIO_STORAGE_PREFIX = "dashboard-browser-split-ratio-v1:";
const DEFAULT_SPLIT_BROWSER_RATIO = 50;
const MIN_SPLIT_BROWSER_RATIO = 30;
const MAX_SPLIT_BROWSER_RATIO = 70;
const SPLIT_BROWSER_RATIO_STEP = 5;

const COMMON_NEW_TAB_DESTINATIONS = [
	{ label: "Google", url: "https://www.google.com/", title: "Google" },
	{ label: "ChatGPT", url: "https://chatgpt.com/", title: "ChatGPT" },
	{ label: "Claude", url: "https://claude.ai/", title: "Claude" },
] as const;

type DashboardBrowserCurrentAction =
	| DashboardBrowserShortcutAction
	| "new-chatgpt-tab"
	| "new-claude-tab"
	| "new-google-tab";

const BROWSER_SHORTCUT_SECTION_LABELS = {
	navigation: "Navigation",
	split: "Split",
	tabs: "Tabs",
} satisfies Record<DashboardBrowserShortcutSection, string>;

function DashboardBrowserKeyboardMenu({
	disabledActions,
	isSplitView,
	onAction,
}: {
	disabledActions: ReadonlySet<DashboardBrowserShortcutAction>;
	isSplitView: boolean;
	onAction: (action: DashboardBrowserShortcutAction) => void;
}) {
	const shortcuts = dashboardBrowserShortcutDescriptors({ isSplitView });
	const sectionOrder: DashboardBrowserShortcutSection[] = [
		"navigation",
		"tabs",
		"split",
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label="Show browser keyboard shortcuts"
					title="Browser keyboard shortcuts"
				>
					<LuKeyRound className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-72"
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<div className="px-2 py-1.5">
					<div className="text-xs font-medium text-foreground">
						Browser controls
					</div>
					<div className="text-[11px] text-muted-foreground">
						Visible labels for the browser Vim keys.
					</div>
				</div>
				{sectionOrder.map((section) => {
					const sectionShortcuts = shortcuts.filter(
						(shortcut) => shortcut.section === section,
					);
					if (sectionShortcuts.length === 0) return null;
					return (
						<div key={section}>
							<DropdownMenuSeparator />
							<div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
								{BROWSER_SHORTCUT_SECTION_LABELS[section]}
							</div>
							{sectionShortcuts.map((shortcut) => (
								<DropdownMenuItem
									key={shortcut.action}
									disabled={disabledActions.has(shortcut.action)}
									onSelect={() => onAction(shortcut.action)}
									className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"
								>
									<span className="truncate">{shortcut.label}</span>
									<DropdownMenuShortcut className="ml-0">
										{shortcut.key}
									</DropdownMenuShortcut>
								</DropdownMenuItem>
							))}
						</div>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

interface DashboardBrowserTab extends DashboardBrowserWebViewState {
	id: string;
	faviconUrl: string | null;
	lastActiveAt: number;
}

interface StoredDashboardBrowserTab {
	id: string;
	title: string;
	url: string;
	faviconUrl: string | null;
	lastActiveAt: number;
}

interface DashboardWebViewProps {
	cacheKey: string;
	id: string;
	label: string;
	isActive: boolean;
	url: string;
	onFaviconCaptured?: (faviconUrl: string) => void;
	onTitleUpdated?: (title: string) => void;
	onUrlUpdated?: (url: string) => void;
}

function hasSameHost(leftUrl: string, rightUrl: string): boolean {
	try {
		return new URL(leftUrl).host === new URL(rightUrl).host;
	} catch {
		return false;
	}
}

function makeBrowserTabId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return `browser-${crypto.randomUUID()}`;
	}
	return `browser-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2)}`;
}

function makeBrowserTab({
	id,
	title,
	url,
}: {
	id: string;
	title: string;
	url: string;
}): DashboardBrowserTab {
	return {
		id,
		url,
		title,
		faviconUrl: null,
		lastActiveAt: Date.now(),
		isLoading: true,
		canGoBack: false,
		canGoForward: false,
	};
}

function browserTabsStorageKey(id: string): string {
	return `${BROWSER_TABS_STORAGE_PREFIX}${id}`;
}

function activeBrowserTabStorageKey(id: string): string {
	return `${ACTIVE_BROWSER_TAB_STORAGE_PREFIX}${id}`;
}

function splitBrowserTabStorageKey(id: string): string {
	return `${SPLIT_BROWSER_TAB_STORAGE_PREFIX}${id}`;
}

function splitBrowserRatioStorageKey(id: string): string {
	return `${SPLIT_BROWSER_RATIO_STORAGE_PREFIX}${id}`;
}

function clampSplitBrowserRatio(value: number): number {
	if (!Number.isFinite(value)) return DEFAULT_SPLIT_BROWSER_RATIO;
	return Math.min(
		MAX_SPLIT_BROWSER_RATIO,
		Math.max(MIN_SPLIT_BROWSER_RATIO, value),
	);
}

function readStoredSplitBrowserRatio(id: string): number {
	if (typeof localStorage === "undefined") return DEFAULT_SPLIT_BROWSER_RATIO;
	const storedRatio = Number.parseFloat(
		localStorage.getItem(splitBrowserRatioStorageKey(id)) ?? "",
	);
	return clampSplitBrowserRatio(storedRatio);
}

function writeStoredSplitBrowserRatio(id: string, ratio: number) {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(
			splitBrowserRatioStorageKey(id),
			String(clampSplitBrowserRatio(ratio)),
		);
	} catch {}
}

function normalizeStoredBrowserTab(
	value: unknown,
	fallbackTitle: string,
): DashboardBrowserTab | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	const id = typeof record.id === "string" ? record.id.trim() : "";
	const url = typeof record.url === "string" ? record.url.trim() : "";
	if (!id || !url) return null;

	const title =
		typeof record.title === "string" && record.title.trim()
			? record.title.trim()
			: fallbackTitle;
	const faviconUrl =
		typeof record.faviconUrl === "string" && record.faviconUrl.trim()
			? record.faviconUrl.trim()
			: null;
	const lastActiveAt =
		typeof record.lastActiveAt === "number" &&
		Number.isFinite(record.lastActiveAt)
			? record.lastActiveAt
			: Date.now();

	return {
		...makeBrowserTab({ id, title, url }),
		faviconUrl,
		lastActiveAt,
		isLoading: false,
	};
}

function readStoredBrowserTabs(
	id: string,
	fallbackTitle: string,
	fallbackUrl: string,
): {
	activeBrowserTabId: string;
	browserTabs: DashboardBrowserTab[];
	splitBrowserTabId: string | null;
} {
	const fallbackTab = makeBrowserTab({
		id: DEFAULT_BROWSER_TAB_ID,
		title: fallbackTitle,
		url: fallbackUrl,
	});
	if (typeof localStorage === "undefined") {
		return {
			activeBrowserTabId: DEFAULT_BROWSER_TAB_ID,
			browserTabs: [fallbackTab],
			splitBrowserTabId: null,
		};
	}

	try {
		const rawTabs = localStorage.getItem(browserTabsStorageKey(id));
		const parsedTabs = rawTabs ? (JSON.parse(rawTabs) as unknown) : null;
		const restoredTabs = Array.isArray(parsedTabs)
			? parsedTabs
					.map((tab) => normalizeStoredBrowserTab(tab, fallbackTitle))
					.filter((tab): tab is DashboardBrowserTab => tab !== null)
			: [];
		const browserTabs =
			restoredTabs.length > 0
				? restoredTabs.map((tab) =>
						tab.id === DEFAULT_BROWSER_TAB_ID
							? { ...tab, title: tab.title || fallbackTitle }
							: tab,
					)
				: [fallbackTab];
		const activeBrowserTabId =
			localStorage.getItem(activeBrowserTabStorageKey(id)) ??
			DEFAULT_BROWSER_TAB_ID;
		const storedSplitBrowserTabId = localStorage.getItem(
			splitBrowserTabStorageKey(id),
		);
		const resolvedActiveBrowserTabId = browserTabs.some(
			(tab) => tab.id === activeBrowserTabId,
		)
			? activeBrowserTabId
			: (browserTabs[0]?.id ?? DEFAULT_BROWSER_TAB_ID);
		const splitBrowserTabId =
			storedSplitBrowserTabId &&
			storedSplitBrowserTabId !== resolvedActiveBrowserTabId &&
			browserTabs.some((tab) => tab.id === storedSplitBrowserTabId)
				? storedSplitBrowserTabId
				: null;

		return {
			activeBrowserTabId: resolvedActiveBrowserTabId,
			browserTabs,
			splitBrowserTabId,
		};
	} catch {
		return {
			activeBrowserTabId: DEFAULT_BROWSER_TAB_ID,
			browserTabs: [fallbackTab],
			splitBrowserTabId: null,
		};
	}
}

function writeStoredBrowserTabs({
	id,
	activeBrowserTabId,
	browserTabs,
	splitBrowserTabId,
}: {
	id: string;
	activeBrowserTabId: string;
	browserTabs: DashboardBrowserTab[];
	splitBrowserTabId: string | null;
}) {
	if (typeof localStorage === "undefined") return;

	const storedTabs: StoredDashboardBrowserTab[] = browserTabs.map((tab) => ({
		id: tab.id,
		title: tab.title,
		url: tab.url,
		faviconUrl: tab.faviconUrl,
		lastActiveAt: tab.lastActiveAt,
	}));

	try {
		localStorage.setItem(browserTabsStorageKey(id), JSON.stringify(storedTabs));
		localStorage.setItem(activeBrowserTabStorageKey(id), activeBrowserTabId);
		if (splitBrowserTabId) {
			localStorage.setItem(splitBrowserTabStorageKey(id), splitBrowserTabId);
		} else {
			localStorage.removeItem(splitBrowserTabStorageKey(id));
		}
	} catch {}
}

export function DashboardWebView({
	cacheKey,
	id,
	isActive,
	label,
	url,
	onFaviconCaptured,
	onTitleUpdated,
	onUrlUpdated,
}: DashboardWebViewProps) {
	const initialUrlRef = useRef(url);
	const lastPersistedUrlRef = useRef(url);
	const labelRef = useRef(label);
	const activeBrowserTabIdRef = useRef(DEFAULT_BROWSER_TAB_ID);
	const lastActiveBrowserTabIdRef = useRef<string | null>(null);
	const splitBrowserTabIdRef = useRef<string | null>(null);
	const browserTabStripRef = useRef<HTMLDivElement | null>(null);
	const webviewsRef = useRef(new Map<string, Electron.WebviewTag>());
	const readyTabIdsRef = useRef(new Set<string>());
	const onFaviconCapturedRef = useRef(onFaviconCaptured);
	const onTitleUpdatedRef = useRef(onTitleUpdated);
	const onUrlUpdatedRef = useRef(onUrlUpdated);
	const [restoredBrowserState] = useState(() =>
		readStoredBrowserTabs(id, label, initialUrlRef.current),
	);
	const previousBrowserTabIdsRef = useRef(
		restoredBrowserState.browserTabs.map((tab) => tab.id),
	);
	const openExternal = electronTrpc.external.openUrl.useMutation();
	const [browserTabs, setBrowserTabs] = useState<DashboardBrowserTab[]>(
		() => restoredBrowserState.browserTabs,
	);
	const [activeBrowserTabId, setActiveBrowserTabId] = useState(
		() => restoredBrowserState.activeBrowserTabId,
	);
	const [splitBrowserTabId, setSplitBrowserTabId] = useState<string | null>(
		() => restoredBrowserState.splitBrowserTabId,
	);
	const [splitBrowserRatio, setSplitBrowserRatio] = useState(() =>
		readStoredSplitBrowserRatio(id),
	);
	const [retainedBrowserTabEntries, setRetainedBrowserTabEntries] = useState<
		DashboardBrowserTabRetentionEntry[]
	>(() =>
		updateDashboardBrowserTabRetention({
			activeTabId: restoredBrowserState.activeBrowserTabId,
			current: [],
			existingTabIds: restoredBrowserState.browserTabs.map((tab) => tab.id),
			now: Date.now(),
			splitTabId: restoredBrowserState.splitBrowserTabId,
		}),
	);

	const activeBrowserTab =
		browserTabs.find((tab) => tab.id === activeBrowserTabId) ??
		browserTabs[0] ??
		null;
	const splitBrowserTab =
		splitBrowserTabId && splitBrowserTabId !== activeBrowserTabId
			? (browserTabs.find((tab) => tab.id === splitBrowserTabId) ?? null)
			: null;
	const isSplitView = splitBrowserTab !== null;
	const currentUrl = activeBrowserTab?.url ?? initialUrlRef.current;
	const pageTitle = activeBrowserTab?.title ?? label;
	const canGoBack = activeBrowserTab?.canGoBack ?? false;
	const canGoForward = activeBrowserTab?.canGoForward ?? false;
	const isLoading = activeBrowserTab?.isLoading ?? true;
	const browserTabIds = useMemo(
		() => browserTabs.map((tab) => tab.id),
		[browserTabs],
	);
	const warmBrowserTabIds = useMemo(
		() =>
			selectWarmDashboardBrowserTabIds({
				activeTabId: activeBrowserTabId,
				splitTabId: splitBrowserTab?.id ?? null,
				tabs: browserTabs,
			}),
		[activeBrowserTabId, browserTabs, splitBrowserTab?.id],
	);
	const retainedBrowserTabIds = useMemo(() => {
		const ids = new Set(retainedBrowserTabEntries.map((entry) => entry.tabId));
		if (activeBrowserTabId) ids.add(activeBrowserTabId);
		if (splitBrowserTab?.id) ids.add(splitBrowserTab.id);
		for (const tabId of warmBrowserTabIds) ids.add(tabId);
		return ids;
	}, [
		activeBrowserTabId,
		retainedBrowserTabEntries,
		splitBrowserTab?.id,
		warmBrowserTabIds,
	]);
	const retainedBrowserTabs = useMemo(
		() => browserTabs.filter((tab) => retainedBrowserTabIds.has(tab.id)),
		[browserTabs, retainedBrowserTabIds],
	);

	useEffect(() => {
		labelRef.current = label;
	}, [label]);

	useEffect(() => {
		activeBrowserTabIdRef.current = activeBrowserTabId;
	}, [activeBrowserTabId]);

	useEffect(() => {
		splitBrowserTabIdRef.current = splitBrowserTab?.id ?? null;
		if (splitBrowserTabId && !splitBrowserTab) setSplitBrowserTabId(null);
	}, [splitBrowserTab, splitBrowserTabId]);

	useEffect(() => {
		const currentIds = new Set(browserTabIds);
		const removedIds = previousBrowserTabIdsRef.current.filter(
			(tabId) => !currentIds.has(tabId),
		);
		previousBrowserTabIdsRef.current = browserTabIds;
		if (removedIds.length === 0) return;

		window.setTimeout(() => {
			for (const removedId of removedIds) {
				removeDashboardBrowserPaneDiagnostics(
					`dashboard-web:${id}:${removedId}`,
				);
			}
		}, 50);
	}, [browserTabIds, id]);

	useEffect(() => {
		setRetainedBrowserTabEntries((current) => {
			const next = updateDashboardBrowserTabRetention({
				activeTabId: activeBrowserTabId,
				current,
				existingTabIds: browserTabIds,
				now: Date.now(),
				splitTabId: splitBrowserTab?.id ?? null,
				warmTabIds: warmBrowserTabIds,
			});
			for (const entry of current) {
				if (next.some((item) => item.tabId === entry.tabId)) continue;
				const tab = browserTabs.find((item) => item.id === entry.tabId);
				recordDashboardBrowserPaneEvent({
					paneId: `dashboard-web:${id}:${entry.tabId}`,
					tabId: entry.tabId,
					event: "slept",
					cacheKey,
					url: tab?.url ?? null,
					title: tab?.title ?? null,
					retentionState: "sleeping",
				});
			}
			return areDashboardBrowserTabRetentionEntriesEqual(current, next)
				? current
				: next;
		});
	}, [
		activeBrowserTabId,
		browserTabIds,
		browserTabs,
		cacheKey,
		id,
		splitBrowserTab?.id,
		warmBrowserTabIds,
	]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setRetainedBrowserTabEntries((current) => {
				const next = updateDashboardBrowserTabRetention({
					activeTabId: activeBrowserTabId,
					current,
					existingTabIds: browserTabIds,
					now: Date.now(),
					splitTabId: splitBrowserTabIdRef.current,
					ttlMs: DASHBOARD_BROWSER_TAB_KEEPALIVE_TTL_MS,
					warmTabIds: warmBrowserTabIds,
				});
				for (const entry of current) {
					if (next.some((item) => item.tabId === entry.tabId)) continue;
					const tab = browserTabs.find((item) => item.id === entry.tabId);
					recordDashboardBrowserPaneEvent({
						paneId: `dashboard-web:${id}:${entry.tabId}`,
						tabId: entry.tabId,
						event: "slept",
						cacheKey,
						url: tab?.url ?? null,
						title: tab?.title ?? null,
						retentionState: "sleeping",
					});
				}
				return areDashboardBrowserTabRetentionEntriesEqual(current, next)
					? current
					: next;
			});
		}, 60_000);

		return () => window.clearInterval(intervalId);
	}, [
		activeBrowserTabId,
		browserTabIds,
		browserTabs,
		cacheKey,
		id,
		warmBrowserTabIds,
	]);

	useEffect(() => {
		writeStoredBrowserTabs({
			id,
			activeBrowserTabId,
			browserTabs,
			splitBrowserTabId: splitBrowserTab?.id ?? null,
		});
	}, [activeBrowserTabId, browserTabs, id, splitBrowserTab]);

	useEffect(() => {
		writeStoredSplitBrowserRatio(id, splitBrowserRatio);
	}, [id, splitBrowserRatio]);

	useEffect(() => {
		onFaviconCapturedRef.current = onFaviconCaptured;
	}, [onFaviconCaptured]);

	useEffect(() => {
		onTitleUpdatedRef.current = onTitleUpdated;
	}, [onTitleUpdated]);

	useEffect(() => {
		onUrlUpdatedRef.current = onUrlUpdated;
	}, [onUrlUpdated]);

	useEffect(() => {
		if (!activeBrowserTab) return;

		if (
			activeBrowserTab.url &&
			activeBrowserTab.url !== lastPersistedUrlRef.current
		) {
			lastPersistedUrlRef.current = activeBrowserTab.url;
			onUrlUpdatedRef.current?.(activeBrowserTab.url);
		}

		if (
			onTitleUpdatedRef.current &&
			hasSameHost(activeBrowserTab.url, initialUrlRef.current) &&
			activeBrowserTab.title &&
			activeBrowserTab.title !== labelRef.current &&
			activeBrowserTab.title !== activeBrowserTab.url
		) {
			onTitleUpdatedRef.current(activeBrowserTab.title);
		}
	}, [activeBrowserTab?.title, activeBrowserTab?.url, activeBrowserTab]);

	const handleWebviewChange = useCallback(
		(tabId: string, webview: Electron.WebviewTag | null) => {
			if (webview) {
				webviewsRef.current.set(tabId, webview);
				return;
			}
			webviewsRef.current.delete(tabId);
			readyTabIdsRef.current.delete(tabId);
		},
		[],
	);

	const handleReadyChange = useCallback((tabId: string, isReady: boolean) => {
		if (isReady) {
			readyTabIdsRef.current.add(tabId);
			return;
		}
		readyTabIdsRef.current.delete(tabId);
	}, []);

	const handleStateChange = useCallback(
		(tabId: string, state: Partial<DashboardBrowserWebViewState>) => {
			setBrowserTabs((current) =>
				current.map((tab) =>
					tab.id === tabId
						? {
								...tab,
								...state,
								title: state.title?.trim() || tab.title,
								url: state.url?.trim() || tab.url,
							}
						: tab,
				),
			);
		},
		[],
	);

	const handleFaviconCaptured = useCallback(
		(tabId: string, faviconUrl: string, pageUrl: string) => {
			setBrowserTabs((current) =>
				current.map((tab) => (tab.id === tabId ? { ...tab, faviconUrl } : tab)),
			);

			if (hasSameHost(pageUrl, initialUrlRef.current)) {
				onFaviconCapturedRef.current?.(faviconUrl);
			}
		},
		[],
	);

	const disposeClosedBrowserTabDiagnostics = useCallback(
		(tabId: string) => {
			window.setTimeout(() => {
				removeDashboardBrowserPaneDiagnostics(`dashboard-web:${id}:${tabId}`);
			}, 100);
		},
		[id],
	);

	const createBrowserTab = useCallback(
		(options: {
			activate?: boolean;
			splitFromActive?: boolean;
			title?: string;
			url: string;
		}) => {
			const nextUrl = options.url.trim();
			if (!nextUrl) return null;
			const nextTab = makeBrowserTab({
				id: makeBrowserTabId(),
				title: options.title?.trim() || nextUrl,
				url: nextUrl,
			});
			setBrowserTabs((current) => [...current, nextTab]);
			if (options.splitFromActive) {
				setSplitBrowserTabId(nextTab.id);
			} else if (options.activate !== false) {
				setActiveBrowserTabId(nextTab.id);
			}
			return nextTab;
		},
		[],
	);

	const closeBrowserTab = useCallback(
		(tabId: string) => {
			setBrowserTabs((current) => {
				if (current.length <= 1) return current;
				const closedIndex = current.findIndex((tab) => tab.id === tabId);
				if (closedIndex === -1) return current;

				const next = current.filter((tab) => tab.id !== tabId);
				disposeClosedBrowserTabDiagnostics(tabId);
				setSplitBrowserTabId((currentSplitTabId) => {
					if (currentSplitTabId === tabId) return null;
					if (
						currentSplitTabId &&
						tabId === activeBrowserTabIdRef.current &&
						currentSplitTabId ===
							next[Math.min(closedIndex, next.length - 1)]?.id
					) {
						return null;
					}
					return currentSplitTabId;
				});
				if (activeBrowserTabIdRef.current === tabId) {
					const nextActiveTab = next[Math.min(closedIndex, next.length - 1)];
					if (nextActiveTab) setActiveBrowserTabId(nextActiveTab.id);
				}
				return next;
			});
		},
		[disposeClosedBrowserTabDiagnostics],
	);

	const activateBrowserTab = useCallback((tabId: string) => {
		if (activeBrowserTabIdRef.current !== tabId) {
			lastActiveBrowserTabIdRef.current = activeBrowserTabIdRef.current;
		}
		if (splitBrowserTabIdRef.current === tabId) {
			setSplitBrowserTabId(activeBrowserTabIdRef.current);
		}
		setBrowserTabs((current) =>
			current.map((tab) =>
				tab.id === tabId ? { ...tab, lastActiveAt: Date.now() } : tab,
			),
		);
		setActiveBrowserTabId(tabId);
	}, []);

	const toggleSplitView = useCallback(() => {
		if (splitBrowserTabIdRef.current) {
			setSplitBrowserTabId(null);
			return;
		}

		const otherTab =
			browserTabs.find(
				(tab) =>
					tab.id === lastActiveBrowserTabIdRef.current &&
					tab.id !== activeBrowserTabIdRef.current,
			) ?? browserTabs.find((tab) => tab.id !== activeBrowserTabIdRef.current);
		if (otherTab) {
			setSplitBrowserTabId(otherTab.id);
			return;
		}

		const title =
			pageTitle && pageTitle !== currentUrl ? pageTitle : `${label} split`;
		createBrowserTab({
			activate: false,
			splitFromActive: true,
			title,
			url: currentUrl,
		});
	}, [browserTabs, createBrowserTab, currentUrl, label, pageTitle]);

	const swapSplitFocus = useCallback(() => {
		const splitTabId = splitBrowserTabIdRef.current;
		if (!splitTabId || splitTabId === activeBrowserTabIdRef.current) return;
		activateBrowserTab(splitTabId);
	}, [activateBrowserTab]);

	const resizeActiveSplitPane = useCallback((delta: number) => {
		if (!splitBrowserTabIdRef.current) return;
		setSplitBrowserRatio((current) => clampSplitBrowserRatio(current + delta));
	}, []);

	const equalizeSplitPanes = useCallback(() => {
		if (!splitBrowserTabIdRef.current) return;
		setSplitBrowserRatio(DEFAULT_SPLIT_BROWSER_RATIO);
	}, []);

	const getActiveWebview = useCallback(
		() => webviewsRef.current.get(activeBrowserTabIdRef.current) ?? null,
		[],
	);

	const isActiveWebviewReady = useCallback(
		() => readyTabIdsRef.current.has(activeBrowserTabIdRef.current),
		[],
	);

	const goBack = useCallback(() => {
		const webview = getActiveWebview();
		if (!isActiveWebviewReady() || !webview) return;
		try {
			if (webview.canGoBack()) webview.goBack();
		} catch {}
	}, [getActiveWebview, isActiveWebviewReady]);

	const goForward = useCallback(() => {
		const webview = getActiveWebview();
		if (!isActiveWebviewReady() || !webview) return;
		try {
			if (webview.canGoForward()) webview.goForward();
		} catch {}
	}, [getActiveWebview, isActiveWebviewReady]);

	const reload = useCallback(() => {
		if (!isActiveWebviewReady()) return;
		recordDashboardBrowserPaneEvent({
			paneId: `dashboard-web:${id}:${activeBrowserTabIdRef.current}`,
			tabId: activeBrowserTabIdRef.current,
			event: "reload-requested",
			cacheKey,
			url: currentUrl,
			title: pageTitle,
		});
		try {
			getActiveWebview()?.reload();
		} catch (error) {
			recordDashboardBrowserPaneEvent({
				paneId: `dashboard-web:${id}:${activeBrowserTabIdRef.current}`,
				tabId: activeBrowserTabIdRef.current,
				event: "did-fail-load",
				cacheKey,
				url: currentUrl,
				title: pageTitle,
				detail: error instanceof Error ? error.message : String(error),
			});
		}
	}, [
		cacheKey,
		currentUrl,
		getActiveWebview,
		id,
		isActiveWebviewReady,
		pageTitle,
	]);

	const createTabFromCurrentUrl = useCallback(() => {
		const title =
			pageTitle && pageTitle !== currentUrl ? pageTitle : `${label} tab`;
		createBrowserTab({ title, url: currentUrl });
	}, [createBrowserTab, currentUrl, label, pageTitle]);

	const toggleDashboardWebTabPinned = useCallback(() => {
		const tab = getDashboardWebTab(id);
		if (!tab) return;
		setDashboardWebTabPinned(tab.id, !tab.isPinned);
	}, [id]);

	const runBrowserCurrentAction = useCallback(
		(action: DashboardBrowserCurrentAction) => {
			if (action === "reload") {
				reload();
				return;
			}
			if (action === "go-back") {
				goBack();
				return;
			}
			if (action === "go-forward") {
				goForward();
				return;
			}
			if (action === "toggle-split") {
				toggleSplitView();
				return;
			}
			if (action === "close-split") {
				setSplitBrowserTabId(null);
				return;
			}
			if (action === "swap-split") {
				swapSplitFocus();
				return;
			}
			if (action === "narrow-active-split") {
				resizeActiveSplitPane(-SPLIT_BROWSER_RATIO_STEP);
				return;
			}
			if (action === "widen-active-split") {
				resizeActiveSplitPane(SPLIT_BROWSER_RATIO_STEP);
				return;
			}
			if (action === "equalize-split") {
				equalizeSplitPanes();
				return;
			}
			if (action === "close-current-tab") {
				closeBrowserTab(activeBrowserTabIdRef.current);
				return;
			}
			if (action === "toggle-tab-pin") {
				toggleDashboardWebTabPinned();
				return;
			}
			if (action === "previous-tab" || action === "next-tab") {
				const nextTabId = nextDashboardBrowserTabId(
					browserTabIds,
					activeBrowserTabIdRef.current,
					action === "next-tab" ? 1 : -1,
				);
				if (nextTabId && nextTabId !== activeBrowserTabIdRef.current) {
					activateBrowserTab(nextTabId);
				}
				return;
			}
			if (action === "new-current-url-tab") {
				createTabFromCurrentUrl();
				return;
			}

			const destination = COMMON_NEW_TAB_DESTINATIONS.find((item) => {
				if (action === "new-google-tab") return item.label === "Google";
				if (action === "new-chatgpt-tab") return item.label === "ChatGPT";
				return item.label === "Claude";
			});
			if (destination) createBrowserTab(destination);
		},
		[
			activateBrowserTab,
			browserTabIds,
			closeBrowserTab,
			createBrowserTab,
			createTabFromCurrentUrl,
			equalizeSplitPanes,
			goBack,
			goForward,
			reload,
			resizeActiveSplitPane,
			swapSplitFocus,
			toggleDashboardWebTabPinned,
			toggleSplitView,
		],
	);

	useEffect(() => {
		if (!isActive) return;

		const handleBrowserAction = (event: Event) => {
			const action = (
				event as CustomEvent<{ action?: DashboardBrowserCurrentAction }>
			).detail?.action;
			if (!action) return;
			runBrowserCurrentAction(action);
		};

		window.addEventListener(
			"dashboard-browser-current-action",
			handleBrowserAction,
		);
		return () => {
			window.removeEventListener(
				"dashboard-browser-current-action",
				handleBrowserAction,
			);
		};
	}, [isActive, runBrowserCurrentAction]);

	useEffect(() => {
		if (!isActive) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!shouldHandleDashboardVimKey(event)) return;
			const action = dashboardBrowserVimActionFromKey(dashboardVimKey(event));
			if (action === "none") return;

			event.preventDefault();
			event.stopPropagation();

			if (action === "new-tab") {
				createTabFromCurrentUrl();
				return;
			}

			if (action === "reload") {
				reload();
				return;
			}

			if (action === "go-back") {
				goBack();
				return;
			}

			if (action === "go-forward") {
				goForward();
				return;
			}

			if (action === "toggle-split") {
				toggleSplitView();
				return;
			}

			if (action === "close-split") {
				setSplitBrowserTabId(null);
				return;
			}

			if (action === "swap-split") {
				swapSplitFocus();
				return;
			}

			if (action === "narrow-active-split") {
				resizeActiveSplitPane(-SPLIT_BROWSER_RATIO_STEP);
				return;
			}

			if (action === "widen-active-split") {
				resizeActiveSplitPane(SPLIT_BROWSER_RATIO_STEP);
				return;
			}

			if (action === "equalize-split") {
				equalizeSplitPanes();
				return;
			}

			if (action === "close-tab") {
				closeBrowserTab(activeBrowserTabId);
				return;
			}

			if (action === "toggle-tab-pin") {
				toggleDashboardWebTabPinned();
				return;
			}

			const nextTabId = nextDashboardBrowserTabId(
				browserTabIds,
				activeBrowserTabId,
				action === "next-tab" ? 1 : -1,
			);
			if (nextTabId && nextTabId !== activeBrowserTabId) {
				activateBrowserTab(nextTabId);
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, [
		activateBrowserTab,
		activeBrowserTabId,
		browserTabIds,
		closeBrowserTab,
		createTabFromCurrentUrl,
		equalizeSplitPanes,
		goBack,
		goForward,
		isActive,
		reload,
		resizeActiveSplitPane,
		swapSplitFocus,
		toggleDashboardWebTabPinned,
		toggleSplitView,
	]);

	useEffect(() => {
		const node = browserTabStripRef.current;
		if (!node) return;

		const handleClick = (event: MouseEvent) => {
			if (event.defaultPrevented || event.button !== 0) return;
			if (!(event.target instanceof Element)) return;

			const tabButton = event.target.closest<HTMLElement>(
				"[data-dashboard-browser-tab-button]",
			);
			const tabId =
				tabButton?.getAttribute("data-dashboard-browser-tab-button")?.trim() ??
				"";
			if (!tabId) return;

			activateBrowserTab(tabId);
		};

		node.addEventListener("click", handleClick, true);
		return () => node.removeEventListener("click", handleClick, true);
	}, [activateBrowserTab]);

	const disabledBrowserShortcutActions = useMemo(() => {
		const disabled = new Set<DashboardBrowserShortcutAction>();
		if (!canGoBack) disabled.add("go-back");
		if (!canGoForward) disabled.add("go-forward");
		if (browserTabs.length <= 1) disabled.add("close-current-tab");
		return disabled;
	}, [browserTabs.length, canGoBack, canGoForward]);

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			<div className="flex h-7 shrink-0 items-center border-b border-border bg-muted/30 px-2">
				<div
					ref={browserTabStripRef}
					className="scrollbar-thin flex min-w-0 flex-1 items-end gap-1 overflow-x-auto"
				>
					{browserTabs.map((tab) => {
						const isActive = tab.id === activeBrowserTabId;
						const isSplitPeer = splitBrowserTab?.id === tab.id;
						return (
							<div
								key={tab.id}
								data-dashboard-browser-tab-strip-item={tab.id}
								title={tab.url}
								className={cn(
									"group flex h-6 min-w-24 max-w-56 shrink-0 items-center overflow-hidden rounded-t-md border border-b-0 transition-colors",
									isActive
										? "border-border bg-background text-foreground"
										: "border-transparent bg-muted/40 text-muted-foreground hover:bg-accent/45 hover:text-foreground",
									isSplitPeer && "ring-1 ring-primary/45",
								)}
							>
								<button
									type="button"
									data-dashboard-browser-tab-button={tab.id}
									onClick={() => activateBrowserTab(tab.id)}
									className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-[11px]"
								>
									{tab.faviconUrl && (
										<img
											src={tab.faviconUrl}
											alt=""
											className="size-3 shrink-0 rounded-[2px]"
										/>
									)}
									<span className="min-w-0 flex-1 truncate">
										{tab.title || tab.url}
									</span>
									{isSplitPeer && <LuColumns2 className="size-3 shrink-0" />}
								</button>
								{browserTabs.length > 1 && (
									<button
										type="button"
										data-dashboard-browser-tab-close={tab.id}
										aria-label={`Close browser tab ${tab.title || tab.url}`}
										onClick={(event) => {
											event.stopPropagation();
											closeBrowserTab(tab.id);
										}}
										className={cn(
											"mr-1 flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground",
											isActive
												? "opacity-100"
												: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
										)}
									>
										<LuX className="size-3" />
									</button>
								)}
							</div>
						);
					})}
				</div>
			</div>

			<div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border bg-muted/20 px-2">
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={goBack}
						disabled={!canGoBack}
						aria-label="Back"
					>
						<LuArrowLeft className="size-3.5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={goForward}
						disabled={!canGoForward}
						aria-label="Forward"
					>
						<LuArrowRight className="size-3.5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={reload}
						aria-label="Reload"
					>
						<LuRefreshCw
							className={cn("size-3.5", isLoading && "animate-spin")}
						/>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						data-dashboard-browser-split-toggle=""
						onClick={toggleSplitView}
						aria-label={isSplitView ? "Close split view" : "Open split view"}
						aria-pressed={isSplitView}
						className={cn(isSplitView && "bg-accent text-foreground")}
					>
						<LuColumns2 className="size-3.5" />
					</Button>
				</div>

				<div
					title={currentUrl}
					className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2"
				>
					{isLoading && (
						<LuLoaderCircle className="size-3 shrink-0 animate-spin text-muted-foreground" />
					)}
					<div className="scrollbar-thin min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[10px] leading-none text-muted-foreground">
						{currentUrl}
					</div>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							data-dashboard-browser-new-tab-trigger=""
							aria-label="New browser tab"
						>
							<LuPlus className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						<DropdownMenuItem onSelect={createTabFromCurrentUrl}>
							Same URL
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						{COMMON_NEW_TAB_DESTINATIONS.map((destination) => (
							<DropdownMenuItem
								key={destination.label}
								onSelect={() => createBrowserTab(destination)}
							>
								{destination.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<DashboardBrowserKeyboardMenu
					disabledActions={disabledBrowserShortcutActions}
					isSplitView={isSplitView}
					onAction={runBrowserCurrentAction}
				/>

				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={() => openExternal.mutate(currentUrl)}
					aria-label="Open in external browser"
				>
					<LuExternalLink className="size-3.5" />
				</Button>
			</div>

			<div className="relative min-h-0 min-w-0 flex-1">
				{retainedBrowserTabs.map((tab) => {
					const placement =
						tab.id === activeBrowserTabId
							? isSplitView
								? "left"
								: "full"
							: tab.id === splitBrowserTab?.id
								? "right"
								: "hidden";
					return (
						<DashboardBrowserWebView
							key={tab.id}
							paneId={`dashboard-web:${id}:${tab.id}`}
							tabId={tab.id}
							cacheKey={cacheKey}
							src={tab.url}
							label={tab.title || label}
							isActive={isActive && tab.id === activeBrowserTabId}
							isViewActive={isActive}
							placement={placement}
							splitRatioPercent={splitBrowserRatio}
							onStateChange={handleStateChange}
							onFaviconCaptured={handleFaviconCaptured}
							onReadyChange={handleReadyChange}
							onWebviewChange={handleWebviewChange}
						/>
					);
				})}
			</div>
		</div>
	);
}
