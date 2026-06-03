import { cn } from "@superset/ui/utils";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { recordDashboardBrowserPaneEvent } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-browser-diagnostics";
import { DESKTOP_BROWSER_PARTITION } from "shared/constants";
import {
	type DashboardBrowserWebViewPlacement,
	shouldDashboardBrowserWebViewReceivePointerEvents,
} from "./dashboard-browser-webview-interaction";

const FAVICON_CAPTURE_SIZE = 64;
const DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT = `
(() => {
	if (window.__clankeeDashboardWebShortcutBridgeInstalled) return;
	window.__clankeeDashboardWebShortcutBridgeInstalled = true;
	const prefix = "__CLANKEE_DASHBOARD_WEB_SHORTCUT__:";
	const invokeShortcut = (shortcut) => {
		console.info(prefix + shortcut);
	};
	const digitShortcuts = [
		"OPEN_WEB_PAGE_1",
		"OPEN_WEB_PAGE_2",
		"OPEN_WEB_PAGE_3",
		"OPEN_WEB_PAGE_4",
		"OPEN_WEB_PAGE_5",
		"OPEN_WEB_PAGE_6",
	];
	const shortcutFromEvent = (event) => {
		if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return null;
		const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code || "");
		if (digit) return digitShortcuts[Number.parseInt(digit[1], 10) - 1] || null;
		const code = String(event.code || "").toLowerCase();
		if (code === "keyc") return "OPEN_CAPY";
		if (code === "keyd") return "OPEN_DEVIN";
		if (code === "keyg") return "OPEN_CHROME";
		if (code === "keyb") return "TOGGLE_NATIVE_BROWSER_VIEW";
		if (code === "keys") return "TOGGLE_NATIVE_SPLIT_VIEW";
		return null;
	};
	window.addEventListener(
		"keydown",
		(event) => {
			const shortcut = shortcutFromEvent(event);
			if (!shortcut) return;
			event.preventDefault();
			event.stopPropagation();
			invokeShortcut(shortcut);
		},
		true,
	);
})();
`;

export interface DashboardBrowserWebViewState {
	url: string;
	title: string;
	isLoading: boolean;
	canGoBack: boolean;
	canGoForward: boolean;
}

interface DashboardBrowserWebViewProps {
	paneId: string;
	tabId: string;
	cacheKey: string;
	src: string;
	label: string;
	isActive: boolean;
	isViewActive: boolean;
	placement: DashboardBrowserWebViewPlacement;
	splitRatioPercent: number;
	onStateChange: (
		tabId: string,
		state: Partial<DashboardBrowserWebViewState>,
	) => void;
	onFaviconCaptured: (
		tabId: string,
		faviconUrl: string,
		pageUrl: string,
	) => void;
	onReadyChange: (tabId: string, isReady: boolean) => void;
	onWebviewChange: (tabId: string, webview: Electron.WebviewTag | null) => void;
}

function retentionStateForPlacement({
	isActive,
	placement,
}: {
	isActive: boolean;
	placement: DashboardBrowserWebViewProps["placement"];
}): "active" | "split" | "warm" {
	if (isActive) return "active";
	if (placement === "left" || placement === "right") return "split";
	return "warm";
}

function placementStyleForSplitRatio({
	placement,
	splitRatioPercent,
}: {
	placement: DashboardBrowserWebViewPlacement;
	splitRatioPercent: number;
}): CSSProperties | undefined {
	if (placement === "left") {
		return { right: `${100 - splitRatioPercent}%` };
	}
	if (placement === "right") {
		return { left: `${splitRatioPercent}%` };
	}
	return undefined;
}

async function captureWebviewFaviconDataUrl(
	webview: Electron.WebviewTag,
): Promise<string | null> {
	const result = await webview.executeJavaScript(`
		(async () => {
			const maxSize = ${FAVICON_CAPTURE_SIZE};
			const candidates = Array.from(document.querySelectorAll("link[rel]"))
				.map((link) => ({
					rel: link.getAttribute("rel") || "",
					href: link.href || "",
				}))
				.filter((link) => link.href && /icon/i.test(link.rel))
				.sort((a, b) => {
					const score = (rel) => {
						const normalizedRel = rel.toLowerCase();
						if (normalizedRel === "icon" || normalizedRel === "shortcut icon") return 0;
						if (normalizedRel.includes("apple-touch-icon")) return 1;
						if (normalizedRel.includes("mask-icon")) return 2;
						return 3;
					};
					return score(a.rel) - score(b.rel);
				});

			for (const candidate of candidates) {
				const dataUrl = await new Promise((resolve) => {
					const image = new Image();
					image.onload = () => {
						try {
							const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
							const width = Math.max(1, Math.round(image.naturalWidth * scale));
							const height = Math.max(1, Math.round(image.naturalHeight * scale));
							const canvas = document.createElement("canvas");
							canvas.width = width;
							canvas.height = height;
							const context = canvas.getContext("2d");
							if (!context) {
								resolve(null);
								return;
							}
							context.drawImage(image, 0, 0, width, height);
							resolve(canvas.toDataURL("image/png"));
						} catch {
							resolve(null);
						}
					};
					image.onerror = () => resolve(null);
					image.src = candidate.href;
				});

				if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
					return dataUrl;
				}
			}

			return null;
		})()
	`);

	return typeof result === "string" && result.startsWith("data:image/")
		? result
		: null;
}

function safeGetWebviewUrl(
	webview: Electron.WebviewTag,
	fallbackUrl: string,
): string {
	try {
		return webview.getURL() || fallbackUrl;
	} catch {
		return fallbackUrl;
	}
}

function safeGetWebviewTitle(
	webview: Electron.WebviewTag,
	fallbackTitle: string,
): string {
	try {
		return webview.getTitle() || fallbackTitle;
	} catch {
		return fallbackTitle;
	}
}

export function DashboardBrowserWebView({
	paneId,
	tabId,
	cacheKey,
	src,
	label,
	isActive,
	isViewActive,
	placement,
	splitRatioPercent,
	onStateChange,
	onFaviconCaptured,
	onReadyChange,
	onWebviewChange,
}: DashboardBrowserWebViewProps) {
	const webviewRef = useRef<Electron.WebviewTag | null>(null);
	const srcRef = useRef(src);
	const isReadyRef = useRef(false);
	const isActiveRef = useRef(isActive);
	const registeredWebContentsIdRef = useRef<number | null>(null);
	const labelRef = useRef(label);
	const onStateChangeRef = useRef(onStateChange);
	const onFaviconCapturedRef = useRef(onFaviconCaptured);
	const onReadyChangeRef = useRef(onReadyChange);
	const onWebviewChangeRef = useRef(onWebviewChange);
	const { mutate: registerBrowser } =
		electronTrpc.browser.register.useMutation();
	const { mutate: unregisterBrowser } =
		electronTrpc.browser.unregister.useMutation();
	const registerBrowserRef = useRef(registerBrowser);
	const unregisterBrowserRef = useRef(unregisterBrowser);
	const shouldReceivePointerEvents =
		shouldDashboardBrowserWebViewReceivePointerEvents({
			isViewActive,
			placement,
		});
	const placementStyle = placementStyleForSplitRatio({
		placement,
		splitRatioPercent,
	});

	useEffect(() => {
		srcRef.current = src;
	}, [src]);

	useEffect(() => {
		registerBrowserRef.current = registerBrowser;
	}, [registerBrowser]);

	useEffect(() => {
		unregisterBrowserRef.current = unregisterBrowser;
	}, [unregisterBrowser]);

	const registerWebview = useCallback(() => {
		const webview = webviewRef.current;
		if (!webview) return;
		let webContentsId: number;
		try {
			webContentsId = webview.getWebContentsId();
		} catch (error) {
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "register-deferred",
				cacheKey,
				url: srcRef.current,
				title: labelRef.current,
				detail: error instanceof Error ? error.message : String(error),
			});
			return;
		}

		if (
			!Number.isFinite(webContentsId) ||
			webContentsId <= 0 ||
			registeredWebContentsIdRef.current === webContentsId
		) {
			return;
		}

		registeredWebContentsIdRef.current = webContentsId;
		recordDashboardBrowserPaneEvent({
			paneId,
			tabId,
			event: "registered",
			cacheKey,
			url: safeGetWebviewUrl(webview, srcRef.current),
			title: safeGetWebviewTitle(webview, labelRef.current),
			webContentsId,
		});
		registerBrowserRef.current({ paneId, webContentsId });
	}, [cacheKey, paneId, tabId]);

	const focusActiveWebview = useCallback(() => {
		const webview = webviewRef.current;
		if (!webview || !isReadyRef.current || !isActiveRef.current) return;

		window.requestAnimationFrame(() => {
			if (
				webviewRef.current === webview &&
				isReadyRef.current &&
				isActiveRef.current
			) {
				webview.focus();
				recordDashboardBrowserPaneEvent({
					paneId,
					tabId,
					event: "focused",
					cacheKey,
					url: safeGetWebviewUrl(webview, srcRef.current),
					title: safeGetWebviewTitle(webview, labelRef.current),
				});
			}
		});
	}, [cacheKey, paneId, tabId]);

	useEffect(() => {
		isActiveRef.current = isActive;
		const retentionState = retentionStateForPlacement({ isActive, placement });
		recordDashboardBrowserPaneEvent({
			paneId,
			tabId,
			event: isActive ? "activated" : "deactivated",
			cacheKey,
			url: webviewRef.current?.getAttribute("src") ?? srcRef.current,
			title: labelRef.current,
			retentionState,
		});
		if (isActive) focusActiveWebview();
	}, [cacheKey, focusActiveWebview, isActive, paneId, placement, tabId]);

	useEffect(() => {
		if (isActive) return;
		const retentionState = retentionStateForPlacement({ isActive, placement });
		recordDashboardBrowserPaneEvent({
			paneId,
			tabId,
			event: "retention-state",
			cacheKey,
			url: webviewRef.current?.getAttribute("src") ?? srcRef.current,
			title: labelRef.current,
			retentionState,
		});
	}, [cacheKey, isActive, paneId, placement, tabId]);

	useEffect(() => {
		labelRef.current = label;
	}, [label]);

	useEffect(() => {
		onStateChangeRef.current = onStateChange;
	}, [onStateChange]);

	useEffect(() => {
		onFaviconCapturedRef.current = onFaviconCaptured;
	}, [onFaviconCaptured]);

	useEffect(() => {
		onReadyChangeRef.current = onReadyChange;
	}, [onReadyChange]);

	useEffect(() => {
		onWebviewChangeRef.current = onWebviewChange;
	}, [onWebviewChange]);

	const setWebviewRef = useCallback(
		(webview: Electron.WebviewTag | null) => {
			if (webview) {
				webview.setAttribute("allowpopups", "");
				if (!webview.getAttribute("src")) {
					webview.setAttribute("src", srcRef.current);
				}
			}
			webviewRef.current = webview;
			onWebviewChangeRef.current(tabId, webview);
			if (webview) {
				recordDashboardBrowserPaneEvent({
					paneId,
					tabId,
					event: "mounted",
					cacheKey,
					url: webview.getAttribute("src") ?? srcRef.current,
					title: labelRef.current,
				});
			}
			if (!webview) {
				isReadyRef.current = false;
				if (registeredWebContentsIdRef.current !== null) {
					registeredWebContentsIdRef.current = null;
					unregisterBrowserRef.current({ paneId });
				}
				recordDashboardBrowserPaneEvent({
					paneId,
					tabId,
					event: "unmounted",
					cacheKey,
					url: srcRef.current,
					title: labelRef.current,
					retentionState: "sleeping",
				});
				onReadyChangeRef.current(tabId, false);
			}
		},
		[cacheKey, paneId, tabId],
	);

	useEffect(() => {
		const webview = webviewRef.current;
		if (!webview) return;

		const syncNavigationState = () => {
			if (!isReadyRef.current) return;
			try {
				onStateChangeRef.current(tabId, {
					url: safeGetWebviewUrl(webview, srcRef.current),
					title: safeGetWebviewTitle(webview, labelRef.current),
					canGoBack: webview.canGoBack(),
					canGoForward: webview.canGoForward(),
					isLoading: webview.isLoading(),
				});
			} catch {
				return;
			}
		};

		const captureAndStoreFavicon = () => {
			if (!isReadyRef.current) return;
			void captureWebviewFaviconDataUrl(webview)
				.then((favicon) => {
					if (!favicon) return;
					onFaviconCapturedRef.current(
						tabId,
						favicon,
						safeGetWebviewUrl(webview, srcRef.current),
					);
				})
				.catch(() => undefined);
		};

		const handleStartLoading = () => {
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "load-start",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
			});
			onStateChangeRef.current(tabId, { isLoading: true });
		};
		const handleStopLoading = () => {
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "load-stop",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
			});
			onStateChangeRef.current(tabId, { isLoading: false });
			syncNavigationState();
			captureAndStoreFavicon();
		};
		const handleDomReady = () => {
			isReadyRef.current = true;
			registerWebview();
			void webview
				.executeJavaScript(DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT)
				.catch(() => undefined);
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "dom-ready",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
			});
			onReadyChangeRef.current(tabId, true);
			syncNavigationState();
			captureAndStoreFavicon();
			focusActiveWebview();
		};
		const handleTitleUpdated = () => {
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "title-updated",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
			});
			syncNavigationState();
		};
		const handleNavigate = () => {
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "navigate",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
			});
			syncNavigationState();
		};
		const handleFaviconUpdated = () => {
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "favicon-updated",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
			});
			captureAndStoreFavicon();
		};
		const handleDidFailLoad = (event: Event) => {
			const failure = event as Event & {
				errorCode?: number;
				errorDescription?: string;
				validatedURL?: string;
			};
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "did-fail-load",
				cacheKey,
				url: failure.validatedURL || safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
				detail:
					failure.errorDescription ??
					(typeof failure.errorCode === "number"
						? `Error ${failure.errorCode}`
						: null),
			});
		};
		const handleRenderProcessGone = (event: Event) => {
			const gone = event as Event & { reason?: string };
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "render-process-gone",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
				detail: gone.reason ?? null,
			});
		};

		webview.addEventListener("dom-ready", handleDomReady);
		webview.addEventListener("did-start-loading", handleStartLoading);
		webview.addEventListener("did-stop-loading", handleStopLoading);
		webview.addEventListener("page-title-updated", handleTitleUpdated);
		webview.addEventListener("did-navigate", handleNavigate);
		webview.addEventListener("did-navigate-in-page", handleNavigate);
		webview.addEventListener("did-fail-load", handleDidFailLoad);
		webview.addEventListener(
			"render-process-gone",
			handleRenderProcessGone as EventListener,
		);
		webview.addEventListener(
			"page-favicon-updated",
			handleFaviconUpdated as EventListener,
		);
		registerWebview();

		return () => {
			isReadyRef.current = false;
			onReadyChangeRef.current(tabId, false);
			if (registeredWebContentsIdRef.current !== null) {
				registeredWebContentsIdRef.current = null;
				unregisterBrowserRef.current({ paneId });
			}
			webview.removeEventListener("dom-ready", handleDomReady);
			webview.removeEventListener("did-start-loading", handleStartLoading);
			webview.removeEventListener("did-stop-loading", handleStopLoading);
			webview.removeEventListener("page-title-updated", handleTitleUpdated);
			webview.removeEventListener("did-navigate", handleNavigate);
			webview.removeEventListener("did-navigate-in-page", handleNavigate);
			webview.removeEventListener("did-fail-load", handleDidFailLoad);
			webview.removeEventListener(
				"render-process-gone",
				handleRenderProcessGone as EventListener,
			);
			webview.removeEventListener(
				"page-favicon-updated",
				handleFaviconUpdated as EventListener,
			);
		};
	}, [cacheKey, focusActiveWebview, paneId, registerWebview, tabId]);

	return (
		<div
			data-dashboard-browser-view=""
			data-dashboard-browser-tab-id={tabId}
			data-dashboard-browser-tab-active={isActive ? "true" : "false"}
			data-dashboard-browser-tab-visible={
				placement === "hidden" ? "false" : "true"
			}
			data-dashboard-browser-tab-placement={placement}
			style={placementStyle}
			className={cn(
				"absolute flex min-h-0 min-w-0",
				placement === "full" && "inset-0",
				placement === "left" &&
					"inset-y-0 left-0 right-1/2 border-r border-border",
				placement === "right" && "inset-y-0 left-1/2 right-0",
				shouldReceivePointerEvents
					? "pointer-events-auto z-10 opacity-100"
					: "pointer-events-none z-0",
				placement === "hidden"
					? "pointer-events-none inset-0 z-0 opacity-0"
					: "opacity-100",
			)}
		>
			<webview
				ref={setWebviewRef}
				partition={DESKTOP_BROWSER_PARTITION}
				className="min-h-0 min-w-0 flex-1 border-0"
				style={{
					pointerEvents: shouldReceivePointerEvents ? "auto" : "none",
				}}
			/>
		</div>
	);
}
