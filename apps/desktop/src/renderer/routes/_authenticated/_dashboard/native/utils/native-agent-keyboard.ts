import { isDashboardVimEditableTarget } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";

export interface NativeAgentSearchEscapeResult {
	shouldBlur: boolean;
	nextSearch: string;
}

export function nativeAgentSearchEscapeResult(
	search: string,
): NativeAgentSearchEscapeResult {
	if (search.length > 0) {
		return { nextSearch: "", shouldBlur: false };
	}
	return { nextSearch: search, shouldBlur: true };
}

export type NativeAgentSidebarVimAction =
	| "archive"
	| "move-to-folder"
	| "none"
	| "open"
	| "pin"
	| "remove-from-folder";

export type NativeAgentViewMode = "browser" | "native" | "split";

export type NativeAgentSelectedSessionVimAction =
	| "archive"
	| "focus-composer"
	| "move-to-folder"
	| "none"
	| "open-browser"
	| "refresh"
	| "rename"
	| "remove-from-folder";

export function nativeAgentSidebarVimActionFromKey(
	key: string | null,
): NativeAgentSidebarVimAction {
	if (key === "enter" || key === "o") return "open";
	if (key === "p") return "pin";
	if (key === "f" || key === "m") return "move-to-folder";
	if (key === "F") return "remove-from-folder";
	if (key === "a" || key === "x") return "archive";
	return "none";
}

export function nativeAgentSelectedSessionVimActionFromKey(
	key: string | null,
): NativeAgentSelectedSessionVimAction {
	if (key === "r") return "focus-composer";
	if (key === "R") return "refresh";
	if (key === "o") return "open-browser";
	if (key === "e") return "rename";
	if (key === "f" || key === "m") return "move-to-folder";
	if (key === "F") return "remove-from-folder";
	if (key === "a" || key === "x") return "archive";
	return "none";
}

export function nextNativeAgentKeyboardViewMode(input: {
	currentMode: NativeAgentViewMode;
	hasBrowserUrl: boolean;
	key: string;
}): NativeAgentViewMode | null {
	if (!input.hasBrowserUrl) return null;
	if (input.key === "b") {
		return input.currentMode === "native" ? "browser" : "native";
	}
	if (input.key === "s") {
		return input.currentMode === "split" ? "native" : "split";
	}
	return null;
}

export function nativeAgentPlainNavigationKey(
	event: KeyboardEvent,
): string | null {
	if (event.defaultPrevented) return null;
	if (event.altKey || event.ctrlKey || event.metaKey) return null;
	if (event.isComposing || event.keyCode === 229) return null;
	if (isDashboardVimEditableTarget(event.target)) return null;
	const activeElement =
		typeof document === "undefined" ? null : document.activeElement;
	if (
		typeof HTMLElement !== "undefined" &&
		((event.target instanceof HTMLElement &&
			event.target.closest(
				"[data-native-agent-session-row-id], [data-native-agent-folder-row-id]",
			)) ||
			(activeElement instanceof HTMLElement &&
				activeElement.closest(
					"[data-native-agent-session-row-id], [data-native-agent-folder-row-id]",
				)))
	) {
		return null;
	}
	if (event.key === "ArrowDown") return "j";
	if (event.key === "ArrowUp") return "k";
	if (event.key === "ArrowLeft") return "h";
	if (event.key === "ArrowRight") return "l";
	if (event.key === "Escape") return "escape";
	if (event.key === "Enter") return "enter";
	return null;
}

export function nativeAgentChatScrollDeltaFromKey(
	key: string,
	viewportHeight: number,
): number {
	const lineStep = 96;
	const pageStep = Math.max(lineStep, Math.round(viewportHeight * 0.8));
	if (key === "j") return lineStep;
	if (key === "k") return -lineStep;
	if (key === "J") return pageStep;
	if (key === "K") return -pageStep;
	return 0;
}

export function nativeAgentOverviewFocusDeltaFromKey(
	key: string,
	columnCount: number,
): number {
	const columns = Math.max(1, Math.floor(columnCount));
	if (key === "j") return columns;
	if (key === "k") return -columns;
	if (key === "l") return 1;
	if (key === "h") return -1;
	return 0;
}

export function nextNativeAgentOverviewFocusIndex(input: {
	columnCount: number;
	currentIndex: number;
	itemCount: number;
	key: string;
}): number | null {
	if (input.itemCount <= 0) return null;
	const delta = nativeAgentOverviewFocusDeltaFromKey(
		input.key,
		input.columnCount,
	);
	if (delta === 0) return null;
	const currentIndex = input.currentIndex < 0 ? -delta : input.currentIndex;
	return Math.max(0, Math.min(input.itemCount - 1, currentIndex + delta));
}
