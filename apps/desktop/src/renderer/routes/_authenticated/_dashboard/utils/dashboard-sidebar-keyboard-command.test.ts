import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
	type DashboardSidebarKeyboardCommandDetail,
	dispatchDashboardSidebarKeyboardCommand,
	isDashboardSidebarKeyboardCommand,
} from "./dashboard-sidebar-keyboard-command";

describe("dashboard sidebar keyboard command", () => {
	it("recognizes the shared sidebar keyboard commands", () => {
		expect(isDashboardSidebarKeyboardCommand("focus-next")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("focus-previous")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("toggle-expansion")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("open-chrome")).toBe(false);
		expect(isDashboardSidebarKeyboardCommand(null)).toBe(false);
	});

	it("dispatches sidebar keyboard commands through a window event", () => {
		if (typeof window === "undefined") return;

		const received: DashboardSidebarKeyboardCommandDetail[] = [];
		const listener = (event: Event) => {
			received.push(
				(event as CustomEvent<DashboardSidebarKeyboardCommandDetail>).detail,
			);
		};

		window.addEventListener(DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT, listener);
		try {
			expect(dispatchDashboardSidebarKeyboardCommand("focus-next")).toBe(true);
		} finally {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
				listener,
			);
		}

		expect(received).toEqual([{ command: "focus-next" }]);
	});
});
