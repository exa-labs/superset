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
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_NEXT")).toBe(true);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_PREVIOUS")).toBe(true);
		expect(hotkeyIds.has("OPEN_CAPY")).toBe(true);
		expect(hotkeyIds.has("OPEN_DEVIN")).toBe(true);
		expect(hotkeyIds.has("OPEN_CHROME")).toBe(true);
		expect(labels.has("Search sidebar")).toBe(true);
		expect(entryByLabel.get("Search sidebar")).toEqual(
			expect.objectContaining({ keys: ["/", "type"] }),
		);
		expect(labels.has("Split native/browser")).toBe(true);
		expect(entryByLabel.get("Create from section")).toEqual(
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
		expect(entryByLabel.get("Open unread reply")).toEqual(
			expect.objectContaining({ keys: ["u"] }),
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
		expect(entryByLabel.get("Resize Chrome split")).toEqual(
			expect.objectContaining({ keys: ["[", "]"] }),
		);
		expect(entryByLabel.get("Equalize Chrome split")).toEqual(
			expect.objectContaining({ keys: ["="] }),
		);
		expect(entryByLabel.get("Close Chrome tab")).toEqual(
			expect.objectContaining({ keys: ["x"] }),
		);
		expect(entryByLabel.get("Previous or next Chrome tab")).toEqual(
			expect.objectContaining({ keys: ["h", "l"] }),
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
