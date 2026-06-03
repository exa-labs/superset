import { describe, expect, test } from "bun:test";
import {
	type DashboardSidebarKeyboardAction,
	dashboardSidebarActivationActionFromKey,
	dashboardSidebarKeyboardActionFromKey,
	dashboardSidebarKeyboardActionSelector,
	dashboardSidebarRovingNavigationDeltaFromKey,
	dashboardSidebarTypeaheadSeedFromKey,
} from "./dashboard-sidebar-keyboard-actions";
import {
	dashboardSidebarExpansionValue,
	findDashboardSidebarActionButton,
	findDashboardSidebarActivationTarget,
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
		[".", "menu"],
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
		expect(dashboardSidebarKeyboardActionSelector("menu")).toBe(
			'[data-dashboard-sidebar-action="menu"]',
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

describe("dashboardSidebarRovingNavigationDeltaFromKey", () => {
	test("maps arrows and j/k to sidebar roving deltas", () => {
		expect(dashboardSidebarRovingNavigationDeltaFromKey("ArrowDown")).toBe(1);
		expect(dashboardSidebarRovingNavigationDeltaFromKey("j")).toBe(1);
		expect(dashboardSidebarRovingNavigationDeltaFromKey("ArrowUp")).toBe(-1);
		expect(dashboardSidebarRovingNavigationDeltaFromKey("k")).toBe(-1);
		expect(dashboardSidebarRovingNavigationDeltaFromKey("J")).toBe(0);
		expect(dashboardSidebarRovingNavigationDeltaFromKey("x")).toBe(0);
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
		for (const key of [".", "c", "d", "j", "k", "n", "p"]) {
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

	test("skips folder action buttons during roving navigation", () => {
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

		const create = document.createElement("button");
		create.dataset.dashboardSidebarAction = "create";
		create.id = "create";
		makeVisible(create);

		const deleteButton = document.createElement("button");
		deleteButton.dataset.dashboardSidebarAction = "delete";
		deleteButton.id = "delete";
		makeVisible(deleteButton);

		const menu = document.createElement("button");
		menu.dataset.dashboardSidebarAction = "menu";
		menu.id = "menu";
		makeVisible(menu);

		folderScope.append(folder, menu, create, color, deleteButton);
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
				dashboardSidebarKeyboardActionSelector("create"),
			),
		).toBe(create);
		expect(
			folderScope.querySelector(
				dashboardSidebarKeyboardActionSelector("delete"),
			),
		).toBe(deleteButton);
		expect(
			folderScope.querySelector(dashboardSidebarKeyboardActionSelector("menu")),
		).toBe(menu);
	});
});

describe("findDashboardSidebarActionButton", () => {
	test("resolves hidden native session action buttons from the focused session row", () => {
		if (typeof document === "undefined") return;

		const rowScope = document.createElement("div");
		rowScope.dataset.dashboardSidebarActionScope = "";

		const session = document.createElement("button");
		session.dataset.nativeAgentSessionRowId = "devin-1";
		makeVisible(session);

		const reply = document.createElement("button");
		reply.dataset.dashboardSidebarAction = "reply";

		const rename = document.createElement("button");
		rename.dataset.dashboardSidebarAction = "rename";

		rowScope.append(session, reply, rename);

		expect(findDashboardSidebarActionButton(session, "reply")).toBe(reply);
		expect(findDashboardSidebarActionButton(session, "rename")).toBe(rename);
	});

	test("resolves Chrome tab row action buttons from the focused tab row", () => {
		if (typeof document === "undefined") return;

		const rowScope = document.createElement("div");
		rowScope.dataset.dashboardSidebarActionScope = "";

		const tab = document.createElement("button");
		tab.dataset.dashboardWebTabRowButton = "chrome-1";
		makeVisible(tab);

		const menu = document.createElement("button");
		menu.dataset.dashboardSidebarAction = "menu";
		makeVisible(menu);

		const pin = document.createElement("button");
		pin.dataset.dashboardSidebarAction = "pin";
		makeVisible(pin);

		const rename = document.createElement("button");
		rename.dataset.dashboardSidebarAction = "rename";
		makeVisible(rename);

		const archive = document.createElement("button");
		archive.dataset.dashboardSidebarAction = "archive";
		makeVisible(archive);

		rowScope.append(tab, menu, pin, rename, archive);

		expect(findDashboardSidebarActionButton(tab, "menu")).toBe(menu);
		expect(findDashboardSidebarActionButton(tab, "pin")).toBe(pin);
		expect(findDashboardSidebarActionButton(tab, "rename")).toBe(rename);
		expect(findDashboardSidebarActionButton(tab, "archive")).toBe(archive);
	});

	test("resolves Chrome app group menu and create actions from the focused app row", () => {
		if (typeof document === "undefined") return;

		const groupScope = document.createElement("div");
		groupScope.dataset.dashboardSidebarActionScope = "";

		const chrome = document.createElement("button");
		chrome.dataset.dashboardWebAppTrigger = "chrome";
		makeVisible(chrome);

		const menu = document.createElement("button");
		menu.dataset.dashboardSidebarAction = "menu";
		makeVisible(menu);

		const create = document.createElement("button");
		create.dataset.dashboardSidebarAction = "create";
		makeVisible(create);

		groupScope.append(chrome, menu, create);

		expect(findDashboardSidebarActionButton(chrome, "menu")).toBe(menu);
		expect(findDashboardSidebarActionButton(chrome, "create")).toBe(create);
	});

	test("resolves folder action buttons from the focused folder row", () => {
		if (typeof document === "undefined") return;

		const folderScope = document.createElement("div");
		folderScope.dataset.dashboardSidebarActionScope = "";

		const folder = document.createElement("button");
		folder.dataset.nativeAgentFolderRowId = "folder-1";
		makeVisible(folder);

		const color = document.createElement("button");
		color.dataset.dashboardSidebarAction = "color";
		makeVisible(color);

		const deleteButton = document.createElement("button");
		deleteButton.dataset.dashboardSidebarAction = "delete";
		makeVisible(deleteButton);

		folderScope.append(folder, color, deleteButton);

		expect(findDashboardSidebarActionButton(folder, "color")).toBe(color);
		expect(findDashboardSidebarActionButton(folder, "delete")).toBe(
			deleteButton,
		);
	});

	test("does not escape the active row action scope", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const firstScope = document.createElement("div");
		firstScope.dataset.dashboardSidebarActionScope = "";
		const secondScope = document.createElement("div");
		secondScope.dataset.dashboardSidebarActionScope = "";

		const firstFolder = document.createElement("button");
		firstFolder.dataset.nativeAgentFolderRowId = "folder-1";
		makeVisible(firstFolder);

		const secondFolder = document.createElement("button");
		secondFolder.dataset.nativeAgentFolderRowId = "folder-2";
		makeVisible(secondFolder);

		const secondDelete = document.createElement("button");
		secondDelete.dataset.dashboardSidebarAction = "delete";
		makeVisible(secondDelete);

		firstScope.append(firstFolder);
		secondScope.append(secondFolder, secondDelete);
		root.append(firstScope, secondScope);

		expect(findDashboardSidebarActionButton(firstFolder, "delete")).toBeNull();
		expect(findDashboardSidebarActionButton(secondFolder, "delete")).toBe(
			secondDelete,
		);
	});
});

describe("findDashboardSidebarActivationTarget", () => {
	test("keeps Enter on the focused row", () => {
		if (typeof document === "undefined") return;

		const scope = document.createElement("div");
		scope.dataset.dashboardSidebarActionScope = "";
		const row = document.createElement("button");
		makeVisible(row);
		const countToggle = document.createElement("button");
		countToggle.setAttribute("aria-expanded", "false");
		makeVisible(countToggle);
		scope.append(row, countToggle);

		expect(findDashboardSidebarActivationTarget(row, "Enter")).toBe(row);
	});

	test("uses Space to toggle a row-scoped expansion control", () => {
		if (typeof document === "undefined") return;

		const scope = document.createElement("div");
		scope.dataset.dashboardSidebarActionScope = "";
		const row = document.createElement("button");
		makeVisible(row);
		const countToggle = document.createElement("button");
		countToggle.setAttribute("aria-expanded", "false");
		makeVisible(countToggle);
		scope.append(row, countToggle);

		expect(findDashboardSidebarActivationTarget(row, " ")).toBe(countToggle);
	});

	test("falls back to the focused row for Space when no expansion target exists", () => {
		if (typeof document === "undefined") return;

		const row = document.createElement("button");
		makeVisible(row);

		expect(findDashboardSidebarActivationTarget(row, " ")).toBe(row);
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
