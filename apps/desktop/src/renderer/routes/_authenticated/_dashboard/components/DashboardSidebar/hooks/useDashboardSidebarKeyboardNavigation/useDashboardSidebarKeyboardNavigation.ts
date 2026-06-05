import { type RefObject, useEffect, useRef } from "react";
import { dashboardFocusScopeForElement } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-focus-scope";
import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import {
	DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
	type DashboardSidebarKeyboardCommand,
	type DashboardSidebarKeyboardCommandDetail,
	dashboardSidebarKeyboardActionFromCommand,
	dashboardSidebarKeyboardFallbackCommands,
	isDashboardSidebarKeyboardCommand,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-keyboard-command";
import { scrollDashboardSidebarItemIntoView } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-scroll";
import { useDashboardVimModeStore } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import {
	type DashboardSidebarKeyboardAction,
	dashboardSidebarActivationActionFromKey,
	dashboardSidebarExpansionIntentFromKey,
	dashboardSidebarKeyboardActionFromKey,
	dashboardSidebarKeyboardActionSelector,
	dashboardSidebarLocalCommandFromKey,
	dashboardSidebarLocalKeyAllowsModifiers,
	dashboardSidebarNextRovingIndex,
	dashboardSidebarRovingNavigationAllowedFromKey,
	dashboardSidebarRovingNavigationBoundaryFromKey,
	dashboardSidebarRovingNavigationDeltaFromKey,
	dashboardSidebarTypeaheadQueryFromSeed,
	dashboardSidebarTypeaheadSeedFromKey,
	dashboardSidebarVimJumpFromKey,
	isDashboardSidebarSpaceKey,
} from "./dashboard-sidebar-keyboard-actions";
import {
	DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE,
	markDashboardSidebarKeyboardFocus,
} from "./dashboard-sidebar-keyboard-focus";

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

function normalizeTypeaheadText(value: string): string {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function typeaheadTextForItem(item: HTMLElement): string {
	const explicitLabel = item.getAttribute(
		"data-dashboard-sidebar-typeahead-label",
	);
	if (explicitLabel?.trim()) {
		return normalizeTypeaheadText(explicitLabel);
	}

	return normalizeTypeaheadText(
		[
			item.getAttribute("aria-label"),
			item.getAttribute("title"),
			item.textContent,
		]
			.filter((value): value is string => value != null && value.trim() !== "")
			.join(" "),
	);
}

function itemMatchesTypeahead(item: HTMLElement, query: string): boolean {
	const normalizedQuery = normalizeTypeaheadText(query);
	if (!normalizedQuery) return false;
	const itemText = typeaheadTextForItem(item);
	if (!itemText) return false;
	return (
		itemText.startsWith(normalizedQuery) ||
		itemText.includes(` ${normalizedQuery}`) ||
		itemText.includes(normalizedQuery)
	);
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

export function findDashboardSidebarTypeaheadMatch(input: {
	activeIndex: number;
	items: HTMLElement[];
	query: string;
}): HTMLElement | null {
	if (input.items.length === 0) return null;
	if (
		input.query.length > 1 &&
		input.activeIndex >= 0 &&
		itemMatchesTypeahead(input.items[input.activeIndex], input.query)
	) {
		return input.items[input.activeIndex];
	}

	const startIndex = input.activeIndex >= 0 ? input.activeIndex + 1 : 0;
	for (let offset = 0; offset < input.items.length; offset++) {
		const index = (startIndex + offset) % input.items.length;
		const item = input.items[index];
		if (itemMatchesTypeahead(item, input.query)) return item;
	}
	return null;
}

export function focusDashboardSidebarItem(item: HTMLElement): void {
	markDashboardSidebarKeyboardFocus(item);
	item.focus({ preventScroll: true });
	scrollDashboardSidebarItemIntoView(item);
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

export function dashboardSidebarKeyboardFocusIndex(input: {
	activeElement: Element | null;
	focusInsideSidebar: boolean;
	items: HTMLElement[];
	root: HTMLElement;
}): number {
	if (input.focusInsideSidebar && isHTMLElement(input.activeElement)) {
		const focusedIndex = input.items.indexOf(input.activeElement);
		if (focusedIndex >= 0) return focusedIndex;
	}

	const preservedItem = input.root.querySelector<HTMLElement>(
		`[${DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE}="true"]`,
	);
	if (!preservedItem) return -1;
	const preservedIndex = input.items.indexOf(preservedItem);
	if (preservedIndex >= 0) return preservedIndex;
	preservedItem.removeAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE);
	return -1;
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

function dashboardSidebarKeyboardActionFallbacks(
	action: Exclude<DashboardSidebarKeyboardAction, "none">,
): Array<Exclude<DashboardSidebarKeyboardAction, "none">> {
	return dashboardSidebarKeyboardFallbackCommands(
		`action-${action}` as DashboardSidebarKeyboardCommand,
	)
		.map(dashboardSidebarKeyboardActionFromCommand)
		.filter(
			(fallback): fallback is Exclude<DashboardSidebarKeyboardAction, "none"> =>
				fallback !== null,
		);
}

export function clickDashboardSidebarActionButton(
	activeItem: HTMLElement,
	action: Exclude<DashboardSidebarKeyboardAction, "none">,
): boolean {
	for (const candidate of [
		action,
		...dashboardSidebarKeyboardActionFallbacks(action),
	]) {
		const actionButton = findDashboardSidebarActionButton(
			activeItem,
			candidate,
		);
		if (!actionButton || actionButton.disabled) continue;
		actionButton.click();
		return true;
	}
	return false;
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
): HTMLElement | null {
	if (isDashboardSidebarSpaceKey(key)) {
		return findDashboardSidebarExpansionTarget(activeItem);
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

export function runDashboardSidebarKeyboardCommand(input: {
	activeElement?: Element | null;
	command: DashboardSidebarKeyboardCommand;
	root: HTMLElement;
}): boolean {
	const items = getDashboardSidebarFocusableItems(input.root);
	if (items.length === 0) return false;

	const activeElement =
		input.activeElement ??
		(typeof document === "undefined" ? null : document.activeElement);
	const focusInsideSidebar =
		isHTMLElement(activeElement) && input.root.contains(activeElement);
	const activeIndex = dashboardSidebarKeyboardFocusIndex({
		activeElement: isHTMLElement(activeElement) ? activeElement : null,
		focusInsideSidebar,
		items,
		root: input.root,
	});

	const focusIndex = (index: number): boolean => {
		const item = items[index];
		if (!item) return false;
		focusDashboardSidebarItem(item);
		return true;
	};

	if (input.command === "focus-first") return focusIndex(0);
	if (input.command === "focus-last") return focusIndex(items.length - 1);
	if (input.command === "focus-next" || input.command === "focus-previous") {
		return focusIndex(
			dashboardSidebarNextRovingIndex({
				activeIndex,
				delta: input.command === "focus-next" ? 1 : -1,
				itemCount: items.length,
			}),
		);
	}

	if (activeIndex < 0) return focusIndex(0);

	const activeItem = items[activeIndex];
	const sidebarAction = dashboardSidebarKeyboardActionFromCommand(
		input.command,
	);
	if (sidebarAction) {
		return clickDashboardSidebarActionButton(activeItem, sidebarAction);
	}

	if (input.command === "activate") {
		const activationTarget = findDashboardSidebarActivationTarget(
			activeItem,
			"Enter",
		);
		if (!activationTarget) return false;
		activationTarget.click();
		return true;
	}

	if (input.command === "toggle-expansion") {
		const activationTarget = findDashboardSidebarActivationTarget(
			activeItem,
			" ",
		);
		if (!activationTarget) return false;
		activationTarget.click();
		return true;
	}

	const expansionTarget = findDashboardSidebarExpansionTarget(activeItem);
	if (!expansionTarget) return false;
	const expanded = dashboardSidebarExpansionValue(expansionTarget);
	const key = input.command === "collapse" ? "h" : "l";
	if (!shouldToggleDashboardSidebarExpansion({ expanded, key })) return false;
	expansionTarget.click();
	return true;
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
	const typeaheadRef = useRef({ lastAt: 0, query: "" });

	useEffect(() => {
		const onSidebarKeyboardCommand = (event: Event) => {
			const root = rootRef.current;
			if (!root) return;
			const command = (
				event as CustomEvent<DashboardSidebarKeyboardCommandDetail>
			).detail?.command;
			if (!isDashboardSidebarKeyboardCommand(command)) return;
			if (runDashboardSidebarKeyboardCommand({ command, root })) {
				event.preventDefault();
			}
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			const root = rootRef.current;
			if (!root) return;
			if (isEditableTarget(event.target)) return;

			const activeElement = document.activeElement;
			const focusInsideSidebar =
				isHTMLElement(activeElement) && root.contains(activeElement);
			const eventElement =
				typeof Element !== "undefined" && event.target instanceof Element
					? event.target
					: null;
			const focusScope = dashboardFocusScopeForElement(eventElement);
			const localSidebarKey = dashboardSidebarLocalKeyAllowsModifiers({
				altKey: event.altKey,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
			});
			const rovingNavigationAllowed =
				localSidebarKey &&
				dashboardSidebarRovingNavigationAllowedFromKey({
					focusInsideSidebar,
					focusScopeId: focusScope.id,
					key: event.key,
					vimModeEnabled,
				});
			const rovingNavigationDelta = rovingNavigationAllowed
				? dashboardSidebarRovingNavigationDeltaFromKey(event.key)
				: 0;
			const rovingNavigation = rovingNavigationDelta !== 0;
			const rovingBoundary = rovingNavigationAllowed
				? dashboardSidebarRovingNavigationBoundaryFromKey(event.key)
				: null;
			const expansionIntent =
				localSidebarKey && (focusInsideSidebar || vimModeEnabled)
					? dashboardSidebarExpansionIntentFromKey(event.key)
					: "none";
			const activationAction = localSidebarKey
				? dashboardSidebarActivationActionFromKey(event.key)
				: "none";
			const activationKey = focusInsideSidebar && activationAction !== "none";
			const sidebarAction = localSidebarKey
				? dashboardSidebarKeyboardActionFromKey(event.key)
				: "none";
			const sidebarActionKey =
				(focusInsideSidebar || vimModeEnabled) && sidebarAction !== "none";
			const localCommand =
				localSidebarKey && (focusInsideSidebar || vimModeEnabled)
					? dashboardSidebarLocalCommandFromKey(event.key)
					: "none";
			const typeaheadSeed = dashboardSidebarTypeaheadSeedFromKey({
				altKey: event.altKey,
				allowFromAppShell: focusScope.id === "app",
				ctrlKey: event.ctrlKey,
				focusInsideSidebar,
				key: event.key,
				metaKey: event.metaKey,
				vimModeEnabled,
			});
			const vimNavigation =
				localSidebarKey &&
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
				expansionIntent === "none" &&
				!vimNavigation &&
				!activationKey &&
				!sidebarActionKey &&
				localCommand === "none" &&
				!typeaheadSeed
			) {
				return;
			}
			if (!vimModeEnabled && !focusInsideSidebar && focusScope.id !== "app") {
				return;
			}

			if (localCommand === "focus-search") {
				event.preventDefault();
				options.searchInputRef?.current?.focus();
				options.searchInputRef?.current?.select();
				return;
			}

			if (localCommand === "show-help") {
				event.preventDefault();
				openDashboardKeyboardHelp();
				return;
			}

			const items = getDashboardSidebarFocusableItems(root);
			if (items.length === 0) return;

			const activeIndex = dashboardSidebarKeyboardFocusIndex({
				activeElement: isHTMLElement(activeElement) ? activeElement : null,
				focusInsideSidebar,
				items,
				root,
			});

			if (typeaheadSeed) {
				event.preventDefault();
				const now = Date.now();
				const query = dashboardSidebarTypeaheadQueryFromSeed({
					currentQuery: typeaheadRef.current.query,
					lastAt: typeaheadRef.current.lastAt,
					now,
					seed: typeaheadSeed,
				});
				typeaheadRef.current = { lastAt: now, query };
				const match = findDashboardSidebarTypeaheadMatch({
					activeIndex,
					items,
					query,
				});
				if (match) {
					focusDashboardSidebarItem(match);
					return;
				}

				options.onTypeaheadSearch?.(query);
				window.setTimeout(() => {
					options.searchInputRef?.current?.focus();
					options.searchInputRef?.current?.setSelectionRange(
						query.length,
						query.length,
					);
				}, 0);
				return;
			}

			const focusByDelta = (delta: number) => {
				const nextIndex = dashboardSidebarNextRovingIndex({
					activeIndex,
					delta: delta > 0 ? 1 : -1,
					itemCount: items.length,
				});
				if (nextIndex < 0) return;
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
						items[activeIndex],
						event.key,
					);
					activationTarget?.click();
					return;
				}
				if (focusInsideSidebar && isHTMLElement(activeElement)) {
					const activationTarget = findDashboardSidebarActivationTarget(
						activeElement,
						event.key,
					);
					activationTarget?.click();
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
				if (clickDashboardSidebarActionButton(activeItem, sidebarAction)) {
					return;
				}
				if (sidebarAction === "create") {
					options.onCreateWorkspace?.();
				}
				return;
			}

			if (expansionIntent !== "none") {
				event.preventDefault();
				if (activeIndex < 0) {
					focusDashboardSidebarItem(items[0]);
					return;
				}

				const activeItem = items[activeIndex];
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
					expansionTarget?.click();
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
				findDashboardSidebarActivationTarget(activeItem, event.key)?.click();
				return;
			}
		};

		window.addEventListener(
			DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
			onSidebarKeyboardCommand,
		);
		document.addEventListener("keydown", onKeyDown, true);
		return () => {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
				onSidebarKeyboardCommand,
			);
			document.removeEventListener("keydown", onKeyDown, true);
		};
	}, [
		options.onClearSearch,
		options.onCreateWorkspace,
		options.onTypeaheadSearch,
		options.searchInputRef,
		rootRef,
		vimModeEnabled,
	]);
}
