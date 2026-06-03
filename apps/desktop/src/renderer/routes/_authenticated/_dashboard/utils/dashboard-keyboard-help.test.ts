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
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_NEXT")).toBe(true);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_PREVIOUS")).toBe(true);
		expect(hotkeyIds.has("OPEN_CAPY")).toBe(true);
		expect(hotkeyIds.has("OPEN_DEVIN")).toBe(true);
		expect(hotkeyIds.has("OPEN_CHROME")).toBe(true);
		expect(labels.has("Search sidebar")).toBe(true);
		expect(labels.has("Split native/browser")).toBe(true);
		expect(entryByLabel.get("Reply")).toEqual(
			expect.objectContaining({ keys: ["r"] }),
		);
		expect(entryByLabel.get("Open browser version")).toEqual(
			expect.objectContaining({ keys: ["o"] }),
		);
		expect(entryByLabel.get("Rename session")).toEqual(
			expect.objectContaining({ keys: ["e"] }),
		);
		expect(entryByLabel.get("Refresh native data")).toEqual(
			expect.objectContaining({ keys: ["R"] }),
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
