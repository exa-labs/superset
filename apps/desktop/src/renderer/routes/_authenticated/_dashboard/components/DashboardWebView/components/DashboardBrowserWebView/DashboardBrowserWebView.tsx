import { cn } from "@superset/ui/utils";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { recordDashboardBrowserPaneEvent } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-browser-diagnostics";
import { useDashboardVimModeStore } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import { DESKTOP_BROWSER_PARTITION } from "shared/constants";
import {
	type DashboardBrowserWebViewPlacement,
	shouldDashboardBrowserWebViewReceivePointerEvents,
} from "./dashboard-browser-webview-interaction";

const FAVICON_CAPTURE_SIZE = 64;
export const DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT = `
(() => {
	if (window.__clankeeDashboardWebShortcutBridgeInstalled) return;
	window.__clankeeDashboardWebShortcutBridgeInstalled = true;
	const prefix = "__CLANKEE_DASHBOARD_WEB_SHORTCUT__:";
	const hintKeys = "asdfghjklqwertyuiopzxcvbnm".split("");
	let activeHints = null;
	let activeHintPrefix = "";
	let pendingDashboardVimPrefix = null;
	let pendingDashboardVimPrefixTimeout = null;
	const invokeShortcut = (shortcut) => {
		console.info(prefix + shortcut);
	};
	const clearDashboardVimPrefix = () => {
		if (pendingDashboardVimPrefixTimeout) {
			clearTimeout(pendingDashboardVimPrefixTimeout);
			pendingDashboardVimPrefixTimeout = null;
		}
		pendingDashboardVimPrefix = null;
	};
	const setDashboardVimPrefix = (nextPrefix) => {
		clearDashboardVimPrefix();
		pendingDashboardVimPrefix = nextPrefix;
		if (!nextPrefix) return;
		pendingDashboardVimPrefixTimeout = setTimeout(() => {
			pendingDashboardVimPrefix = null;
			pendingDashboardVimPrefixTimeout = null;
		}, 900);
	};
	const hintLabelForIndex = (index) => {
		if (!Number.isInteger(index) || index < 0) return "";
		if (index < hintKeys.length) return hintKeys[index] || "";
		const normalized = index - hintKeys.length;
		const first = Math.floor(normalized / hintKeys.length);
		const second = normalized % hintKeys.length;
		return hintKeys[first] && hintKeys[second]
			? hintKeys[first] + hintKeys[second]
			: "";
	};
	const isEditableTarget = (target) => {
		if (!(target instanceof Element)) return false;
		const element = target instanceof HTMLElement ? target : target.parentElement;
		if (!element) return false;
		if (element.isContentEditable) return true;
		return Boolean(
			element.closest(
				"input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='textbox']",
			),
		);
	};
	const isVisibleTarget = (element) => {
		if (!(element instanceof HTMLElement)) return false;
		if (element.getAttribute("aria-disabled") === "true") return false;
		if ("disabled" in element && element.disabled === true) return false;
		const rect = element.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return false;
		return (
			rect.bottom >= 0 &&
			rect.right >= 0 &&
			rect.top <= window.innerHeight &&
			rect.left <= window.innerWidth
		);
	};
	const targetTitle = (element) =>
		element.getAttribute("aria-label") ||
		element.getAttribute("title") ||
		(element.textContent || "").trim().replace(/\\s+/g, " ") ||
		"Action";
	const collectHintTargets = () => {
		const selector = [
			"a[href]",
			"button:not([disabled])",
			"input[type='button']:not([disabled])",
			"input[type='submit']:not([disabled])",
			"input[type='reset']:not([disabled])",
			"[role='button']:not([aria-disabled='true'])",
			"[role='link']:not([aria-disabled='true'])",
			"summary",
		].join(",");
		const seen = new Set();
		const targets = [];
		for (const element of document.querySelectorAll(selector)) {
			if (!(element instanceof HTMLElement) || seen.has(element)) continue;
			if (!isVisibleTarget(element)) continue;
			seen.add(element);
			const label = hintLabelForIndex(targets.length);
			if (!label) break;
			const rect = element.getBoundingClientRect();
			targets.push({ element, label, rect, title: targetTitle(element) });
		}
		return targets;
	};
	const removeHintOverlay = () => {
		document
			.querySelectorAll("[data-clankee-page-action-hints-overlay]")
			.forEach((element) => element.remove());
	};
	const renderHintOverlay = () => {
		removeHintOverlay();
		if (!activeHints) return;
		const overlay = document.createElement("div");
		overlay.setAttribute("data-clankee-page-action-hints-overlay", "true");
		overlay.style.cssText =
			"position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
		for (const target of activeHints) {
			const badge = document.createElement("div");
			badge.textContent = target.label;
			badge.title = target.title;
			badge.style.cssText = [
				"position:absolute",
				"min-width:16px",
				"height:16px",
				"padding:2px 5px",
				"border-radius:4px",
				"border:1px solid rgba(255,255,255,0.9)",
				"background:#facc15",
				"color:#111827",
				"font:700 11px/12px ui-monospace,SFMono-Regular,Menlo,monospace",
				"box-shadow:0 4px 16px rgba(0,0,0,0.35)",
				"opacity:" + (target.label.startsWith(activeHintPrefix) ? "1" : "0.3"),
				"left:" + Math.max(4, Math.round(target.rect.left)) + "px",
				"top:" + Math.max(4, Math.round(target.rect.top)) + "px",
			].join(";");
			overlay.appendChild(badge);
		}
		document.documentElement.appendChild(overlay);
	};
	const closeHints = () => {
		activeHints = null;
		activeHintPrefix = "";
		clearDashboardVimPrefix();
		removeHintOverlay();
	};
	const openHints = () => {
		activeHints = collectHintTargets();
		activeHintPrefix = "";
		if (activeHints.length === 0) {
			activeHints = null;
			return false;
		}
		renderHintOverlay();
		return true;
	};
	window.__clankeeOpenDashboardActionHints = openHints;
	const activateHintTarget = (target) => {
		closeHints();
		try {
			target.element.focus({ preventScroll: true });
		} catch {
			try {
				target.element.focus();
			} catch {}
		}
		target.element.click();
	};
	window.__clankeeSetDashboardVimModeEnabled = (enabled) => {
		window.__clankeeDashboardVimModeEnabled = enabled === true;
		if (!window.__clankeeDashboardVimModeEnabled) {
			clearDashboardVimPrefix();
			closeHints();
		}
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
		if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
			const key = String(event.key || "").toLowerCase();
			const code = String(event.code || "").toLowerCase();
			if (!event.repeat && (code === "escape" || key === "escape")) {
				return "FOCUS_DASHBOARD_SHELL";
			}
		}
		if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat) return null;
		const key = String(event.key || "").toLowerCase();
		const shiftedCode = String(event.code || "").toLowerCase();
		if (shiftedCode === "tab") {
			return event.shiftKey
				? "SWITCH_DASHBOARD_VIEW_PREVIOUS"
				: "SWITCH_DASHBOARD_VIEW_NEXT";
		}
		if (shiftedCode === "slash" || key === "/" || key === "?") {
			return "SHOW_DASHBOARD_KEYBOARD_HELP";
		}
		if (event.shiftKey) {
			if (shiftedCode === "keyc") return "CREATE_CAPY";
			if (shiftedCode === "keyd") return "CREATE_DEVIN";
			if (shiftedCode === "keyn") return "MARK_LATEST_NATIVE_REPLY_READ";
			return null;
		}
		const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code || "");
		if (digit) return digitShortcuts[Number.parseInt(digit[1], 10) - 1] || null;
		const code = shiftedCode;
		if (code === "keyk") return "OPEN_CONTROL_PLANE";
		if (code === "keyc") return "OPEN_CAPY";
		if (code === "keyd") return "OPEN_DEVIN";
		if (code === "keyf") return "SHOW_DASHBOARD_ACTION_HINTS";
		if (code === "keyg") return "OPEN_CHROME";
		if (code === "keyn") return "OPEN_UNREAD_NATIVE_REPLY";
		if (code === "keyv") return "TOGGLE_VIM_MODE";
		if (code === "keyw") return "OPEN_WORKSPACES";
		if (code === "keyb") return "TOGGLE_NATIVE_BROWSER_VIEW";
		if (code === "keys") return "TOGGLE_NATIVE_SPLIT_VIEW";
		return null;
	};
	const browserVimShortcutFromEvent = (event) => {
		if (
			window.__clankeeDashboardVimModeEnabled !== true ||
			event.repeat ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			isEditableTarget(event.target)
		) {
			return null;
		}
		const key = String(event.key || "");
		if (key === "n") return "BROWSER_NEW_TAB";
		if (key === "r") return "BROWSER_RELOAD";
		if (key === "s") return "BROWSER_TOGGLE_SPLIT";
		if (key === "q") return "BROWSER_CLOSE_SPLIT";
		if (key === "w") return "BROWSER_SWAP_SPLIT";
		if (key === "[") return "BROWSER_NARROW_SPLIT";
		if (key === "]") return "BROWSER_WIDEN_SPLIT";
		if (key === "=") return "BROWSER_EQUALIZE_SPLIT";
		if (key === "x") return "BROWSER_CLOSE_TAB";
		if (key === "p") return "BROWSER_TOGGLE_PIN";
		if (key === "H") return "BROWSER_GO_BACK";
		if (key === "L") return "BROWSER_GO_FORWARD";
		if (key === "O") return "BROWSER_OPEN_EXTERNAL";
		if (key === "h") return "BROWSER_PREVIOUS_TAB";
		if (key === "l") return "BROWSER_NEXT_TAB";
		return null;
	};
	const dashboardVimShortcutFromEvent = (event) => {
		if (
			window.__clankeeDashboardVimModeEnabled !== true ||
			event.repeat ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			isEditableTarget(event.target)
		) {
			clearDashboardVimPrefix();
			return null;
		}
		const key = String(event.key || "");
		if (key === "Escape") {
			clearDashboardVimPrefix();
			return "FOCUS_DASHBOARD_SHELL";
		}
		if (key === "H") {
			clearDashboardVimPrefix();
			return "TOGGLE_DASHBOARD_SIDEBAR";
		}
		if (key === "/") {
			clearDashboardVimPrefix();
			return "SIDEBAR_FOCUS_SEARCH";
		}
		if (key === "j") {
			clearDashboardVimPrefix();
			return "SIDEBAR_FOCUS_NEXT";
		}
		if (key === "k") {
			clearDashboardVimPrefix();
			return "SIDEBAR_FOCUS_PREVIOUS";
		}
		if (key === "G") {
			clearDashboardVimPrefix();
			return "SIDEBAR_FOCUS_LAST";
		}
		if (key === "Enter") {
			clearDashboardVimPrefix();
			return "SIDEBAR_ACTIVATE";
		}
		if (key === " " || key === "Space" || key === "Spacebar") {
			clearDashboardVimPrefix();
			return "SIDEBAR_TOGGLE_EXPANSION";
		}
		if (pendingDashboardVimPrefix === "g") {
			clearDashboardVimPrefix();
			if (key === "c") return "OPEN_CAPY";
			if (key === "d") return "OPEN_DEVIN";
			if (key === "g") return "SIDEBAR_FOCUS_FIRST";
			if (key === "w") return "OPEN_WORKSPACES";
			return null;
		}
		if (key === "g") {
			setDashboardVimPrefix("g");
			return "__PENDING__";
		}
		return null;
	};
	window.addEventListener(
		"keydown",
		(event) => {
			if (activeHints) {
				if (event.altKey || event.ctrlKey || event.metaKey) return;
				const key =
					event.key === "Escape"
						? "escape"
						: event.key.length === 1
							? event.key.toLowerCase()
							: null;
				if (!key) return;
				event.preventDefault();
				event.stopPropagation();
				if (key === "escape") {
					closeHints();
					return;
				}
				const nextPrefix = activeHintPrefix + key;
				const exact = activeHints.find((target) => target.label === nextPrefix);
				if (exact) {
					activateHintTarget(exact);
					return;
				}
				if (activeHints.some((target) => target.label.startsWith(nextPrefix))) {
					activeHintPrefix = nextPrefix;
					renderHintOverlay();
					return;
				}
				closeHints();
				return;
			}
			if (
				window.__clankeeDashboardVimModeEnabled === true &&
				!event.repeat &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				String(event.key || "") === "?" &&
				!isEditableTarget(event.target)
			) {
				clearDashboardVimPrefix();
				event.preventDefault();
				event.stopPropagation();
				invokeShortcut("SHOW_DASHBOARD_KEYBOARD_HELP");
				return;
			}
			if (
				window.__clankeeDashboardVimModeEnabled === true &&
				!event.repeat &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey &&
				String(event.key || "").toLowerCase() === "f" &&
				!isEditableTarget(event.target)
			) {
				clearDashboardVimPrefix();
				if (openHints()) {
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			}
			const browserVimShortcut = browserVimShortcutFromEvent(event);
			if (browserVimShortcut) {
				clearDashboardVimPrefix();
				event.preventDefault();
				event.stopPropagation();
				invokeShortcut(browserVimShortcut);
				return;
			}
			const dashboardVimShortcut = dashboardVimShortcutFromEvent(event);
			if (dashboardVimShortcut) {
				event.preventDefault();
				event.stopPropagation();
				if (dashboardVimShortcut !== "__PENDING__") {
					invokeShortcut(dashboardVimShortcut);
				}
				return;
			}
			const shortcut = shortcutFromEvent(event);
			if (!shortcut) return;
			event.preventDefault();
			event.stopPropagation();
			invokeShortcut(shortcut);
		},
		true,
	);
	window.addEventListener("scroll", closeHints, true);
	window.addEventListener("resize", closeHints, true);
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
	const dashboardVimModeEnabled = useDashboardVimModeStore(
		(state) => state.enabled,
	);
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

	const syncDashboardVimMode = useCallback(() => {
		const webview = webviewRef.current;
		if (!webview || !isReadyRef.current) return;
		void webview
			.executeJavaScript(
				`window.__clankeeSetDashboardVimModeEnabled?.(${JSON.stringify(
					dashboardVimModeEnabled,
				)});`,
			)
			.catch(() => undefined);
	}, [dashboardVimModeEnabled]);

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
		const bridgeInstallTimeouts: number[] = [];

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
		const markReady = () => {
			const wasReady = isReadyRef.current;
			isReadyRef.current = true;
			registerWebview();
			if (!wasReady) {
				onReadyChangeRef.current(tabId, true);
			}
			syncNavigationState();
		};
		const installShortcutBridge = () => {
			let bridgeInstall: Promise<unknown>;
			try {
				bridgeInstall = webview.executeJavaScript(
					DASHBOARD_WEB_SHORTCUT_BRIDGE_SCRIPT,
				);
			} catch {
				return;
			}
			void bridgeInstall
				.then(() => {
					markReady();
					syncDashboardVimMode();
				})
				.catch(() => undefined);
		};
		const scheduleShortcutBridgeInstall = (delayMs: number) => {
			bridgeInstallTimeouts.push(
				window.setTimeout(installShortcutBridge, delayMs),
			);
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
			installShortcutBridge();
		};
		const handleDomReady = () => {
			markReady();
			installShortcutBridge();
			recordDashboardBrowserPaneEvent({
				paneId,
				tabId,
				event: "dom-ready",
				cacheKey,
				url: safeGetWebviewUrl(webview, srcRef.current),
				title: safeGetWebviewTitle(webview, labelRef.current),
			});
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
		scheduleShortcutBridgeInstall(0);
		scheduleShortcutBridgeInstall(250);
		scheduleShortcutBridgeInstall(1000);
		scheduleShortcutBridgeInstall(3000);

		return () => {
			for (const timeoutId of bridgeInstallTimeouts) {
				window.clearTimeout(timeoutId);
			}
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
	}, [
		cacheKey,
		focusActiveWebview,
		paneId,
		registerWebview,
		syncDashboardVimMode,
		tabId,
	]);

	useEffect(() => {
		syncDashboardVimMode();
	}, [syncDashboardVimMode]);

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
