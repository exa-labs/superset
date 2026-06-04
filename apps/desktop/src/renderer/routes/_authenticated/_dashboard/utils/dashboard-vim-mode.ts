import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

export type DashboardVimSequence = "g c" | "g d" | "g g" | "g w";
export type DashboardVimGlobalAction =
	| "none"
	| "show-action-hints"
	| "show-keyboard-help"
	| "toggle-sidebar";
export type DashboardVimNavigationAction =
	| "focus-sidebar-first"
	| "none"
	| "open-capy"
	| "open-chrome"
	| "open-devin"
	| "open-workspaces";

interface DashboardVimModeState {
	enabled: boolean;
	pendingPrefix: string | null;
	setEnabled: (enabled: boolean) => void;
	setPendingPrefix: (prefix: string | null) => void;
	toggle: () => void;
}

const EDITABLE_SELECTOR = [
	"input",
	"textarea",
	"select",
	"[contenteditable='true']",
	"[contenteditable='']",
	"[role='textbox']",
	"[data-command-palette-input]",
	"[data-dashboard-browser-view]",
	"[data-terminal-root]",
	"[data-monaco-editor]",
	".monaco-editor",
	".xterm",
	"webview",
].join(",");

const LOCAL_VIM_SEQUENCE_SCOPE_SELECTOR = [
	'[data-dashboard-sidebar-root="true"]',
	"[data-native-agent-view-root]",
].join(",");

const dashboardVimModeStorage = createJSONStorage<{
	enabled: boolean;
}>(() => {
	if (typeof localStorage !== "undefined") return localStorage;
	return {
		getItem: () => null,
		removeItem: () => {},
		setItem: () => {},
	};
});

export const useDashboardVimModeStore = create<DashboardVimModeState>()(
	devtools(
		persist(
			(set, get) => ({
				enabled: false,
				pendingPrefix: null,
				setEnabled: (enabled) =>
					set({
						enabled,
						pendingPrefix: enabled ? get().pendingPrefix : null,
					}),
				setPendingPrefix: (pendingPrefix) => set({ pendingPrefix }),
				toggle: () => {
					const enabled = !get().enabled;
					set({
						enabled,
						pendingPrefix: enabled ? get().pendingPrefix : null,
					});
				},
			}),
			{
				name: "dashboard-vim-mode-v1",
				partialize: (state) => ({ enabled: state.enabled }),
				storage: dashboardVimModeStorage,
			},
		),
		{ name: "DashboardVimModeStore" },
	),
);

export function isDashboardVimModeEnabled(): boolean {
	return useDashboardVimModeStore.getState().enabled;
}

export function toggleDashboardVimMode(): boolean {
	const store = useDashboardVimModeStore.getState();
	store.toggle();
	return useDashboardVimModeStore.getState().enabled;
}

export function setDashboardVimModeEnabled(enabled: boolean): void {
	useDashboardVimModeStore.getState().setEnabled(enabled);
}

export function setDashboardVimPendingPrefix(prefix: string | null): void {
	useDashboardVimModeStore.getState().setPendingPrefix(prefix);
}

export function isDashboardVimEditableTarget(
	target: EventTarget | null,
): boolean {
	if (typeof HTMLElement === "undefined") return false;
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	return target.closest(EDITABLE_SELECTOR) != null;
}

export function shouldHandleDashboardVimKey(
	event: KeyboardEvent | ReactKeyboardEvent,
): boolean {
	if (!isDashboardVimModeEnabled()) return false;
	if (event.defaultPrevented) return false;
	const isComposing =
		"isComposing" in event
			? event.isComposing
			: event.nativeEvent.isComposing === true;
	if (isComposing) return false;
	if (event.altKey || event.ctrlKey || event.metaKey) return false;
	return !isDashboardVimEditableTarget(event.target);
}

export function isDashboardLocalVimSequenceScopeActive(
	target: EventTarget | null,
): boolean {
	if (typeof HTMLElement === "undefined") return false;
	const targetElement = target instanceof HTMLElement ? target : null;
	const activeElement =
		typeof document === "undefined" ? null : document.activeElement;

	return [targetElement, activeElement].some(
		(element) =>
			element instanceof HTMLElement &&
			element.closest(LOCAL_VIM_SEQUENCE_SCOPE_SELECTOR) != null,
	);
}

export function dashboardVimKey(event: KeyboardEvent): string {
	if (event.key === "ArrowDown") return "j";
	if (event.key === "ArrowUp") return "k";
	if (event.key === "ArrowLeft") return "h";
	if (event.key === "ArrowRight") return "l";
	if (event.key === "Escape") return "escape";
	if (event.key === "Enter") return "enter";
	return event.key.length === 1 ? event.key : event.key.toLowerCase();
}

export function dashboardVimGlobalActionFromKey(
	key: string,
): DashboardVimGlobalAction {
	if (key === "f") return "show-action-hints";
	if (key === "?") return "show-keyboard-help";
	if (key === "H") return "toggle-sidebar";
	return "none";
}

export function nextDashboardVimSequence(
	pendingPrefix: string | null,
	key: string,
): { sequence: DashboardVimSequence | null; pendingPrefix: string | null } {
	if (!pendingPrefix) {
		return key === "g"
			? { pendingPrefix: "g", sequence: null }
			: { pendingPrefix: null, sequence: null };
	}

	if (pendingPrefix !== "g") return { pendingPrefix: null, sequence: null };
	if (key === "c") return { pendingPrefix: null, sequence: "g c" };
	if (key === "d") return { pendingPrefix: null, sequence: "g d" };
	if (key === "g") return { pendingPrefix: null, sequence: "g g" };
	if (key === "w") return { pendingPrefix: null, sequence: "g w" };
	return { pendingPrefix: null, sequence: null };
}

export function dashboardVimNavigationActionFromSequence(
	sequence: DashboardVimSequence | null,
): DashboardVimNavigationAction {
	if (sequence === "g c") return "open-capy";
	if (sequence === "g d") return "open-devin";
	if (sequence === "g g") return "focus-sidebar-first";
	if (sequence === "g w") return "open-workspaces";
	return "none";
}
