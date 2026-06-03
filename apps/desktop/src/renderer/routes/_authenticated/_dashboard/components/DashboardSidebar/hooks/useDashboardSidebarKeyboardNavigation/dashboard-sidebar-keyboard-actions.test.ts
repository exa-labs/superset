import { describe, expect, test } from "bun:test";
import {
	type DashboardSidebarKeyboardAction,
	dashboardSidebarKeyboardActionFromKey,
	dashboardSidebarKeyboardActionSelector,
} from "./dashboard-sidebar-keyboard-actions";

describe("dashboardSidebarKeyboardActionFromKey", () => {
	const cases: Array<[string, DashboardSidebarKeyboardAction]> = [
		["n", "create"],
		["p", "pin"],
		["a", "archive"],
		["x", "archive"],
		["e", "rename"],
		["j", "none"],
		["Enter", "none"],
	];

	test.each(cases)("%s maps to %s", (key, expected) => {
		expect(dashboardSidebarKeyboardActionFromKey(key)).toBe(expected);
	});
});

describe("dashboardSidebarKeyboardActionSelector", () => {
	test("targets row-scoped action buttons", () => {
		expect(dashboardSidebarKeyboardActionSelector("archive")).toBe(
			'[data-dashboard-sidebar-action="archive"]',
		);
	});
});
