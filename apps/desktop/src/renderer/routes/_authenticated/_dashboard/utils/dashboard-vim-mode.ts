import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type DashboardVimSequence = "g c" | "g d" | "g g";

interface DashboardVimModeState {
	enabled: boolean;
	setEnabled: (enabled: boolean) => void;
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

export const useDashboardVimModeStore = create<DashboardVimModeState>()(
	devtools(
		persist(
			(set, get) => ({
				enabled: false,
				setEnabled: (enabled) => set({ enabled }),
				toggle: () => set({ enabled: !get().enabled }),
			}),
			{
				name: "dashboard-vim-mode-v1",
				partialize: (state) => ({ enabled: state.enabled }),
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
	if (event.isComposing) return false;
	if (event.altKey || event.ctrlKey || event.metaKey) return false;
	return !isDashboardVimEditableTarget(event.target);
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
	return { pendingPrefix: null, sequence: null };
}
