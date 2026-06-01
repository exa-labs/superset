export type DashboardBrowserWebViewPlacement =
	| "full"
	| "hidden"
	| "left"
	| "right";

export function shouldDashboardBrowserWebViewReceivePointerEvents({
	isViewActive,
	placement,
}: {
	isViewActive: boolean;
	placement: DashboardBrowserWebViewPlacement;
}): boolean {
	return isViewActive && placement !== "hidden";
}
