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
	| "focus-composer"
	| "move-to-folder"
	| "none"
	| "open"
	| "open-browser"
	| "pin"
	| "rename"
	| "remove-from-folder"
	| "toggle-browser";

export type NativeAgentFolderVimAction =
	| "collapse"
	| "color"
	| "delete"
	| "expand"
	| "move-active"
	| "none"
	| "rename"
	| "toggle";

export type NativeAgentViewMode = "browser" | "native" | "split";
export type NativeAgentSidebarJumpAction = "bottom" | "none" | "top";
export type NativeAgentCreateVimAction =
	| "create-folder"
	| "create-session"
	| "none";
export type NativeAgentUnreadVimAction =
	| "mark-latest-read"
	| "none"
	| "open-unread";
export type NativeAgentSplitPaneAction =
	| "equalize"
	| "narrow-native"
	| "none"
	| "widen-native";

export type NativeAgentSelectedSessionVimAction =
	| "archive"
	| "focus-composer"
	| "move-to-folder"
	| "none"
	| "open-browser"
	| "pin"
	| "refresh"
	| "rename"
	| "remove-from-folder";

export function nativeAgentSidebarVimActionFromKey(
	key: string | null,
): NativeAgentSidebarVimAction {
	if (key === "enter" || key === " ") return "open";
	if (key === "r") return "focus-composer";
	if (key === "o") return "open-browser";
	if (key === "b") return "toggle-browser";
	if (key === "p") return "pin";
	if (key === "e") return "rename";
	if (key === "m") return "move-to-folder";
	if (key === "F") return "remove-from-folder";
	if (key === "a" || key === "x") return "archive";
	return "none";
}

export function nativeAgentFolderVimActionFromKey(
	key: string | null,
): NativeAgentFolderVimAction {
	if (key === "enter" || key === " " || key === "o") return "toggle";
	if (key === "h") return "collapse";
	if (key === "l") return "expand";
	if (key === "m") return "move-active";
	if (key === "e") return "rename";
	if (key === "c") return "color";
	if (key === "d") return "delete";
	return "none";
}

export function nativeAgentSidebarJumpFromKey(input: {
	key: string | null;
	lastGAt: number;
	now: number;
	thresholdMs?: number;
}): {
	action: NativeAgentSidebarJumpAction;
	handled: boolean;
	nextLastGAt: number;
} {
	if (input.key === "G") {
		return { action: "bottom", handled: true, nextLastGAt: 0 };
	}
	if (input.key !== "g") {
		return {
			action: "none",
			handled: false,
			nextLastGAt: input.lastGAt,
		};
	}
	const thresholdMs = input.thresholdMs ?? 450;
	if (input.now - input.lastGAt < thresholdMs) {
		return { action: "top", handled: true, nextLastGAt: 0 };
	}
	return { action: "none", handled: true, nextLastGAt: input.now };
}

export function nativeAgentUnreadVimActionFromKey(
	key: string | null,
): NativeAgentUnreadVimAction {
	if (key === "u") return "open-unread";
	if (key === "U") return "mark-latest-read";
	return "none";
}

export function nativeAgentCreateVimActionFromKey(
	key: string | null,
): NativeAgentCreateVimAction {
	if (key === "n") return "create-session";
	if (key === "N") return "create-folder";
	return "none";
}

export function nativeAgentSidebarNavigationDeltaFromKey(input: {
	eventKey: string;
	vimKey: string | null;
}): -1 | 0 | 1 {
	if (input.eventKey === "ArrowDown" || input.vimKey === "j") return 1;
	if (input.eventKey === "ArrowUp" || input.vimKey === "k") return -1;
	return 0;
}

export function nativeAgentSelectedSessionVimActionFromKey(
	key: string | null,
): NativeAgentSelectedSessionVimAction {
	if (key === "r") return "focus-composer";
	if (key === "R") return "refresh";
	if (key === "o") return "open-browser";
	if (key === "p") return "pin";
	if (key === "e") return "rename";
	if (key === "m") return "move-to-folder";
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

export function nativeAgentSplitPaneActionFromKey(
	key: string | null,
): NativeAgentSplitPaneAction {
	if (key === "[") return "narrow-native";
	if (key === "]") return "widen-native";
	if (key === "=") return "equalize";
	return "none";
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
