import { describe, expect, it } from "bun:test";
import { dashboardBrowserShortcutDescriptors } from "./dashboard-browser-shortcuts";
import {
	DASHBOARD_KEYBOARD_HELP_OPEN_EVENT,
	DASHBOARD_KEYBOARD_HELP_SECTIONS,
	dashboardKeyboardHelpBrowserChromeEntries,
	dashboardKeyboardHelpBrowserEntries,
	dashboardKeyboardHelpBrowserSidebarEntries,
	filterDashboardKeyboardHelpSections,
	normalizeDashboardKeyboardHelpQuery,
	openDashboardKeyboardHelp,
	shouldOpenDashboardKeyboardHelpFromQuestionKey,
} from "./dashboard-keyboard-help";
import { setDashboardVimModeEnabled } from "./dashboard-vim-mode";

function keyEvent(
	overrides: Partial<KeyboardEvent> & { target?: EventTarget | null } = {},
) {
	const target = overrides.target ?? null;
	return {
		altKey: false,
		ctrlKey: false,
		defaultPrevented: false,
		isComposing: false,
		key: "?",
		metaKey: false,
		shiftKey: true,
		target,
		...overrides,
	} as KeyboardEvent;
}

describe("dashboard keyboard help", () => {
	it("covers the keyboard-native dashboard pillars", () => {
		const entries = DASHBOARD_KEYBOARD_HELP_SECTIONS.flatMap(
			(section) => section.entries,
		);
		const hotkeyIds = new Set(
			entries.flatMap((entry) => (entry.hotkeyId ? [entry.hotkeyId] : [])),
		);
		const labels = new Set(entries.map((entry) => entry.label));
		const entryByLabel = new Map(
			entries.map((entry) => [entry.label, entry] as const),
		);

		expect(hotkeyIds.has("OPEN_CONTROL_PLANE")).toBe(true);
		expect(hotkeyIds.has("TOGGLE_VIM_MODE")).toBe(true);
		expect(hotkeyIds.has("SHOW_DASHBOARD_KEYBOARD_HELP")).toBe(true);
		expect(hotkeyIds.has("SHOW_DASHBOARD_ACTION_HINTS")).toBe(true);
		expect(hotkeyIds.has("OPEN_UNREAD_NATIVE_REPLY")).toBe(true);
		expect(hotkeyIds.has("MARK_LATEST_NATIVE_REPLY_READ")).toBe(true);
		expect(entryByLabel.get("Return focus to sidebar")).toEqual(
			expect.objectContaining({ keys: ["Esc"] }),
		);
		expect(entryByLabel.get("Show action hints")).toEqual(
			expect.objectContaining({ hotkeyId: "SHOW_DASHBOARD_ACTION_HINTS" }),
		);
		expect(entryByLabel.get("Show action hints in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["f"] }),
		);
		expect(entryByLabel.get("Toggle sidebar in Vim mode")).toEqual(
			expect.objectContaining({
				description: expect.stringContaining("embedded Chrome keeps H/L"),
				keys: ["H"],
			}),
		);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_NEXT")).toBe(true);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_PREVIOUS")).toBe(true);
		expect(hotkeyIds.has("OPEN_CAPY")).toBe(true);
		expect(hotkeyIds.has("CREATE_CAPY")).toBe(true);
		expect(hotkeyIds.has("OPEN_DEVIN")).toBe(true);
		expect(hotkeyIds.has("CREATE_DEVIN")).toBe(true);
		expect(hotkeyIds.has("OPEN_CHROME")).toBe(true);
		expect(hotkeyIds.has("OPEN_WORKSPACES")).toBe(true);
		expect(entryByLabel.get("Open workspaces in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["g", "w"] }),
		);
		expect(entryByLabel.get("Open Capy in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["g", "c"] }),
		);
		expect(entryByLabel.get("Open Devin in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["g", "d"] }),
		);
		expect(entryByLabel.get("Jump to sidebar top in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["g", "g"] }),
		);
		expect(entryByLabel.get("Create Capy thread")).toEqual(
			expect.objectContaining({ hotkeyId: "CREATE_CAPY" }),
		);
		expect(entryByLabel.get("Create Capy thread from Capy chord")).toEqual(
			expect.objectContaining({ keys: ["⌥", "C", "n"] }),
		);
		expect(entryByLabel.get("Create Devin session")).toEqual(
			expect.objectContaining({ hotkeyId: "CREATE_DEVIN" }),
		);
		expect(entryByLabel.get("Create Devin session from Devin chord")).toEqual(
			expect.objectContaining({ keys: ["⌥", "D", "n"] }),
		);
		expect(entryByLabel.get("Show selected item actions")).toEqual(
			expect.objectContaining({ keys: ["."] }),
		);
		expect(labels.has("Search sidebar")).toBe(true);
		expect(entryByLabel.get("Search sidebar")).toEqual(
			expect.objectContaining({ keys: ["/", "type"] }),
		);
		expect(entryByLabel.get("Search sidebar from anywhere")).toEqual(
			expect.objectContaining({ keys: ["⌥K", "type sidebar"] }),
		);
		expect(entryByLabel.get("Move in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["j", "k"] }),
		);
		expect(entryByLabel.get("Typeahead jump")).toEqual(
			expect.objectContaining({ keys: ["type"] }),
		);
		expect(entryByLabel.get("Jump to top")).toEqual(
			expect.objectContaining({ keys: ["g", "g", "Home"] }),
		);
		expect(entryByLabel.get("Jump to bottom")).toEqual(
			expect.objectContaining({ keys: ["G", "End"] }),
		);
		expect(entryByLabel.get("Collapse or expand")).toEqual(
			expect.objectContaining({ keys: ["h", "l"] }),
		);
		expect(labels.has("Split native/browser")).toBe(true);
		expect(hotkeyIds.has("SPLIT_RIGHT")).toBe(true);
		expect(hotkeyIds.has("SPLIT_DOWN")).toBe(true);
		expect(hotkeyIds.has("NARROW_PANE_SPLIT")).toBe(true);
		expect(hotkeyIds.has("WIDEN_PANE_SPLIT")).toBe(true);
		expect(hotkeyIds.has("EQUALIZE_PANE_SPLITS")).toBe(true);
		expect(hotkeyIds.has("FOCUS_PANE_LEFT")).toBe(true);
		expect(hotkeyIds.has("FOCUS_PANE_RIGHT")).toBe(true);
		expect(hotkeyIds.has("FOCUS_PANE_UP")).toBe(true);
		expect(hotkeyIds.has("FOCUS_PANE_DOWN")).toBe(true);
		expect(hotkeyIds.has("CLOSE_PANE")).toBe(true);
		expect(entryByLabel.get("Focus workspace pane in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["h", "j", "k", "l"] }),
		);
		expect(entryByLabel.get("Swap workspace pane")).toEqual(
			expect.objectContaining({ keys: ["⌥", "K"] }),
		);
		expect(entryByLabel.get("Swap workspace pane in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["H", "J", "K", "L"] }),
		);
		expect(entryByLabel.get("Control workspace panes in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["s", "[", "]", "=", "x"] }),
		);
		expect(entryByLabel.get("Create from section")).toEqual(
			expect.objectContaining({ keys: ["n"] }),
		);
		expect(entryByLabel.get("Create folder or group")).toEqual(
			expect.objectContaining({ keys: ["N"] }),
		);
		expect(entryByLabel.get("Pin or unpin selected")).toEqual(
			expect.objectContaining({ keys: ["p"] }),
		);
		expect(entryByLabel.get("Rename selected")).toEqual(
			expect.objectContaining({ keys: ["e"] }),
		);
		expect(entryByLabel.get("Move selected to folder")).toEqual(
			expect.objectContaining({ keys: ["m"] }),
		);
		expect(entryByLabel.get("Remove selected from folder")).toEqual(
			expect.objectContaining({ keys: ["F"] }),
		);
		expect(entryByLabel.get("Archive selected")).toEqual(
			expect.objectContaining({ keys: ["a", "x"] }),
		);
		expect(entryByLabel.get("Color selected folder")).toEqual(
			expect.objectContaining({ keys: ["c"] }),
		);
		expect(entryByLabel.get("Delete selected folder")).toEqual(
			expect.objectContaining({ keys: ["d"] }),
		);
		expect(entryByLabel.get("Reply")).toEqual(
			expect.objectContaining({ keys: ["r"] }),
		);
		expect(entryByLabel.get("Insert reply")).toEqual(
			expect.objectContaining({ keys: ["i"] }),
		);
		expect(entryByLabel.get("Jump native overview")).toEqual(
			expect.objectContaining({ keys: ["g", "g", "G", "Home", "End"] }),
		);
		expect(entryByLabel.get("Open unread reply")).toEqual(
			expect.objectContaining({ keys: ["u"] }),
		);
		expect(entryByLabel.get("Open unread native reply")).toEqual(
			expect.objectContaining({ hotkeyId: "OPEN_UNREAD_NATIVE_REPLY" }),
		);
		expect(entryByLabel.get("Mark latest native reply read")).toEqual(
			expect.objectContaining({ hotkeyId: "MARK_LATEST_NATIVE_REPLY_READ" }),
		);
		expect(entryByLabel.get("Mark latest reply read")).toEqual(
			expect.objectContaining({ keys: ["U"] }),
		);
		expect(entryByLabel.get("Open browser version")).toEqual(
			expect.objectContaining({ keys: ["o"] }),
		);
		expect(entryByLabel.get("Open externally")).toEqual(
			expect.objectContaining({ keys: ["O"] }),
		);
		expect(entryByLabel.get("Native/browser in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["b"] }),
		);
		expect(entryByLabel.get("Split in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["s"] }),
		);
		expect(entryByLabel.get("Resize native split")).toEqual(
			expect.objectContaining({ keys: ["[", "]"] }),
		);
		expect(entryByLabel.get("Equalize native split")).toEqual(
			expect.objectContaining({ keys: ["="] }),
		);
		expect(entryByLabel.get("Close native split")).toEqual(
			expect.objectContaining({ keys: ["q"] }),
		);
		expect(entryByLabel.get("Remove from folder")).toEqual(
			expect.objectContaining({ keys: ["F"] }),
		);
		expect(entryByLabel.get("Rename session")).toEqual(
			expect.objectContaining({ keys: ["e"] }),
		);
		expect(entryByLabel.get("Refresh native data")).toEqual(
			expect.objectContaining({ keys: ["R"] }),
		);
		expect(entryByLabel.get("Cycle folder color")).toEqual(
			expect.objectContaining({ keys: ["c"] }),
		);
		expect(entryByLabel.get("Delete folder")).toEqual(
			expect.objectContaining({ keys: ["d"] }),
		);
		expect(entryByLabel.get("Chrome: New tab from current page")).toEqual(
			expect.objectContaining({ keys: ["n"] }),
		);
		expect(entryByLabel.get("Chrome: Reload")).toEqual(
			expect.objectContaining({ keys: ["r"] }),
		);
		expect(entryByLabel.get("Open or close Chrome split")).toEqual(
			expect.objectContaining({ keys: ["s"] }),
		);
		expect(entryByLabel.get("Chrome: Swap panes")).toEqual(
			expect.objectContaining({ keys: ["w"] }),
		);
		expect(entryByLabel.get("Chrome: Close split")).toEqual(
			expect.objectContaining({ keys: ["q"] }),
		);
		expect(entryByLabel.get("Chrome: Narrow active pane")).toEqual(
			expect.objectContaining({ keys: ["["] }),
		);
		expect(entryByLabel.get("Chrome: Widen active pane")).toEqual(
			expect.objectContaining({ keys: ["]"] }),
		);
		expect(entryByLabel.get("Chrome: Equalize panes")).toEqual(
			expect.objectContaining({ keys: ["="] }),
		);
		expect(entryByLabel.get("Chrome: Close current tab")).toEqual(
			expect.objectContaining({ keys: ["x"] }),
		);
		expect(entryByLabel.get("Chrome: Pin or unpin sidebar tab")).toEqual(
			expect.objectContaining({ keys: ["p"] }),
		);
		expect(entryByLabel.get("Chrome: Previous tab")).toEqual(
			expect.objectContaining({ keys: ["h"] }),
		);
		expect(entryByLabel.get("Chrome: Next tab")).toEqual(
			expect.objectContaining({ keys: ["l"] }),
		);
		expect(entryByLabel.get("Chrome: Back")).toEqual(
			expect.objectContaining({ keys: ["H"] }),
		);
		expect(entryByLabel.get("Chrome: Forward")).toEqual(
			expect.objectContaining({ keys: ["L"] }),
		);
		expect(entryByLabel.get("Browser: Move sidebar focus")).toEqual(
			expect.objectContaining({ keys: ["j", "k", "G"] }),
		);
		expect(entryByLabel.get("Browser: Open focused sidebar item")).toEqual(
			expect.objectContaining({ keys: ["Enter"] }),
		);
		expect(entryByLabel.get("Browser: Toggle focused sidebar item")).toEqual(
			expect.objectContaining({ keys: ["Space"] }),
		);
		expect(entryByLabel.get("Browser: Search sidebar")).toEqual(
			expect.objectContaining({ keys: ["/"] }),
		);
		expect(entryByLabel.get("Browser: Run sidebar row actions")).toEqual(
			expect.objectContaining({
				keys: [".", "N", "o", "b", "m", "F", "a", "e", "c", "d"],
			}),
		);
		expect(entryByLabel.get("Browser: Jump to dashboard sections")).toEqual(
			expect.objectContaining({ keys: ["g", "c", "d", "w"] }),
		);
		expect(entryByLabel.get("Open root kr9 terminal")).toEqual(
			expect.objectContaining({ keys: ["⌥K", "type kr9"] }),
		);
		expect(entryByLabel.get("Show this overlay from dashboard shell")).toEqual(
			expect.objectContaining({ keys: ["?"] }),
		);
	});

	it("keeps keyboard help Chrome shortcuts aligned with the browser descriptor source", () => {
		const browserSection = DASHBOARD_KEYBOARD_HELP_SECTIONS.find(
			(section) => section.id === "browser",
		);
		const expectedDescriptors = [
			...dashboardBrowserShortcutDescriptors({ isSplitView: false }),
			...dashboardBrowserShortcutDescriptors({ isSplitView: true }).filter(
				(shortcut) =>
					shortcut.section === "split" && shortcut.action !== "toggle-split",
			),
		];
		const browserEntries = browserSection?.entries ?? [];

		expect(browserSection).toBeDefined();
		expect(browserEntries).toEqual([
			...dashboardKeyboardHelpBrowserChromeEntries(),
			...dashboardKeyboardHelpBrowserSidebarEntries(),
		]);
		expect(dashboardKeyboardHelpBrowserEntries()).toEqual(browserEntries);
		expect(
			dashboardKeyboardHelpBrowserChromeEntries().map(
				(entry) => entry.keys?.[0],
			),
		).toEqual(expectedDescriptors.map((shortcut) => shortcut.key));
		expect(
			dashboardKeyboardHelpBrowserChromeEntries().map((entry) => entry.label),
		).toEqual(
			expectedDescriptors.map((shortcut) =>
				shortcut.action === "toggle-split"
					? "Open or close Chrome split"
					: `Chrome: ${shortcut.label}`,
			),
		);
		expect(
			dashboardKeyboardHelpBrowserSidebarEntries().map((entry) => entry.label),
		).toEqual([
			"Browser: Move sidebar focus",
			"Browser: Open focused sidebar item",
			"Browser: Toggle focused sidebar item",
			"Browser: Search sidebar",
			"Browser: Run sidebar row actions",
			"Browser: Jump to dashboard sections",
		]);
	});

	it("dispatches a cancelable dashboard help event", () => {
		if (typeof window === "undefined") return;
		let seen = false;
		const listener = (event: Event) => {
			seen = true;
			expect(event.cancelable).toBe(true);
		};

		window.addEventListener(DASHBOARD_KEYBOARD_HELP_OPEN_EVENT, listener, {
			once: true,
		});

		expect(openDashboardKeyboardHelp()).toBe(true);
		expect(seen).toBe(true);
	});

	it("opens keyboard help from plain question mark in dashboard chrome", () => {
		setDashboardVimModeEnabled(false);
		if (typeof document === "undefined") return;

		const button = document.createElement("button");
		document.body.append(button);

		try {
			expect(
				shouldOpenDashboardKeyboardHelpFromQuestionKey(
					keyEvent({ target: button }),
				),
			).toBe(true);
		} finally {
			button.remove();
		}
	});

	it("keeps question mark out of Vim mode and focus-trapping surfaces", () => {
		setDashboardVimModeEnabled(false);
		expect(
			shouldOpenDashboardKeyboardHelpFromQuestionKey(
				keyEvent({ altKey: true }),
			),
		).toBe(false);
		expect(
			shouldOpenDashboardKeyboardHelpFromQuestionKey(
				keyEvent({ defaultPrevented: true }),
			),
		).toBe(false);
		expect(
			shouldOpenDashboardKeyboardHelpFromQuestionKey(
				keyEvent({ isComposing: true }),
			),
		).toBe(false);
		expect(
			shouldOpenDashboardKeyboardHelpFromQuestionKey(keyEvent({ key: "/" })),
		).toBe(false);

		setDashboardVimModeEnabled(true);
		expect(shouldOpenDashboardKeyboardHelpFromQuestionKey(keyEvent())).toBe(
			false,
		);
		setDashboardVimModeEnabled(false);

		if (typeof document === "undefined") return;

		const commandInput = document.createElement("input");
		commandInput.setAttribute("data-command-palette-input", "true");
		const browserView = document.createElement("div");
		browserView.setAttribute("data-dashboard-browser-view", "true");
		const terminalRoot = document.createElement("div");
		terminalRoot.setAttribute("data-terminal-root", "true");
		const monacoEditor = document.createElement("div");
		monacoEditor.setAttribute("data-monaco-editor", "true");
		const guardedTargets = [
			commandInput,
			document.createElement("webview"),
			browserView,
			terminalRoot,
			monacoEditor,
		];

		try {
			for (const target of guardedTargets) {
				document.body.append(target);
				expect(
					shouldOpenDashboardKeyboardHelpFromQuestionKey(keyEvent({ target })),
				).toBe(false);
			}
		} finally {
			for (const target of guardedTargets) {
				target.remove();
			}
		}
	});

	it("normalizes shortcut search queries into lowercase tokens", () => {
		expect(normalizeDashboardKeyboardHelpQuery("  Folder   Color ")).toEqual([
			"folder",
			"color",
		]);
		expect(normalizeDashboardKeyboardHelpQuery("")).toEqual([]);
	});

	it("filters shortcut help by action, section, and key aliases", () => {
		const labelsForQuery = (query: string) =>
			filterDashboardKeyboardHelpSections({ query }).flatMap((section) =>
				section.entries.map((entry) => entry.label),
			);

		expect(labelsForQuery("folder")).toEqual(
			expect.arrayContaining([
				"Create folder or group",
				"Move selected to folder",
				"Delete folder",
			]),
		);
		expect(labelsForQuery("native reply")).toEqual(
			expect.arrayContaining([
				"Open unread native reply",
				"Mark latest native reply read",
			]),
		);
		expect(labelsForQuery("option c")).toEqual(
			expect.arrayContaining(["Open Capy thread 1", "Create Capy thread"]),
		);
		expect(labelsForQuery("option c")).not.toEqual(
			expect.arrayContaining(["Open Devin session 1", "Create Devin session"]),
		);
		expect(labelsForQuery("option k")).toEqual(
			expect.arrayContaining(["Open control plane"]),
		);
		expect(labelsForQuery("kr9")).toEqual(
			expect.arrayContaining(["Open root kr9 terminal"]),
		);
		expect(labelsForQuery("heph")).toEqual(
			expect.arrayContaining(["Open root kr9 terminal"]),
		);
		expect(labelsForQuery("stag")).toEqual(
			expect.arrayContaining(["Open root kr9 terminal"]),
		);
		expect(labelsForQuery("prod")).toEqual(
			expect.arrayContaining(["Open root kr9 terminal"]),
		);
		expect(labelsForQuery("alt tab")).toEqual(
			expect.arrayContaining(["Switch recent view"]),
		);
		expect(labelsForQuery("option v")).toEqual(
			expect.arrayContaining(["Toggle Vim mode"]),
		);
		expect(labelsForQuery("option n")).toEqual(
			expect.arrayContaining(["Open unread native reply"]),
		);
		expect(labelsForQuery("embedded chrome sidebar")).toEqual(
			expect.arrayContaining([
				"Browser: Move sidebar focus",
				"Browser: Run sidebar row actions",
			]),
		);
		expect(labelsForQuery("does-not-exist")).toEqual([]);
	});
});
