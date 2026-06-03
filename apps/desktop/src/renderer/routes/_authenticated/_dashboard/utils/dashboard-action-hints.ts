const DASHBOARD_ACTION_HINT_KEYS = "asdfghjklqwertyuiopzxcvbnm".split("");

const DASHBOARD_ACTION_HINT_TARGET_SELECTOR = [
	"button:not([disabled])",
	"a[href]",
	"[role='button']:not([aria-disabled='true'])",
	"[role='menuitem']:not([aria-disabled='true'])",
	"[data-dashboard-action-hint-target='true']",
].join(",");

const DASHBOARD_ACTION_HINT_EXCLUDED_ANCESTOR_SELECTOR = [
	"[data-dashboard-action-hints-overlay]",
	"[data-dashboard-keyboard-help]",
	"[data-command-palette-input]",
	"[aria-hidden='true']",
].join(",");

export interface DashboardActionHintTarget {
	element: HTMLElement;
	label: string;
	rect: {
		height: number;
		left: number;
		top: number;
		width: number;
	};
	title: string;
}

export function dashboardActionHintLabelForIndex(index: number): string {
	if (!Number.isInteger(index) || index < 0) return "";
	const keyCount = DASHBOARD_ACTION_HINT_KEYS.length;
	if (index < keyCount) return DASHBOARD_ACTION_HINT_KEYS[index] ?? "";
	const normalizedIndex = index - keyCount;
	const first = Math.floor(normalizedIndex / keyCount);
	const second = normalizedIndex % keyCount;
	const firstKey = DASHBOARD_ACTION_HINT_KEYS[first];
	const secondKey = DASHBOARD_ACTION_HINT_KEYS[second];
	return firstKey && secondKey ? `${firstKey}${secondKey}` : "";
}

function isHTMLElement(value: Element | null): value is HTMLElement {
	return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

function isElementDisabled(element: HTMLElement): boolean {
	if (element instanceof HTMLButtonElement && element.disabled) return true;
	if (element instanceof HTMLInputElement && element.disabled) return true;
	return element.getAttribute("aria-disabled") === "true";
}

function isVisibleTarget(element: HTMLElement): boolean {
	if (element.closest(DASHBOARD_ACTION_HINT_EXCLUDED_ANCESTOR_SELECTOR)) {
		return false;
	}
	if (isElementDisabled(element)) return false;
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return false;
	const viewportWidth =
		typeof window === "undefined"
			? Number.POSITIVE_INFINITY
			: window.innerWidth;
	const viewportHeight =
		typeof window === "undefined"
			? Number.POSITIVE_INFINITY
			: window.innerHeight;
	return (
		rect.bottom >= 0 &&
		rect.right >= 0 &&
		rect.top <= viewportHeight &&
		rect.left <= viewportWidth
	);
}

function targetTitle(element: HTMLElement): string {
	return (
		element.getAttribute("aria-label")?.trim() ||
		element.getAttribute("title")?.trim() ||
		element.textContent?.trim().replace(/\s+/g, " ") ||
		"Action"
	);
}

export function collectDashboardActionHintTargets(
	root: ParentNode,
): DashboardActionHintTarget[] {
	const seen = new Set<HTMLElement>();
	const targets: DashboardActionHintTarget[] = [];

	for (const candidate of root.querySelectorAll(
		DASHBOARD_ACTION_HINT_TARGET_SELECTOR,
	)) {
		if (!isHTMLElement(candidate) || seen.has(candidate)) continue;
		if (!isVisibleTarget(candidate)) continue;
		seen.add(candidate);
		const rect = candidate.getBoundingClientRect();
		const label = dashboardActionHintLabelForIndex(targets.length);
		if (!label) break;
		targets.push({
			element: candidate,
			label,
			rect: {
				height: rect.height,
				left: rect.left,
				top: rect.top,
				width: rect.width,
			},
			title: targetTitle(candidate),
		});
	}

	return targets;
}

export function activateDashboardActionHintTarget(element: HTMLElement): void {
	try {
		element.focus({ preventScroll: true });
	} catch {
		element.focus();
	}
	element.click();
}
