const SIDEBAR_KEYBOARD_FOCUS_SELECTOR =
	'[data-dashboard-sidebar-keyboard-focus="true"]';

export const DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE =
	"data-dashboard-sidebar-keyboard-focus";

export function markDashboardSidebarKeyboardFocus(item: HTMLElement): void {
	const root =
		item.closest<HTMLElement>('[data-dashboard-sidebar-root="true"]') ??
		item.parentElement;
	for (const element of root?.querySelectorAll<HTMLElement>(
		SIDEBAR_KEYBOARD_FOCUS_SELECTOR,
	) ?? []) {
		if (element !== item) {
			element.removeAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE);
		}
	}
	item.setAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE, "true");
}
