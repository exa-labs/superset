import { type RefObject, useEffect, useRef } from "react";
import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import { useDashboardVimModeStore } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import {
	type DashboardSidebarKeyboardAction,
	dashboardSidebarActivationActionFromKey,
	dashboardSidebarKeyboardActionFromKey,
	dashboardSidebarKeyboardActionSelector,
	dashboardSidebarRovingNavigationBoundaryFromKey,
	dashboardSidebarRovingNavigationDeltaFromKey,
	dashboardSidebarTypeaheadSeedFromKey,
	dashboardSidebarVimJumpFromKey,
	isDashboardSidebarSpaceKey,
} from "./dashboard-sidebar-keyboard-actions";
import { markDashboardSidebarKeyboardFocus } from "./dashboard-sidebar-keyboard-focus";

export {
	DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE,
	markDashboardSidebarKeyboardFocus,
} from "./dashboard-sidebar-keyboard-focus";

const INTERACTIVE_SELECTOR = [
	"button:not([disabled])",
	"a[href]",
	"[role='button']:not([aria-disabled='true'])",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

const PRIMARY_ROVING_SELECTOR = [
	'[data-dashboard-sidebar-roving-item="true"]',
	"[data-dashboard-web-page-trigger]",
	"[data-dashboard-web-app-trigger]",
	"[data-dashboard-web-tab-row-button]",
	"[data-dashboard-quick-terminal-trigger]",
	"[data-dashboard-native-provider-trigger]",
	"[data-native-agent-folder-row-id]",
	"[data-native-agent-session-row-id]",
].join(",");

const SIDEBAR_ROVING_SELECTOR = [
	PRIMARY_ROVING_SELECTOR,
	INTERACTIVE_SELECTOR,
].join(",");

function isHTMLElement(value: Element | null): value is HTMLElement {
	return value instanceof HTMLElement;
}

function isEditableTarget(target: EventTarget | null): boolean {
	if (!isHTMLElement(target as Element | null)) return false;
	const element = target as HTMLElement;
	if (element.isContentEditable) return true;
	return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function isVisible(element: HTMLElement): boolean {
	if (element.getAttribute("aria-hidden") === "true") return false;
	const rect = element.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
}

function collectFocusableItems(
	root: HTMLElement,
	selector: string,
): HTMLElement[] {
	const seen = new Set<HTMLElement>();
	const items: HTMLElement[] = [];
	for (const element of root.querySelectorAll(selector)) {
		if (
			!isHTMLElement(element) ||
			seen.has(element) ||
			element.tabIndex < 0 ||
			!isVisible(element)
		) {
			continue;
		}
		seen.add(element);
		items.push(element);
	}
	return items;
}

function isAuxiliarySidebarAction(element: HTMLElement): boolean {
	if (element.matches(PRIMARY_ROVING_SELECTOR)) return false;
	if (element.matches("[data-dashboard-sidebar-action]")) return true;
	const scope = element.closest<HTMLElement>(
		"[data-dashboard-sidebar-action-scope]",
	);
	return scope != null && scope !== element;
}

export function getDashboardSidebarFocusableItems(
	root: HTMLElement,
): HTMLElement[] {
	return collectFocusableItems(root, SIDEBAR_ROVING_SELECTOR).filter(
		(element) => !isAuxiliarySidebarAction(element),
	);
}

export function focusDashboardSidebarItem(item: HTMLElement): void {
	markDashboardSidebarKeyboardFocus(item);
	item.focus({ preventScroll: true });
	item.scrollIntoView({ block: "nearest" });
}

export function focusFirstDashboardSidebarItem(
	root: HTMLElement | null,
): HTMLElement | null {
	if (!root) return null;
	const firstItem = getDashboardSidebarFocusableItems(root)[0] ?? null;
	if (!firstItem) return null;
	focusDashboardSidebarItem(firstItem);
	return firstItem;
}

export function findDashboardSidebarActionButton(
	activeItem: HTMLElement,
	action: Exclude<DashboardSidebarKeyboardAction, "none">,
): HTMLButtonElement | null {
	const scope =
		activeItem.closest<HTMLElement>("[data-dashboard-sidebar-action-scope]") ??
		activeItem;
	const selector = dashboardSidebarKeyboardActionSelector(action);
	if (scope.matches(selector) && scope instanceof HTMLButtonElement) {
		return scope;
	}
	const scopedAction = scope.querySelector<HTMLButtonElement>(selector);
	if (scopedAction) return scopedAction;
	return null;
}

export function findDashboardSidebarExpansionTarget(
	activeItem: HTMLElement,
): HTMLElement | null {
	if (dashboardSidebarExpansionValue(activeItem) !== null) return activeItem;
	const scope = activeItem.closest<HTMLElement>(
		"[data-dashboard-sidebar-action-scope]",
	);
	if (!scope) return null;
	const scopedToggle = scope.querySelector<HTMLElement>(
		"[aria-expanded], [data-dashboard-sidebar-expanded]",
	);
	if (!scopedToggle || !isVisible(scopedToggle)) return null;
	return scopedToggle;
}

export function findDashboardSidebarActivationTarget(
	activeItem: HTMLElement,
	key: string,
): HTMLElement {
	if (isDashboardSidebarSpaceKey(key)) {
		return findDashboardSidebarExpansionTarget(activeItem) ?? activeItem;
	}
	return activeItem;
}

export function dashboardSidebarExpansionValue(
	element: HTMLElement,
): string | null {
	return (
		element.getAttribute("aria-expanded") ??
		element.getAttribute("data-dashboard-sidebar-expanded")
	);
}

export function shouldToggleDashboardSidebarExpansion(input: {
	expanded: string | null;
	key: string;
}): boolean {
	if (input.key === "h") return input.expanded === "true";
	if (input.key === "l") return input.expanded === "false";
	return false;
}

export function useDashboardSidebarKeyboardNavigation(
	rootRef: React.RefObject<HTMLElement | null>,
	options: {
		onClearSearch?: () => void;
		onCreateWorkspace?: () => void;
		onTypeaheadSearch?: (seed: string) => void;
		searchInputRef?: RefObject<HTMLInputElement | null>;
	} = {},
): void {
	const vimModeEnabled = useDashboardVimModeStore((state) => state.enabled);
	const lastGRef = useRef(0);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			const root = rootRef.current;
			if (!root) return;
			if (isEditableTarget(event.target)) return;

			const activeElement = document.activeElement;
			const focusInsideSidebar =
				isHTMLElement(activeElement) && root.contains(activeElement);
			const rovingNavigationDelta =
				focusInsideSidebar || vimModeEnabled
					? dashboardSidebarRovingNavigationDeltaFromKey(event.key)
					: 0;
			const rovingNavigation = rovingNavigationDelta !== 0;
			const rovingBoundary =
				focusInsideSidebar || vimModeEnabled
					? dashboardSidebarRovingNavigationBoundaryFromKey(event.key)
					: null;
			const activationAction = dashboardSidebarActivationActionFromKey(
				event.key,
			);
			const activationKey = focusInsideSidebar && activationAction !== "none";
			const sidebarAction = dashboardSidebarKeyboardActionFromKey(event.key);
			const sidebarActionKey = focusInsideSidebar && sidebarAction !== "none";
			const typeaheadSeed = dashboardSidebarTypeaheadSeedFromKey({
				altKey: event.altKey,
				ctrlKey: event.ctrlKey,
				focusInsideSidebar,
				key: event.key,
				metaKey: event.metaKey,
				vimModeEnabled,
			});
			const vimNavigation =
				vimModeEnabled &&
				[
					"j",
					"k",
					"h",
					"l",
					"Home",
					"End",
					"g",
					"G",
					"/",
					"?",
					"Enter",
					" ",
					"Escape",
				].includes(event.key);

			if (
				!rovingNavigation &&
				!rovingBoundary &&
				!vimNavigation &&
				!activationKey &&
				!sidebarActionKey &&
				!typeaheadSeed
			) {
				return;
			}
			if (!vimModeEnabled && !focusInsideSidebar) return;

			if (typeaheadSeed) {
				event.preventDefault();
				options.onTypeaheadSearch?.(typeaheadSeed);
				window.setTimeout(() => {
					options.searchInputRef?.current?.focus();
					options.searchInputRef?.current?.setSelectionRange(
						typeaheadSeed.length,
						typeaheadSeed.length,
					);
				}, 0);
				return;
			}

			const items = getDashboardSidebarFocusableItems(root);
			if (items.length === 0) return;

			const activeIndex = focusInsideSidebar
				? items.indexOf(activeElement as HTMLElement)
				: -1;
			const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

			const focusByDelta = (delta: number) => {
				const nextIndex =
					(safeActiveIndex + delta + items.length) % items.length;
				focusDashboardSidebarItem(items[nextIndex]);
			};

			if (rovingNavigationDelta !== 0) {
				event.preventDefault();
				focusByDelta(rovingNavigationDelta);
				return;
			}

			if (rovingBoundary) {
				event.preventDefault();
				focusDashboardSidebarItem(
					rovingBoundary === "first" ? items[0] : items[items.length - 1],
				);
				return;
			}

			if (activationKey) {
				event.preventDefault();
				if (activeIndex >= 0) {
					const activationTarget = findDashboardSidebarActivationTarget(
						activeElement as HTMLElement,
						event.key,
					);
					activationTarget.click();
					return;
				}
				if (focusInsideSidebar && isHTMLElement(activeElement)) {
					const activationTarget = findDashboardSidebarActivationTarget(
						activeElement,
						event.key,
					);
					activationTarget.click();
					return;
				}
				focusDashboardSidebarItem(items[0]);
				return;
			}

			if (sidebarAction !== "none") {
				event.preventDefault();
				if (activeIndex < 0) {
					if (sidebarAction === "create") {
						options.onCreateWorkspace?.();
						return;
					}
					focusDashboardSidebarItem(items[0]);
					return;
				}

				const activeItem = items[activeIndex];
				const actionButton = findDashboardSidebarActionButton(
					activeItem,
					sidebarAction,
				);
				if (actionButton && !actionButton.disabled) {
					actionButton.click();
					return;
				}
				if (sidebarAction === "create") {
					options.onCreateWorkspace?.();
				}
				return;
			}

			if (!vimModeEnabled) return;

			if (event.key === "Escape") {
				event.preventDefault();
				options.onClearSearch?.();
				focusDashboardSidebarItem(items[Math.max(0, activeIndex)]);
				return;
			}

			if (event.key === "/") {
				event.preventDefault();
				options.searchInputRef?.current?.focus();
				options.searchInputRef?.current?.select();
				return;
			}

			if (event.key === "?") {
				event.preventDefault();
				openDashboardKeyboardHelp();
				return;
			}

			const vimJump = dashboardSidebarVimJumpFromKey({
				key: event.key,
				lastGAt: lastGRef.current,
				now: Date.now(),
			});
			if (vimJump.handled) {
				event.preventDefault();
				lastGRef.current = vimJump.nextLastGAt;
				if (vimJump.action === "first") {
					focusDashboardSidebarItem(items[0]);
					return;
				}
				if (vimJump.action === "last") {
					focusDashboardSidebarItem(items[items.length - 1]);
					return;
				}
				return;
			}

			if (activeIndex < 0) {
				event.preventDefault();
				focusDashboardSidebarItem(items[0]);
				return;
			}

			const activeItem = items[activeIndex];

			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				findDashboardSidebarActivationTarget(activeItem, event.key).click();
				return;
			}

			if (event.key === "h" || event.key === "l") {
				const expansionTarget = findDashboardSidebarExpansionTarget(activeItem);
				const expanded = expansionTarget
					? dashboardSidebarExpansionValue(expansionTarget)
					: null;
				if (
					shouldToggleDashboardSidebarExpansion({
						expanded,
						key: event.key,
					})
				) {
					event.preventDefault();
					expansionTarget?.click();
				}
			}
		};

		document.addEventListener("keydown", onKeyDown, true);
		return () => document.removeEventListener("keydown", onKeyDown, true);
	}, [
		options.onClearSearch,
		options.onCreateWorkspace,
		options.onTypeaheadSearch,
		options.searchInputRef,
		rootRef,
		vimModeEnabled,
	]);
}
