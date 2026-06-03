const ACTIVE_SIDEBAR_SELECTOR =
	'[data-dashboard-sidebar-active="true"]:not([disabled])';
const ACTIVE_NATIVE_AGENT_ROW_SELECTOR = [
	'[data-dashboard-sidebar-active="true"][data-native-agent-session-row-id]:not([disabled])',
	'[data-dashboard-sidebar-active="true"] [data-native-agent-session-row-id]:not([disabled])',
].join(",");

const PRIMARY_SIDEBAR_SELECTOR = [
	'[data-dashboard-sidebar-roving-item="true"]',
	"[data-dashboard-web-page-trigger]",
	"[data-dashboard-web-app-trigger]",
	"[data-dashboard-web-tab-row-button]",
	"[data-dashboard-quick-terminal-trigger]",
	"[data-dashboard-native-provider-trigger]",
	"[data-native-agent-folder-row-id]",
	"[data-native-agent-session-row-id]",
].join(",");

const FALLBACK_SIDEBAR_SELECTOR = [
	"button:not([disabled])",
	"a[href]",
	"[role='button']:not([aria-disabled='true'])",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

function isHTMLElement(value: Element | null): value is HTMLElement {
	if (!value) return false;
	if (typeof HTMLElement !== "undefined") return value instanceof HTMLElement;
	return (
		"focus" in value &&
		"getBoundingClientRect" in value &&
		"scrollIntoView" in value
	);
}

function isVisible(element: HTMLElement): boolean {
	if (element.getAttribute("aria-hidden") === "true") return false;
	if (element.tabIndex < 0) return false;
	const rect = element.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
}

function firstVisible(elements: Iterable<Element>): HTMLElement | null {
	for (const element of elements) {
		if (!isHTMLElement(element) || !isVisible(element)) continue;
		return element;
	}
	return null;
}

function isAuxiliarySidebarAction(element: HTMLElement): boolean {
	if (element.matches("[data-dashboard-sidebar-action]")) return true;
	const scope = element.closest<HTMLElement>(
		"[data-dashboard-sidebar-action-scope]",
	);
	return scope != null && scope !== element;
}

function firstPrimarySidebarItem(root: HTMLElement): HTMLElement | null {
	return firstVisible(root.querySelectorAll(PRIMARY_SIDEBAR_SELECTOR));
}

function firstFallbackSidebarItem(root: HTMLElement): HTMLElement | null {
	for (const element of root.querySelectorAll(FALLBACK_SIDEBAR_SELECTOR)) {
		if (
			!isHTMLElement(element) ||
			!isVisible(element) ||
			isAuxiliarySidebarAction(element)
		) {
			continue;
		}
		return element;
	}
	return null;
}

export function focusDashboardNavigationShell(
	doc: Document | null = typeof document === "undefined" ? null : document,
): boolean {
	if (!doc) return false;
	const root = doc.querySelector<HTMLElement>(
		'[data-dashboard-sidebar-root="true"]',
	);
	if (!root) return false;

	const target =
		firstVisible(root.querySelectorAll(ACTIVE_NATIVE_AGENT_ROW_SELECTOR)) ??
		firstVisible(root.querySelectorAll(ACTIVE_SIDEBAR_SELECTOR)) ??
		firstPrimarySidebarItem(root) ??
		firstFallbackSidebarItem(root);
	if (!target) return false;

	target.focus({ preventScroll: true });
	target.scrollIntoView({ block: "nearest" });
	return true;
}
