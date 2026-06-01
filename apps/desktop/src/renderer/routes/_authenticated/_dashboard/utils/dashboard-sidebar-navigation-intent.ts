import type { DashboardWebTabAppId } from "./dashboard-web-tabs";

export type DashboardSidebarNavigationIntent =
	| { type: "native-provider"; provider: "capy" | "devin" }
	| { type: "native-session"; id: string; provider: "capy" | "devin" }
	| { type: "web-app"; appId: DashboardWebTabAppId }
	| { type: "web-page"; pageId: string }
	| { type: "web-tab"; tabId: string };

function closestDatasetValue(target: Element, selector: string): string | null {
	const element = target.closest<HTMLElement>(selector);
	if (!element) return null;
	const attributeName = selector.slice(1, -1);
	const value = element.getAttribute(attributeName);
	return value?.trim() || null;
}

function isNativeProvider(value: string): value is "capy" | "devin" {
	return value === "capy" || value === "devin";
}

export function resolveDashboardSidebarNavigationIntent(
	target: EventTarget | null,
): DashboardSidebarNavigationIntent | null {
	if (!(target instanceof Element)) return null;

	const nativeSessionButton = target.closest<HTMLElement>(
		"[data-native-agent-session-row-id][data-native-agent-session-row-provider]",
	);
	if (nativeSessionButton) {
		const id =
			nativeSessionButton
				.getAttribute("data-native-agent-session-row-id")
				?.trim() ?? "";
		const provider =
			nativeSessionButton
				.getAttribute("data-native-agent-session-row-provider")
				?.trim() ?? "";
		if (id && isNativeProvider(provider)) {
			return { type: "native-session", id, provider };
		}
	}

	const nativeProvider = closestDatasetValue(
		target,
		"[data-dashboard-native-provider-trigger]",
	);
	if (nativeProvider && isNativeProvider(nativeProvider)) {
		return { type: "native-provider", provider: nativeProvider };
	}

	const webTabId = closestDatasetValue(
		target,
		"[data-dashboard-web-tab-row-button]",
	);
	if (webTabId) return { type: "web-tab", tabId: webTabId };

	const webAppId = closestDatasetValue(
		target,
		"[data-dashboard-web-app-trigger]",
	);
	if (webAppId) {
		return { type: "web-app", appId: webAppId as DashboardWebTabAppId };
	}

	const webPageId = closestDatasetValue(
		target,
		"[data-dashboard-web-page-trigger]",
	);
	if (webPageId) return { type: "web-page", pageId: webPageId };

	return null;
}

export function dashboardSidebarNavigationIntentPath(
	intent: DashboardSidebarNavigationIntent,
): string | null {
	if (intent.type === "native-provider") {
		return intent.provider === "capy" ? "/native/capy" : "/native/devin";
	}

	if (intent.type === "native-session") {
		return intent.provider === "capy"
			? `/native/capy/${encodeURIComponent(intent.id)}`
			: `/native/devin/${encodeURIComponent(intent.id)}`;
	}

	if (intent.type === "web-page") {
		return `/web/${encodeURIComponent(intent.pageId)}`;
	}

	if (intent.type === "web-tab") {
		return `/web-tabs/${encodeURIComponent(intent.tabId)}`;
	}

	return null;
}
