const DASHBOARD_ACTION_HINT_KEYS = "asdfghjklqwertyuiopzxcvbnm".split("");
export const DASHBOARD_ACTION_HINTS_OPEN_EVENT = "dashboard-action-hints-open";

const DASHBOARD_ACTION_HINT_TARGET_SELECTOR = [
	"button:not([disabled])",
	"a[href]",
	"[role='button']:not([aria-disabled='true'])",
	"[role='menuitem']:not([aria-disabled='true'])",
	"[data-dashboard-action-hint-target='true']",
].join(",");

const DASHBOARD_ACTION_HINT_EXCLUDED_ANCESTOR_SELECTOR = [
	"[data-dashboard-action-hints-overlay]",
	"[data-dashboard-action-hint-exclude='true']",
	"[data-dashboard-keyboard-help]",
	"[data-native-agent-header='true']",
	"[data-native-agent-header-menu='true']",
	"[data-command-palette-input]",
	"[aria-hidden='true']",
	".sr-only",
].join(",");

const DASHBOARD_ACTION_HINT_SCOPED_ROOT_SELECTOR = [
	"[data-dashboard-sidebar-action-scope]",
	"[data-native-agent-view-root]",
].join(",");
const DASHBOARD_ACTION_HINT_KEYBOARD_FOCUS_SELECTOR =
	'[data-dashboard-sidebar-keyboard-focus="true"]';
const DASHBOARD_ACTION_HINT_ACTIVE_SIDEBAR_SELECTOR =
	'[data-dashboard-sidebar-active="true"]';

export interface DashboardActionHintTarget {
	displayLabel: string;
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

export type DashboardActionHintKey = "escape" | string;

export interface DashboardActionHintKeyboardInput {
	altKey: boolean;
	ctrlKey: boolean;
	defaultPrevented: boolean;
	key: string;
	metaKey: boolean;
	shiftKey?: boolean;
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

export function dashboardActionHintKeyFromInput(
	input: DashboardActionHintKeyboardInput,
): DashboardActionHintKey | null {
	if (input.defaultPrevented) return null;
	if (input.altKey || input.ctrlKey || input.metaKey) return null;
	if (input.key === "Escape") return "escape";
	if (input.key === "Enter") return "enter";
	if (input.key.length !== 1) return null;
	if (input.shiftKey && /^[a-z]$/i.test(input.key))
		return input.key.toUpperCase();
	return input.key.toLowerCase();
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

export function dashboardActionHintRootForElement(
	element: Element | null,
	fallbackRoot: ParentNode,
): ParentNode | null {
	const activeScope = closestDashboardActionHintScope(element);
	if (activeScope) return activeScope;

	const focusedScope = dashboardActionHintScopeFromSelector(
		fallbackRoot,
		DASHBOARD_ACTION_HINT_KEYBOARD_FOCUS_SELECTOR,
	);
	if (focusedScope) return focusedScope;

	const activeSidebarScope = dashboardActionHintScopeFromSelector(
		fallbackRoot,
		DASHBOARD_ACTION_HINT_ACTIVE_SIDEBAR_SELECTOR,
	);
	return activeSidebarScope;
}

function targetTitle(element: HTMLElement): string {
	return (
		element.getAttribute("data-dashboard-action-hint-title")?.trim() ||
		element.getAttribute("aria-label")?.trim() ||
		element.getAttribute("title")?.trim() ||
		element.textContent?.trim().replace(/\s+/g, " ") ||
		"Action"
	);
}

const SIDEBAR_ACTION_HINT_LABELS: Record<
	string,
	{ displayLabel: string; label: string }
> = {
	archive: { displayLabel: "x", label: "x" },
	color: { displayLabel: "c", label: "c" },
	create: { displayLabel: "n", label: "n" },
	"create-folder": { displayLabel: "N", label: "N" },
	delete: { displayLabel: "d", label: "d" },
	menu: { displayLabel: ".", label: "." },
	move: { displayLabel: "m", label: "m" },
	"open-browser": { displayLabel: "o", label: "o" },
	pin: { displayLabel: "p", label: "p" },
	"remove-from-folder": { displayLabel: "F", label: "F" },
	rename: { displayLabel: "e", label: "e" },
	reply: { displayLabel: "r", label: "r" },
	"toggle-browser": { displayLabel: "b", label: "b" },
};

const SIDEBAR_ACTION_HINT_TITLES: Record<string, string> = {
	archive: "Move to overview",
	color: "Color",
	create: "New",
	"create-folder": "New folder",
	delete: "Delete",
	menu: "Actions",
	move: "Move",
	"open-browser": "Open browser",
	pin: "Pin or unpin",
	"remove-from-folder": "Remove from folder",
	rename: "Rename",
	reply: "Reply",
	"toggle-browser": "Native/browser",
};

function closestDashboardActionHintScope(
	element: Element | null,
): HTMLElement | null {
	const scope =
		element?.closest(DASHBOARD_ACTION_HINT_SCOPED_ROOT_SELECTOR) ?? null;
	return isHTMLElement(scope) ? scope : null;
}

function dashboardActionHintScopeFromSelector(
	root: ParentNode,
	selector: string,
): HTMLElement | null {
	const candidate = root.querySelector(selector);
	return closestDashboardActionHintScope(candidate);
}

export function dashboardActionHintSidebarScopeForTargets(
	targets: DashboardActionHintTarget[],
): HTMLElement | null {
	const firstScope = closestDashboardActionHintScope(
		targets[0]?.element ?? null,
	);
	if (!firstScope) return null;
	return targets.every((target) => firstScope.contains(target.element))
		? firstScope
		: null;
}

export function dashboardActionHintDisplayTitle(
	target: DashboardActionHintTarget,
): string {
	const sidebarAction = target.element.getAttribute(
		"data-dashboard-sidebar-action",
	);
	if (sidebarAction && sidebarAction in SIDEBAR_ACTION_HINT_TITLES) {
		return SIDEBAR_ACTION_HINT_TITLES[sidebarAction] ?? target.title;
	}
	if (closestDashboardActionHintScope(target.element)) {
		return target.label === "enter"
			? "Open"
			: (target.title.split("\n")[0] ?? target.title);
	}
	return target.title;
}

function semanticActionHintLabel(
	element: HTMLElement,
): { displayLabel: string; label: string } | null {
	const explicitLabel = element
		.getAttribute("data-dashboard-action-hint-label")
		?.trim();
	if (explicitLabel) {
		const explicitDisplayLabel =
			element
				.getAttribute("data-dashboard-action-hint-display-label")
				?.trim() || explicitLabel;
		return { displayLabel: explicitDisplayLabel, label: explicitLabel };
	}

	const sidebarAction = element.getAttribute("data-dashboard-sidebar-action");
	if (sidebarAction && sidebarAction in SIDEBAR_ACTION_HINT_LABELS) {
		return SIDEBAR_ACTION_HINT_LABELS[sidebarAction];
	}
	if (
		element.matches(
			[
				"[data-dashboard-sidebar-roving-item='true']",
				"[data-dashboard-web-page-trigger]",
				"[data-dashboard-web-app-trigger]",
				"[data-dashboard-web-tab-row-button]",
				"[data-dashboard-quick-terminal-trigger]",
				"[data-dashboard-native-provider-trigger]",
				"[data-native-agent-folder-row-id]",
				"[data-native-agent-session-row-id]",
			].join(","),
		)
	) {
		return { displayLabel: "↵", label: "enter" };
	}
	return null;
}

function nextGenericActionHintLabel(
	usedLabels: Set<string>,
	startIndex: number,
): { genericIndex: number; label: string } | null {
	let genericIndex = startIndex;
	for (
		let attempts = 0;
		attempts < DASHBOARD_ACTION_HINT_KEYS.length ** 2;
		attempts++
	) {
		const label = dashboardActionHintLabelForIndex(genericIndex);
		genericIndex += 1;
		if (!label) return null;
		if (!usedLabels.has(label)) return { genericIndex, label };
	}
	return null;
}

export function collectDashboardActionHintTargets(
	root: ParentNode,
): DashboardActionHintTarget[] {
	const seen = new Set<HTMLElement>();
	const usedLabels = new Set<string>();
	let genericIndex = 0;
	const targets: DashboardActionHintTarget[] = [];

	for (const candidate of root.querySelectorAll(
		DASHBOARD_ACTION_HINT_TARGET_SELECTOR,
	)) {
		if (!isHTMLElement(candidate) || seen.has(candidate)) continue;
		if (!isVisibleTarget(candidate)) continue;
		seen.add(candidate);
		const semanticLabel = semanticActionHintLabel(candidate);
		const resolvedLabel =
			semanticLabel && !usedLabels.has(semanticLabel.label)
				? semanticLabel
				: null;
		const genericLabel = resolvedLabel
			? null
			: nextGenericActionHintLabel(usedLabels, genericIndex);
		if (genericLabel) genericIndex = genericLabel.genericIndex;
		const label = resolvedLabel?.label ?? genericLabel?.label ?? "";
		const displayLabel = resolvedLabel?.displayLabel ?? label;
		if (!label) break;
		usedLabels.add(label);
		const rect = candidate.getBoundingClientRect();
		targets.push({
			displayLabel,
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

export function openDashboardActionHints(): boolean {
	if (typeof window === "undefined") return false;
	window.dispatchEvent(new Event(DASHBOARD_ACTION_HINTS_OPEN_EVENT));
	return true;
}
