import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
	type DashboardSidebarKeyboardCommandDetail,
	dashboardSidebarKeyboardActionFromCommand,
	dashboardSidebarKeyboardFallbackCommands,
	dispatchDashboardSidebarKeyboardCommand,
	dispatchDashboardSidebarKeyboardCommandWithFallback,
	isDashboardSidebarKeyboardCommand,
} from "./dashboard-sidebar-keyboard-command";

describe("dashboard sidebar keyboard command", () => {
	it("recognizes the shared sidebar keyboard commands", () => {
		expect(isDashboardSidebarKeyboardCommand("focus-next")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("focus-previous")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("toggle-expansion")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("action-pin")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("action-reply")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("action-open-browser")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("action-mark-read")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("action-hard-archive")).toBe(true);
		expect(isDashboardSidebarKeyboardCommand("open-chrome")).toBe(false);
		expect(isDashboardSidebarKeyboardCommand(null)).toBe(false);
	});

	it("maps action commands back to row-scoped sidebar actions", () => {
		expect(dashboardSidebarKeyboardActionFromCommand("action-pin")).toBe("pin");
		expect(dashboardSidebarKeyboardActionFromCommand("action-reply")).toBe(
			"reply",
		);
		expect(
			dashboardSidebarKeyboardActionFromCommand("action-remove-from-folder"),
		).toBe("remove-from-folder");
		expect(
			dashboardSidebarKeyboardActionFromCommand("action-hard-archive"),
		).toBe("hard-archive");
		expect(dashboardSidebarKeyboardActionFromCommand("action-mark-read")).toBe(
			"mark-read",
		);
		expect(dashboardSidebarKeyboardActionFromCommand("focus-next")).toBeNull();
	});

	it("falls native hard archive back to generic move-away when a row has no hard archive action", () => {
		expect(
			dashboardSidebarKeyboardFallbackCommands("action-hard-archive"),
		).toEqual(["action-archive"]);
		expect(dashboardSidebarKeyboardFallbackCommands("action-archive")).toEqual(
			[],
		);
		expect(dashboardSidebarKeyboardFallbackCommands("focus-next")).toEqual([]);
	});

	it("dispatches sidebar keyboard commands through a cancelable window event", () => {
		if (typeof window === "undefined") return;

		const received: DashboardSidebarKeyboardCommandDetail[] = [];
		const listener = (event: Event) => {
			received.push(
				(event as CustomEvent<DashboardSidebarKeyboardCommandDetail>).detail,
			);
		};

		window.addEventListener(DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT, listener);
		try {
			expect(dispatchDashboardSidebarKeyboardCommand("focus-next")).toBe(false);
		} finally {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
				listener,
			);
		}

		expect(received).toEqual([{ command: "focus-next" }]);
	});

	it("returns true when a sidebar listener handles the command", () => {
		if (typeof window === "undefined") return;

		const listener = (event: Event) => {
			event.preventDefault();
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
	});

	it("runs fallback only for unhandled sidebar keyboard commands", () => {
		if (typeof window === "undefined") return;

		const fallbackCommands: string[] = [];
		const handledListener = (event: Event) => {
			event.preventDefault();
		};

		expect(
			dispatchDashboardSidebarKeyboardCommandWithFallback(
				"focus-next",
				(command) => {
					fallbackCommands.push(command);
				},
			),
		).toBe(false);
		expect(fallbackCommands).toEqual(["focus-next"]);

		window.addEventListener(
			DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
			handledListener,
		);
		try {
			expect(
				dispatchDashboardSidebarKeyboardCommandWithFallback(
					"focus-previous",
					(command) => {
						fallbackCommands.push(command);
					},
				),
			).toBe(true);
		} finally {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
				handledListener,
			);
		}
		expect(fallbackCommands).toEqual(["focus-next"]);
	});
});
