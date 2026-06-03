import { describe, expect, test } from "bun:test";
import {
	type DashboardSidebarKeyboardAction,
	dashboardSidebarActivationActionFromKey,
	dashboardSidebarKeyboardActionFromKey,
	dashboardSidebarKeyboardActionSelector,
	dashboardSidebarTypeaheadSeedFromKey,
} from "./dashboard-sidebar-keyboard-actions";
import {
	dashboardSidebarExpansionValue,
	findDashboardSidebarExpansionTarget,
	getDashboardSidebarFocusableItems,
	shouldToggleDashboardSidebarExpansion,
} from "./useDashboardSidebarKeyboardNavigation";

function makeVisible(element: HTMLElement): void {
	element.getBoundingClientRect = () =>
		({
			bottom: 24,
			height: 24,
			left: 0,
			right: 120,
			top: 0,
			width: 120,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		}) as DOMRect;
}

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
		["c", "color"],
		["d", "delete"],
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
		expect(dashboardSidebarKeyboardActionSelector("color")).toBe(
			'[data-dashboard-sidebar-action="color"]',
		);
		expect(dashboardSidebarKeyboardActionSelector("delete")).toBe(
			'[data-dashboard-sidebar-action="delete"]',
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
				key: "q",
				metaKey: false,
				vimModeEnabled: false,
			}),
		).toBe("q");
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
		for (const key of ["c", "d", "n", "p"]) {
			expect(
				dashboardSidebarTypeaheadSeedFromKey({
					altKey: false,
					ctrlKey: false,
					focusInsideSidebar: true,
					key,
					metaKey: false,
					vimModeEnabled: false,
				}),
			).toBeNull();
		}
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

describe("getDashboardSidebarFocusableItems", () => {
	test("includes primary rows and ordinary controls while skipping nested hover actions", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const project = document.createElement("div");
		project.dataset.dashboardSidebarRovingItem = "true";
		project.dataset.dashboardSidebarActionScope = "";
		project.tabIndex = 0;
		project.id = "project";
		makeVisible(project);

		const projectCreate = document.createElement("button");
		projectCreate.dataset.dashboardSidebarAction = "create";
		projectCreate.id = "project-create";
		makeVisible(projectCreate);
		project.append(projectCreate);

		const webApp = document.createElement("button");
		webApp.dataset.dashboardWebAppTrigger = "chrome";
		webApp.id = "chrome";
		makeVisible(webApp);

		const webAppCreate = document.createElement("button");
		webAppCreate.dataset.dashboardSidebarAction = "create";
		webAppCreate.id = "chrome-create";
		makeVisible(webAppCreate);

		const session = document.createElement("button");
		session.dataset.nativeAgentSessionRowId = "devin-1";
		session.id = "session";
		makeVisible(session);

		const pin = document.createElement("button");
		pin.dataset.dashboardSidebarAction = "pin";
		pin.id = "pin";
		makeVisible(pin);

		const settings = document.createElement("button");
		settings.id = "settings";
		makeVisible(settings);

		root.append(project, webApp, webAppCreate, session, pin, settings);

		expect(
			getDashboardSidebarFocusableItems(root).map((element) => element.id),
		).toEqual(["project", "chrome", "session", "settings"]);
	});

	test("falls back to normal controls while excluding scoped action buttons", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const row = document.createElement("div");
		row.dataset.dashboardSidebarActionScope = "";
		row.tabIndex = 0;
		row.id = "row";
		makeVisible(row);

		const action = document.createElement("button");
		action.dataset.dashboardSidebarAction = "archive";
		action.id = "archive";
		makeVisible(action);
		row.append(action);

		const footer = document.createElement("button");
		footer.id = "footer";
		makeVisible(footer);

		root.append(row, footer);

		expect(
			getDashboardSidebarFocusableItems(root).map((element) => element.id),
		).toEqual(["row", "footer"]);
	});

	test("keeps primary row buttons inside action scopes but skips their actions", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const rowScope = document.createElement("li");
		rowScope.dataset.dashboardSidebarActionScope = "";

		const session = document.createElement("button");
		session.dataset.nativeAgentSessionRowId = "devin-1";
		session.id = "session";
		makeVisible(session);

		const pin = document.createElement("button");
		pin.dataset.dashboardSidebarAction = "pin";
		pin.id = "pin";
		makeVisible(pin);

		rowScope.append(session, pin);
		root.append(rowScope);

		expect(
			getDashboardSidebarFocusableItems(root).map((element) => element.id),
		).toEqual(["session"]);
	});

	test("skips folder color and delete buttons during roving navigation", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const folderScope = document.createElement("div");
		folderScope.dataset.dashboardSidebarActionScope = "";

		const folder = document.createElement("button");
		folder.dataset.nativeAgentFolderRowId = "folder-1";
		folder.id = "folder";
		makeVisible(folder);

		const color = document.createElement("button");
		color.dataset.dashboardSidebarAction = "color";
		color.id = "color";
		makeVisible(color);

		const deleteButton = document.createElement("button");
		deleteButton.dataset.dashboardSidebarAction = "delete";
		deleteButton.id = "delete";
		makeVisible(deleteButton);

		folderScope.append(folder, color, deleteButton);
		root.append(folderScope);

		expect(
			getDashboardSidebarFocusableItems(root).map((element) => element.id),
		).toEqual(["folder"]);
		expect(
			folderScope.querySelector(
				dashboardSidebarKeyboardActionSelector("color"),
			),
		).toBe(color);
		expect(
			folderScope.querySelector(
				dashboardSidebarKeyboardActionSelector("delete"),
			),
		).toBe(deleteButton);
	});
});

describe("findDashboardSidebarExpansionTarget", () => {
	test("uses the focused item when it exposes aria-expanded directly", () => {
		if (typeof document === "undefined") return;

		const row = document.createElement("button");
		row.setAttribute("aria-expanded", "false");
		makeVisible(row);

		expect(findDashboardSidebarExpansionTarget(row)).toBe(row);
	});

	test("uses the focused item when it exposes sidebar expansion data", () => {
		if (typeof document === "undefined") return;

		const row = document.createElement("div");
		row.dataset.dashboardSidebarExpanded = "true";
		makeVisible(row);

		expect(findDashboardSidebarExpansionTarget(row)).toBe(row);
		expect(dashboardSidebarExpansionValue(row)).toBe("true");
	});

	test("uses a row-scoped expansion control when focus is on the label row", () => {
		if (typeof document === "undefined") return;

		const scope = document.createElement("div");
		scope.dataset.dashboardSidebarActionScope = "";
		const row = document.createElement("button");
		row.id = "row";
		makeVisible(row);
		const countToggle = document.createElement("button");
		countToggle.id = "count";
		countToggle.setAttribute("aria-expanded", "true");
		makeVisible(countToggle);

		scope.append(row, countToggle);

		expect(findDashboardSidebarExpansionTarget(row)).toBe(countToggle);
	});
});

describe("shouldToggleDashboardSidebarExpansion", () => {
	test("maps h to collapse and l to expand", () => {
		expect(
			shouldToggleDashboardSidebarExpansion({
				expanded: "true",
				key: "h",
			}),
		).toBe(true);
		expect(
			shouldToggleDashboardSidebarExpansion({
				expanded: "false",
				key: "l",
			}),
		).toBe(true);
		expect(
			shouldToggleDashboardSidebarExpansion({
				expanded: "false",
				key: "h",
			}),
		).toBe(false);
		expect(
			shouldToggleDashboardSidebarExpansion({
				expanded: "true",
				key: "l",
			}),
		).toBe(false);
		expect(
			shouldToggleDashboardSidebarExpansion({
				expanded: null,
				key: "l",
			}),
		).toBe(false);
	});
});
