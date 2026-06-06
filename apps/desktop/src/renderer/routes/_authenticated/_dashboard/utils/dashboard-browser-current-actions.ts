import type { DashboardBrowserShortcutAction } from "./dashboard-browser-shortcuts";

export const DASHBOARD_BROWSER_CURRENT_ACTION_EVENT =
	"dashboard-browser-current-action";

export type DashboardBrowserCurrentAction =
	| DashboardBrowserShortcutAction
	| "new-chatgpt-tab"
	| "new-claude-tab"
	| "new-google-tab";

export interface DashboardBrowserCurrentActionEventDetail {
	action: DashboardBrowserCurrentAction;
}

const DASHBOARD_BROWSER_CURRENT_ACTIONS = new Set<string>([
	"close-current-tab",
	"close-split",
	"equalize-split",
	"go-back",
	"go-forward",
	"narrow-active-split",
	"new-chatgpt-tab",
	"new-claude-tab",
	"new-current-url-tab",
	"new-google-tab",
	"next-tab",
	"open-external",
	"previous-tab",
	"reload",
	"swap-split",
	"toggle-tab-pin",
	"toggle-split",
	"widen-active-split",
]);

export function isDashboardBrowserCurrentAction(
	value: unknown,
): value is DashboardBrowserCurrentAction {
	return (
		typeof value === "string" && DASHBOARD_BROWSER_CURRENT_ACTIONS.has(value)
	);
}

export function dashboardBrowserCurrentActionEventDetail(
	event: Event,
): DashboardBrowserCurrentActionEventDetail | null {
	const detail = (
		event as CustomEvent<Partial<DashboardBrowserCurrentActionEventDetail>>
	).detail;
	if (!detail || !isDashboardBrowserCurrentAction(detail.action)) return null;
	return { action: detail.action };
}

export function dispatchDashboardBrowserCurrentAction(
	detail: DashboardBrowserCurrentActionEventDetail,
): boolean {
	if (typeof window === "undefined") return false;
	const event = new CustomEvent(DASHBOARD_BROWSER_CURRENT_ACTION_EVENT, {
		cancelable: true,
		detail,
	});
	window.dispatchEvent(event);
	return event.defaultPrevented;
}
