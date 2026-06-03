import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_KEYBOARD_HELP_OPEN_EVENT,
	DASHBOARD_KEYBOARD_HELP_SECTIONS,
	openDashboardKeyboardHelp,
} from "./dashboard-keyboard-help";

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
			expect.objectContaining({ keys: ["H"] }),
		);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_NEXT")).toBe(true);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_PREVIOUS")).toBe(true);
		expect(hotkeyIds.has("OPEN_CAPY")).toBe(true);
		expect(hotkeyIds.has("OPEN_DEVIN")).toBe(true);
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
		expect(entryByLabel.get("Open Chrome in Vim mode")).toEqual(
			expect.objectContaining({ keys: ["g", "g"] }),
		);
		expect(entryByLabel.get("Create Capy thread")).toEqual(
			expect.objectContaining({ keys: ["⌥", "C", "n"] }),
		);
		expect(entryByLabel.get("Create Devin session")).toEqual(
			expect.objectContaining({ keys: ["⌥", "D", "n"] }),
		);
		expect(entryByLabel.get("Show selected item actions")).toEqual(
			expect.objectContaining({ keys: ["."] }),
		);
		expect(labels.has("Search sidebar")).toBe(true);
		expect(entryByLabel.get("Search sidebar")).toEqual(
			expect.objectContaining({ keys: ["/", "type"] }),
		);
		expect(entryByLabel.get("Jump to top")).toEqual(
			expect.objectContaining({ keys: ["g", "g", "Home"] }),
		);
		expect(entryByLabel.get("Jump to bottom")).toEqual(
			expect.objectContaining({ keys: ["G", "End"] }),
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
		expect(entryByLabel.get("Create native folder")).toEqual(
			expect.objectContaining({ keys: ["N"] }),
		);
		expect(entryByLabel.get("Pin or unpin selected")).toEqual(
			expect.objectContaining({ keys: ["P"] }),
		);
		expect(entryByLabel.get("Archive selected")).toEqual(
			expect.objectContaining({ keys: ["A", "X"] }),
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
		expect(entryByLabel.get("Duplicate Chrome tab")).toEqual(
			expect.objectContaining({ keys: ["n"] }),
		);
		expect(entryByLabel.get("Reload Chrome tab")).toEqual(
			expect.objectContaining({ keys: ["r"] }),
		);
		expect(entryByLabel.get("Split Chrome view")).toEqual(
			expect.objectContaining({ keys: ["s"] }),
		);
		expect(entryByLabel.get("Swap Chrome split focus")).toEqual(
			expect.objectContaining({ keys: ["w"] }),
		);
		expect(entryByLabel.get("Close Chrome split")).toEqual(
			expect.objectContaining({ keys: ["q"] }),
		);
		expect(entryByLabel.get("Resize Chrome split")).toEqual(
			expect.objectContaining({ keys: ["[", "]"] }),
		);
		expect(entryByLabel.get("Equalize Chrome split")).toEqual(
			expect.objectContaining({ keys: ["="] }),
		);
		expect(entryByLabel.get("Close Chrome tab")).toEqual(
			expect.objectContaining({ keys: ["x"] }),
		);
		expect(entryByLabel.get("Pin Chrome tab")).toEqual(
			expect.objectContaining({ keys: ["p"] }),
		);
		expect(entryByLabel.get("Previous or next Chrome tab")).toEqual(
			expect.objectContaining({ keys: ["h", "l"] }),
		);
		expect(entryByLabel.get("Open stag kr9")).toEqual(
			expect.objectContaining({ keys: ["⌥", "K"] }),
		);
		expect(entryByLabel.get("Open prod kr9")).toEqual(
			expect.objectContaining({ keys: ["⌥", "K"] }),
		);
		expect(entryByLabel.get("Open heph kr9")).toEqual(
			expect.objectContaining({ keys: ["⌥", "K"] }),
		);
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
});
