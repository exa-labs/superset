import { cn } from "@superset/ui/utils";
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { DashboardWebView } from "renderer/routes/_authenticated/_dashboard/components/DashboardWebView";
import {
	recordDashboardBrowserDeckState,
	recordDashboardBrowserEntrySlept,
	recordDashboardBrowserSwitchStarted,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-browser-diagnostics";
import { setDashboardWebPageFavicon } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-page-favicons";
import {
	type DashboardWebPage,
	getDashboardWebPage,
	getDashboardWebPages,
	setDashboardWebPageUrl,
	subscribeDashboardWebPages,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	areDashboardWebRetainedEntriesEqual,
	DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS,
	DASHBOARD_WEB_VIEW_TTL_SWEEP_MS,
	type DashboardWebRetainedEntry,
	selectWarmDashboardWebTabEntries,
	shouldRetainDashboardWebEntry,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-retention";
import {
	type DashboardWebTab,
	type DashboardWebTabFolder,
	getDashboardWebTab,
	getDashboardWebTabFolder,
	getDashboardWebTabFolders,
	getDashboardWebTabs,
	setDashboardWebTabBrowserTitle,
	setDashboardWebTabFavicon,
	setDashboardWebTabUrl,
	subscribeDashboardWebTabs,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";

type RetainedEntry = DashboardWebRetainedEntry;
const DECK_ANCHOR_SELECTOR = "[data-dashboard-web-view-deck-anchor]";

interface DeckRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

type WebViewTarget =
	| {
			cacheKey: string;
			kind: "page";
			page: DashboardWebPage;
	  }
	| {
			cacheKey: string;
			kind: "tab";
			tab: DashboardWebTab;
	  };

interface DashboardWebViewDeckProps {
	activePageId: string | null;
	activeTabId: string | null;
}

function getPageCacheKey(pageId: string): string {
	return `page:${pageId}`;
}

function getTabCacheKey(tabId: string): string {
	return `tab:${tabId}`;
}

function targetToEntry(target: WebViewTarget, now: number): RetainedEntry {
	if (target.kind === "page") {
		return {
			cacheKey: target.cacheKey,
			kind: "page",
			id: target.page.id,
			lastActiveAt: now,
		};
	}

	return {
		cacheKey: target.cacheKey,
		kind: "tab",
		id: target.tab.id,
		lastActiveAt: now,
	};
}

function resolveEntryTarget(entry: RetainedEntry): WebViewTarget | null {
	if (entry.kind === "page") {
		const page = getDashboardWebPage(entry.id);
		return page ? { cacheKey: entry.cacheKey, kind: "page", page } : null;
	}

	const tab = getDashboardWebTab(entry.id);
	return tab ? { cacheKey: entry.cacheKey, kind: "tab", tab } : null;
}

function isEntryPinned(entry: RetainedEntry, tabs: DashboardWebTab[]): boolean {
	if (entry.kind !== "tab") return false;
	return tabs.find((tab) => tab.id === entry.id)?.isPinned === true;
}

function sameRect(left: DeckRect | null, right: DeckRect): boolean {
	return (
		left !== null &&
		left.top === right.top &&
		left.left === right.left &&
		left.width === right.width &&
		left.height === right.height
	);
}

function shouldRetainEntry({
	activeCacheKey,
	entry,
	folders,
	now,
	tabs,
}: {
	activeCacheKey: string | null;
	entry: RetainedEntry;
	folders: DashboardWebTabFolder[];
	now: number;
	tabs: DashboardWebTab[];
}): boolean {
	if (entry.kind === "page") {
		return shouldRetainDashboardWebEntry({
			activeCacheKey,
			entry,
			now,
			target: resolveEntryTarget(entry) ? { kind: "page" } : null,
		});
	}

	const tab = tabs.find((item) => item.id === entry.id);
	const folder = tab?.folderId
		? (folders.find((item) => item.id === tab.folderId) ??
			getDashboardWebTabFolder(tab.folderId))
		: null;

	return shouldRetainDashboardWebEntry({
		activeCacheKey,
		entry,
		now,
		target: tab
			? {
					kind: "tab",
					isInCollapsedFolder: folder?.isCollapsed === true,
					isPinned: tab.isPinned,
				}
			: null,
	});
}

export function DashboardWebViewDeck({
	activePageId,
	activeTabId,
}: DashboardWebViewDeckProps) {
	const tabs = useSyncExternalStore(
		subscribeDashboardWebTabs,
		getDashboardWebTabs,
		getDashboardWebTabs,
	);
	const pages = useSyncExternalStore(
		subscribeDashboardWebPages,
		getDashboardWebPages,
		getDashboardWebPages,
	);
	const folders = useSyncExternalStore(
		subscribeDashboardWebTabs,
		getDashboardWebTabFolders,
		getDashboardWebTabFolders,
	);
	const [retainedEntries, setRetainedEntries] = useState<RetainedEntry[]>([]);
	const previousActiveCacheKeyRef = useRef<string | null>(null);

	const activeTarget = useMemo<WebViewTarget | null>(() => {
		if (activePageId) {
			const page = pages.find((item) => item.id === activePageId);
			return page
				? { cacheKey: getPageCacheKey(page.id), kind: "page", page }
				: null;
		}
		if (activeTabId) {
			const tab = tabs.find((item) => item.id === activeTabId);
			return tab
				? { cacheKey: getTabCacheKey(tab.id), kind: "tab", tab }
				: null;
		}
		return null;
	}, [activePageId, activeTabId, pages, tabs]);
	const activeCacheKey = activeTarget?.cacheKey ?? null;
	const [anchorRect, setAnchorRect] = useState<DeckRect | null>(null);

	useLayoutEffect(() => {
		const previousActiveCacheKey = previousActiveCacheKeyRef.current;
		if (previousActiveCacheKey !== activeCacheKey) {
			recordDashboardBrowserSwitchStarted({
				fromCacheKey: previousActiveCacheKey,
				toCacheKey: activeCacheKey,
			});
			previousActiveCacheKeyRef.current = activeCacheKey;
		}
	}, [activeCacheKey]);

	useEffect(() => {
		const updateRect = () => {
			if (!activeCacheKey) {
				setAnchorRect(null);
				return;
			}

			const anchor = document.querySelector<HTMLElement>(DECK_ANCHOR_SELECTOR);
			if (!anchor) {
				setAnchorRect(null);
				return;
			}

			const rect = anchor.getBoundingClientRect();
			const nextRect: DeckRect = {
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
			};
			setAnchorRect((current) =>
				sameRect(current, nextRect) ? current : nextRect,
			);
		};

		updateRect();
		if (!activeCacheKey) return;

		const anchor = document.querySelector<HTMLElement>(DECK_ANCHOR_SELECTOR);
		const resizeObserver = anchor ? new ResizeObserver(updateRect) : null;
		if (anchor) resizeObserver?.observe(anchor);
		const animationFrameId = window.requestAnimationFrame(updateRect);
		window.addEventListener("resize", updateRect);
		window.addEventListener("scroll", updateRect, true);

		return () => {
			resizeObserver?.disconnect();
			window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", updateRect);
			window.removeEventListener("scroll", updateRect, true);
		};
	}, [activeCacheKey]);

	useEffect(() => {
		const now = Date.now();
		const entriesToWarm = [
			...(activeTarget ? [targetToEntry(activeTarget, now)] : []),
			...selectWarmDashboardWebTabEntries({
				activeCacheKey,
				folders,
				now,
				tabs,
			}),
		];
		if (entriesToWarm.length === 0) return;

		setRetainedEntries((current) => {
			const nextEntriesByCacheKey = new Map(
				entriesToWarm.map((entry) => [entry.cacheKey, entry]),
			);
			const retainedCacheKeys = new Set(current.map((entry) => entry.cacheKey));
			const next = current.map(
				(entry) => nextEntriesByCacheKey.get(entry.cacheKey) ?? entry,
			);

			for (const entry of entriesToWarm) {
				if (!retainedCacheKeys.has(entry.cacheKey)) next.push(entry);
			}

			return areDashboardWebRetainedEntriesEqual(current, next)
				? current
				: next;
		});
	}, [activeCacheKey, activeTarget, folders, tabs]);

	useEffect(() => {
		const now = Date.now();
		setRetainedEntries((current) => {
			const next = current.filter((entry) =>
				shouldRetainEntry({ activeCacheKey, entry, folders, now, tabs }),
			);
			for (const entry of current) {
				if (!next.some((item) => item.cacheKey === entry.cacheKey)) {
					recordDashboardBrowserEntrySlept(entry);
				}
			}
			return next;
		});
	}, [activeCacheKey, folders, tabs]);

	useEffect(() => {
		const sweep = () => {
			const now = Date.now();
			setRetainedEntries((current) => {
				const next = current.filter((entry) =>
					shouldRetainEntry({ activeCacheKey, entry, folders, now, tabs }),
				);
				for (const entry of current) {
					if (!next.some((item) => item.cacheKey === entry.cacheKey)) {
						recordDashboardBrowserEntrySlept(entry);
					}
				}
				return next;
			});
		};

		const intervalId = window.setInterval(
			sweep,
			DASHBOARD_WEB_VIEW_TTL_SWEEP_MS,
		);
		return () => window.clearInterval(intervalId);
	}, [activeCacheKey, folders, tabs]);

	const retainedTargets = retainedEntries
		.map(resolveEntryTarget)
		.filter((target): target is WebViewTarget => target !== null);

	useEffect(() => {
		recordDashboardBrowserDeckState({
			activeCacheKey,
			keepAliveTtlMs: DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS,
			retainedEntries: retainedEntries.map((entry) => ({
				...entry,
				isPinned: isEntryPinned(entry, tabs),
			})),
			sweepIntervalMs: DASHBOARD_WEB_VIEW_TTL_SWEEP_MS,
		});
	}, [activeCacheKey, retainedEntries, tabs]);

	if (retainedTargets.length === 0) return null;

	const deckRect = activeTarget !== null ? anchorRect : null;
	const isVisible = deckRect !== null;

	return (
		<div
			data-dashboard-web-view-deck-root=""
			data-dashboard-web-view-deck-visible={isVisible ? "true" : "false"}
			style={{
				height: deckRect?.height ?? 0,
				left: deckRect?.left ?? 0,
				top: deckRect?.top ?? 0,
				width: deckRect?.width ?? 0,
			}}
			className={cn(
				"fixed min-h-0 min-w-0",
				isVisible
					? "pointer-events-auto z-20 opacity-100"
					: "pointer-events-none z-0 opacity-0",
			)}
		>
			{retainedTargets.map((target) => {
				const isActive = target.cacheKey === activeCacheKey;
				return (
					<div
						key={target.cacheKey}
						data-dashboard-web-view-cache-key={target.cacheKey}
						data-dashboard-web-view-active={isActive ? "true" : "false"}
						className={cn(
							"absolute inset-0 flex min-h-0 min-w-0",
							isActive
								? "pointer-events-auto z-10 opacity-100"
								: "pointer-events-none z-0 opacity-0",
						)}
					>
						{target.kind === "page" ? (
							<DashboardWebView
								cacheKey={target.cacheKey}
								id={target.page.id}
								label={target.page.label}
								isActive={isActive}
								url={target.page.url}
								onFaviconCaptured={(faviconUrl) =>
									setDashboardWebPageFavicon(target.page.id, faviconUrl)
								}
								onUrlUpdated={(url) =>
									setDashboardWebPageUrl(target.page.id, url)
								}
							/>
						) : (
							<DashboardWebView
								cacheKey={target.cacheKey}
								id={target.tab.id}
								label={target.tab.title}
								isActive={isActive}
								url={target.tab.url}
								onFaviconCaptured={(faviconUrl) =>
									setDashboardWebTabFavicon(target.tab.id, faviconUrl)
								}
								onTitleUpdated={(title) =>
									setDashboardWebTabBrowserTitle(target.tab.id, title)
								}
								onUrlUpdated={(url) =>
									setDashboardWebTabUrl(target.tab.id, url)
								}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
