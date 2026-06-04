import { describe, expect, it } from "bun:test";
import {
	consumePendingDashboardQuickTerminalLaunch,
	DASHBOARD_QUICK_TERMINALS,
	dashboardQuickTerminalCommand,
	dashboardQuickTerminalShortcutLabel,
	dashboardQuickTerminalTitle,
	writePendingDashboardQuickTerminalLaunch,
} from "./dashboard-quick-terminals";

function createMemoryStorage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => Array.from(values.keys())[index] ?? null,
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, value),
	} satisfies Storage;
}

describe("dashboard quick terminals", () => {
	it("defines the three kr9 targets in sidebar order", () => {
		expect(DASHBOARD_QUICK_TERMINALS.map((terminal) => terminal.id)).toEqual([
			"stag",
			"prod",
			"heph",
		]);
	});

	it("builds the kr9 command for each target", () => {
		expect(dashboardQuickTerminalCommand("stag")).toBe("kr9");
		expect(dashboardQuickTerminalCommand("prod")).toBe("kr9");
		expect(dashboardQuickTerminalCommand("heph")).toBe("kr9");
	});

	it("uses the short target as the terminal title", () => {
		expect(dashboardQuickTerminalTitle("stag")).toBe("stag");
	});

	it("builds command-palette shortcut labels for each root terminal", () => {
		expect(dashboardQuickTerminalShortcutLabel("stag")).toBe("⌥K stag");
		expect(dashboardQuickTerminalShortcutLabel("prod")).toBe("⌥K prod");
		expect(dashboardQuickTerminalShortcutLabel("heph")).toBe("⌥K heph");
	});

	it("persists and consumes a pending quick launch for the target workspace", () => {
		const storage = createMemoryStorage();
		writePendingDashboardQuickTerminalLaunch("heph", "workspace-1", storage);

		expect(
			consumePendingDashboardQuickTerminalLaunch("workspace-2", storage),
		).toBeNull();
		expect(
			consumePendingDashboardQuickTerminalLaunch("workspace-1", storage),
		).toBe("heph");
		expect(
			consumePendingDashboardQuickTerminalLaunch("workspace-1", storage),
		).toBeNull();
	});
});
