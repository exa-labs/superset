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

		expect(hotkeyIds.has("OPEN_CONTROL_PLANE")).toBe(true);
		expect(hotkeyIds.has("TOGGLE_VIM_MODE")).toBe(true);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_NEXT")).toBe(true);
		expect(hotkeyIds.has("SWITCH_DASHBOARD_VIEW_PREVIOUS")).toBe(true);
		expect(hotkeyIds.has("OPEN_CAPY")).toBe(true);
		expect(hotkeyIds.has("OPEN_DEVIN")).toBe(true);
		expect(hotkeyIds.has("OPEN_CHROME")).toBe(true);
		expect(labels.has("Search sidebar")).toBe(true);
		expect(labels.has("Split native/browser")).toBe(true);
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
