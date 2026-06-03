import {
	type FocusDirection,
	getPaneParentDirection,
	getSpatialNeighborPaneId,
	type PaneRegistry,
	type WorkspaceStore,
} from "@superset/panes";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useV2UserPreferences } from "renderer/hooks/useV2UserPreferences";
import { useHotkey } from "renderer/hotkeys";
import {
	addDashboardWorkspacePaneActionListener,
	type DashboardWorkspacePaneAction,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-workspace-pane-actions";
import type { V2TerminalPresetRow } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import { useRightSidebarToggleIntent } from "renderer/stores/right-sidebar-toggle-intent";
import type { StoreApi } from "zustand";
import type {
	BrowserPaneData,
	ChatPaneData,
	DiffPaneData,
	PaneViewerData,
	TerminalPaneData,
} from "../../types";
import type { TerminalLauncher } from "../useV2TerminalLauncher";

export function useWorkspaceHotkeys({
	store,
	matchedPresets,
	executePreset,
	addTerminalTab,
	paneRegistry,
	launcher,
}: {
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
	matchedPresets: V2TerminalPresetRow[];
	executePreset: (preset: V2TerminalPresetRow) => void | Promise<void>;
	addTerminalTab: () => Promise<void>;
	paneRegistry: PaneRegistry<PaneViewerData>;
	launcher: TerminalLauncher;
}) {
	const { setRightSidebarOpen, setRightSidebarTab } = useV2UserPreferences();
	const visiblePresets = useMemo(
		() => matchedPresets.filter((preset) => preset.pinnedToBar !== false),
		[matchedPresets],
	);

	useHotkey("TOGGLE_SIDEBAR", () => {
		setRightSidebarOpen((prev) => !prev);
	});

	useEffect(
		() =>
			useRightSidebarToggleIntent.subscribe((state, prev) => {
				if (state.tick !== prev.tick) setRightSidebarOpen((open) => !open);
			}),
		[setRightSidebarOpen],
	);

	// --- Tab creation ---

	useHotkey("NEW_GROUP", async () => {
		await addTerminalTab();
	});

	useHotkey("NEW_CHAT", () => {
		store.getState().addTab({
			panes: [{ kind: "chat", data: { sessionId: null } as ChatPaneData }],
		});
	});

	useHotkey("NEW_BROWSER", () => {
		store.getState().addTab({
			panes: [
				{
					kind: "browser",
					data: {
						url: "about:blank",
					} as BrowserPaneData,
				},
			],
		});
	});

	useHotkey("OPEN_DIFF_VIEWER", () => {
		setRightSidebarOpen(true);
		setRightSidebarTab("changes");

		const state = store.getState();
		for (const tab of state.tabs) {
			for (const pane of Object.values(tab.panes)) {
				if (pane.kind !== "diff") continue;
				state.setActiveTab(tab.id);
				state.setActivePane({ tabId: tab.id, paneId: pane.id });
				return;
			}
		}
		state.addTab({
			panes: [
				{
					kind: "diff",
					data: { path: "", collapsedFiles: [] } as DiffPaneData,
				},
			],
		});
	});

	// --- Tab management ---

	const isClosingPaneRef = useRef(false);
	const handleClosePane = useCallback(async () => {
		if (isClosingPaneRef.current) return;
		isClosingPaneRef.current = true;
		try {
			const state = store.getState();
			const active = state.getActivePane();
			if (!active) return;
			const definition = paneRegistry[active.pane.kind];
			if (definition?.onBeforeClose) {
				const allowed = await definition.onBeforeClose(active.pane);
				if (!allowed) return;
			}
			state.closePane({ tabId: active.tabId, paneId: active.pane.id });
		} finally {
			isClosingPaneRef.current = false;
		}
	}, [paneRegistry, store]);

	useHotkey("CLOSE_PANE", handleClosePane);

	useHotkey("CLOSE_TAB", () => {
		const state = store.getState();
		if (state.activeTabId) {
			state.removeTab(state.activeTabId);
		}
	});

	useHotkey("PREV_TAB", () => {
		const state = store.getState();
		if (!state.activeTabId || state.tabs.length === 0) return;
		const index = state.tabs.findIndex((t) => t.id === state.activeTabId);
		const prevIndex = index <= 0 ? state.tabs.length - 1 : index - 1;
		state.setActiveTab(state.tabs[prevIndex].id);
	});

	useHotkey("NEXT_TAB", () => {
		const state = store.getState();
		if (!state.activeTabId || state.tabs.length === 0) return;
		const index = state.tabs.findIndex((t) => t.id === state.activeTabId);
		const nextIndex =
			index >= state.tabs.length - 1 || index === -1 ? 0 : index + 1;
		state.setActiveTab(state.tabs[nextIndex].id);
	});

	useHotkey("PREV_TAB_ALT", () => {
		const state = store.getState();
		if (!state.activeTabId || state.tabs.length === 0) return;
		const index = state.tabs.findIndex((t) => t.id === state.activeTabId);
		const prevIndex = index <= 0 ? state.tabs.length - 1 : index - 1;
		state.setActiveTab(state.tabs[prevIndex].id);
	});

	useHotkey("NEXT_TAB_ALT", () => {
		const state = store.getState();
		if (!state.activeTabId || state.tabs.length === 0) return;
		const index = state.tabs.findIndex((t) => t.id === state.activeTabId);
		const nextIndex =
			index >= state.tabs.length - 1 || index === -1 ? 0 : index + 1;
		state.setActiveTab(state.tabs[nextIndex].id);
	});

	const switchToTab = useCallback(
		(index: number) => {
			const state = store.getState();
			const tab = state.tabs[index];
			if (tab) state.setActiveTab(tab.id);
		},
		[store],
	);

	useHotkey("JUMP_TO_TAB_1", () => switchToTab(0));
	useHotkey("JUMP_TO_TAB_2", () => switchToTab(1));
	useHotkey("JUMP_TO_TAB_3", () => switchToTab(2));
	useHotkey("JUMP_TO_TAB_4", () => switchToTab(3));
	useHotkey("JUMP_TO_TAB_5", () => switchToTab(4));
	useHotkey("JUMP_TO_TAB_6", () => switchToTab(5));
	useHotkey("JUMP_TO_TAB_7", () => switchToTab(6));
	useHotkey("JUMP_TO_TAB_8", () => switchToTab(7));
	useHotkey("JUMP_TO_TAB_9", () => switchToTab(8));

	// --- Pane management ---

	const moveFocusDirectional = useCallback(
		(dir: FocusDirection) => {
			const state = store.getState();
			const tab = state.getActiveTab();
			if (!tab || !tab.activePaneId) return;
			const neighbor = getSpatialNeighborPaneId(
				tab.layout,
				tab.activePaneId,
				dir,
			);
			if (neighbor) state.setActivePane({ tabId: tab.id, paneId: neighbor });
		},
		[store],
	);

	useHotkey("FOCUS_PANE_LEFT", () => moveFocusDirectional("left"));
	useHotkey("FOCUS_PANE_RIGHT", () => moveFocusDirectional("right"));
	useHotkey("FOCUS_PANE_UP", () => moveFocusDirectional("up"));
	useHotkey("FOCUS_PANE_DOWN", () => moveFocusDirectional("down"));

	const handleSplitAuto = useCallback(async () => {
		const state = store.getState();
		const active = state.getActivePane();
		if (!active) return;
		const tab = state.getActiveTab();
		const parentDirection = tab
			? getPaneParentDirection(tab.layout, active.pane.id)
			: null;
		const position = parentDirection === "horizontal" ? "bottom" : "right";
		const terminalId = await launcher.create();
		state.splitPane({
			tabId: active.tabId,
			paneId: active.pane.id,
			position,
			newPane: {
				kind: "terminal",
				data: { terminalId } as TerminalPaneData,
			},
		});
	}, [launcher, store]);

	const handleSplitRight = useCallback(async () => {
		const state = store.getState();
		const active = state.getActivePane();
		if (!active) return;
		const terminalId = await launcher.create();
		state.splitPane({
			tabId: active.tabId,
			paneId: active.pane.id,
			position: "right",
			newPane: {
				kind: "terminal",
				data: { terminalId } as TerminalPaneData,
			},
		});
	}, [launcher, store]);

	const handleSplitDown = useCallback(async () => {
		const state = store.getState();
		const active = state.getActivePane();
		if (!active) return;
		const terminalId = await launcher.create();
		state.splitPane({
			tabId: active.tabId,
			paneId: active.pane.id,
			position: "bottom",
			newPane: {
				kind: "terminal",
				data: { terminalId } as TerminalPaneData,
			},
		});
	}, [launcher, store]);

	const handleSplitWithChat = useCallback(() => {
		const state = store.getState();
		const active = state.getActivePane();
		if (!active) return;
		state.splitPane({
			tabId: active.tabId,
			paneId: active.pane.id,
			position: "right",
			newPane: {
				kind: "chat",
				data: { sessionId: null } as ChatPaneData,
			},
		});
	}, [store]);

	const handleSplitWithBrowser = useCallback(() => {
		const state = store.getState();
		const active = state.getActivePane();
		if (!active) return;
		state.splitPane({
			tabId: active.tabId,
			paneId: active.pane.id,
			position: "right",
			newPane: {
				kind: "browser",
				data: {
					url: "about:blank",
				} as BrowserPaneData,
			},
		});
	}, [store]);

	const handleEqualizePaneSplits = useCallback(() => {
		const state = store.getState();
		const tab = state.getActiveTab();
		if (!tab) return;
		state.equalizeTab({ tabId: tab.id });
	}, [store]);

	useHotkey("SPLIT_AUTO", handleSplitAuto);
	useHotkey("SPLIT_RIGHT", handleSplitRight);
	useHotkey("SPLIT_DOWN", handleSplitDown);
	useHotkey("SPLIT_WITH_CHAT", handleSplitWithChat);
	useHotkey("SPLIT_WITH_BROWSER", handleSplitWithBrowser);
	useHotkey("EQUALIZE_PANE_SPLITS", handleEqualizePaneSplits);

	const handleWorkspacePaneAction = useCallback(
		(action: DashboardWorkspacePaneAction) => {
			switch (action) {
				case "close-pane":
					void handleClosePane();
					break;
				case "equalize":
					handleEqualizePaneSplits();
					break;
				case "split-auto":
					void handleSplitAuto();
					break;
				case "split-browser":
					handleSplitWithBrowser();
					break;
				case "split-chat":
					handleSplitWithChat();
					break;
				case "split-down":
					void handleSplitDown();
					break;
				case "split-right":
					void handleSplitRight();
					break;
			}
		},
		[
			handleClosePane,
			handleEqualizePaneSplits,
			handleSplitAuto,
			handleSplitDown,
			handleSplitRight,
			handleSplitWithBrowser,
			handleSplitWithChat,
		],
	);

	useEffect(
		() => addDashboardWorkspacePaneActionListener(handleWorkspacePaneAction),
		[handleWorkspacePaneAction],
	);

	// --- Preset hotkeys ---

	const openPresetByIndex = useCallback(
		(index: number) => {
			const preset = visiblePresets[index];
			if (preset) executePreset(preset);
		},
		[visiblePresets, executePreset],
	);

	useHotkey("OPEN_PRESET_1", () => openPresetByIndex(0));
	useHotkey("OPEN_PRESET_2", () => openPresetByIndex(1));
	useHotkey("OPEN_PRESET_3", () => openPresetByIndex(2));
	useHotkey("OPEN_PRESET_4", () => openPresetByIndex(3));
	useHotkey("OPEN_PRESET_5", () => openPresetByIndex(4));
	useHotkey("OPEN_PRESET_6", () => openPresetByIndex(5));
	useHotkey("OPEN_PRESET_7", () => openPresetByIndex(6));
	useHotkey("OPEN_PRESET_8", () => openPresetByIndex(7));
	useHotkey("OPEN_PRESET_9", () => openPresetByIndex(8));
}
