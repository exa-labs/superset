import { type RefObject, useEffect, useRef } from "react";
import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import { useDashboardVimModeStore } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";

const INTERACTIVE_SELECTOR = [
	"button:not([disabled])",
	"a[href]",
	"[role='button']:not([aria-disabled='true'])",
	"[tabindex]:not([tabindex='-1'])",
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

function getFocusableItems(root: HTMLElement): HTMLElement[] {
	const seen = new Set<HTMLElement>();
	const items: HTMLElement[] = [];
	for (const element of root.querySelectorAll(INTERACTIVE_SELECTOR)) {
		if (!isHTMLElement(element) || seen.has(element) || !isVisible(element)) {
			continue;
		}
		seen.add(element);
		items.push(element);
	}
	return items;
}

function focusItem(item: HTMLElement): void {
	item.focus({ preventScroll: true });
	item.scrollIntoView({ block: "nearest" });
}

export function useDashboardSidebarKeyboardNavigation(
	rootRef: React.RefObject<HTMLElement | null>,
	options: {
		onClearSearch?: () => void;
		searchInputRef?: RefObject<HTMLInputElement | null>;
	} = {},
): void {
	const vimModeEnabled = useDashboardVimModeStore((state) => state.enabled);
	const lastGRef = useRef(0);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const root = rootRef.current;
			if (!root) return;
			if (isEditableTarget(event.target)) return;

			const activeElement = document.activeElement;
			const focusInsideSidebar =
				isHTMLElement(activeElement) && root.contains(activeElement);
			const arrowNavigation =
				event.key === "ArrowUp" || event.key === "ArrowDown";
			const vimNavigation =
				vimModeEnabled &&
				[
					"j",
					"k",
					"h",
					"l",
					"g",
					"G",
					"/",
					"?",
					"Enter",
					" ",
					"Escape",
				].includes(event.key);

			if (!arrowNavigation && !vimNavigation) return;
			if (!vimModeEnabled && !focusInsideSidebar) return;

			const items = getFocusableItems(root);
			if (items.length === 0) return;

			const activeIndex = focusInsideSidebar
				? items.indexOf(activeElement as HTMLElement)
				: -1;
			const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

			const focusByDelta = (delta: number) => {
				const nextIndex =
					(safeActiveIndex + delta + items.length) % items.length;
				focusItem(items[nextIndex]);
			};

			if (event.key === "ArrowDown" || event.key === "j") {
				event.preventDefault();
				focusByDelta(1);
				return;
			}

			if (event.key === "ArrowUp" || event.key === "k") {
				event.preventDefault();
				focusByDelta(-1);
				return;
			}

			if (!vimModeEnabled) return;

			if (event.key === "Escape") {
				event.preventDefault();
				options.onClearSearch?.();
				focusItem(items[Math.max(0, activeIndex)]);
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

			if (event.key === "G") {
				event.preventDefault();
				focusItem(items[items.length - 1]);
				return;
			}

			if (event.key === "g") {
				event.preventDefault();
				const now = Date.now();
				if (now - lastGRef.current < 450) {
					focusItem(items[0]);
					lastGRef.current = 0;
					return;
				}
				lastGRef.current = now;
				return;
			}

			if (activeIndex < 0) {
				event.preventDefault();
				focusItem(items[0]);
				return;
			}

			const activeItem = items[activeIndex];

			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				activeItem.click();
				return;
			}

			if (event.key === "h" || event.key === "l") {
				const expanded = activeItem.getAttribute("aria-expanded");
				if (expanded === null) return;
				const shouldClick =
					(event.key === "h" && expanded === "true") ||
					(event.key === "l" && expanded === "false");
				if (shouldClick) {
					event.preventDefault();
					activeItem.click();
				}
			}
		};

		document.addEventListener("keydown", onKeyDown, true);
		return () => document.removeEventListener("keydown", onKeyDown, true);
	}, [options.onClearSearch, options.searchInputRef, rootRef, vimModeEnabled]);
}
