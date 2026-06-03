import { describe, expect, test } from "bun:test";
import {
	type DashboardSidebarKeyboardAction,
	dashboardSidebarActivationActionFromKey,
	dashboardSidebarKeyboardActionFromKey,
	dashboardSidebarKeyboardActionSelector,
	dashboardSidebarTypeaheadSeedFromKey,
} from "./dashboard-sidebar-keyboard-actions";

describe("dashboardSidebarKeyboardActionFromKey", () => {
	const cases: Array<[string, DashboardSidebarKeyboardAction]> = [
		["n", "create"],
		["p", "pin"],
		["r", "reply"],
		["o", "open-browser"],
		["b", "toggle-browser"],
		["m", "move"],
		["F", "remove-from-folder"],
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

describe("dashboardSidebarActivationActionFromKey", () => {
	test("maps Enter and Space to generic sidebar activation", () => {
		expect(dashboardSidebarActivationActionFromKey("Enter")).toBe("activate");
		expect(dashboardSidebarActivationActionFromKey(" ")).toBe("activate");
		expect(dashboardSidebarActivationActionFromKey("j")).toBe("none");
	});
});

describe("dashboardSidebarTypeaheadSeedFromKey", () => {
	test("starts sidebar typeahead for printable keys in normal keyboard mode", () => {
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "d",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBe("d");
	});

	test("preserves Vim command keys and modified shortcuts", () => {
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "d",
				metaKey: false,
				vimModeEnabled: true,
			}),
		).toBeNull();
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: true,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "d",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBeNull();
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "r",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBeNull();
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "o",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBeNull();
	});

	test("does not steal sidebar action keys", () => {
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "n",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBeNull();
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "p",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBeNull();
	});

	test("ignores non-printable keys and focus outside the sidebar", () => {
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: true,
				key: "ArrowDown",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBeNull();
		expect(
			dashboardSidebarTypeaheadSeedFromKey({
				altKey: false,
				ctrlKey: false,
				focusInsideSidebar: false,
				key: "d",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBeNull();
	});
});
