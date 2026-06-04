import { describe, expect, test } from "bun:test";
import {
	type DashboardSidebarKeyboardAction,
	dashboardSidebarActivationActionFromKey,
	dashboardSidebarExpansionIntentFromKey,
	dashboardSidebarKeyboardActionFromKey,
	dashboardSidebarKeyboardActionSelector,
	dashboardSidebarLocalCommandFromKey,
	dashboardSidebarLocalKeyAllowsModifiers,
	dashboardSidebarNextRovingIndex,
	dashboardSidebarRovingNavigationBoundaryFromKey,
	dashboardSidebarRovingNavigationDeltaFromKey,
	dashboardSidebarTypeaheadQueryFromSeed,
	dashboardSidebarTypeaheadSeedFromKey,
	dashboardSidebarVimJumpFromKey,
	isDashboardSidebarSpaceKey,
} from "./dashboard-sidebar-keyboard-actions";
import {
	DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE,
	dashboardSidebarExpansionValue,
	dashboardSidebarKeyboardFocusIndex,
	findDashboardSidebarActionButton,
	findDashboardSidebarActivationTarget,
	findDashboardSidebarExpansionTarget,
	findDashboardSidebarTypeaheadMatch,
	focusDashboardSidebarItem,
	focusFirstDashboardSidebarItem,
	getDashboardSidebarFocusableItems,
	runDashboardSidebarKeyboardCommand,
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
		["N", "create-folder"],
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
		expect(dashboardSidebarKeyboardActionSelector("create-folder")).toBe(
			'[data-dashboard-sidebar-action="create-folder"]',
		);
		expect(dashboardSidebarKeyboardActionSelector("menu")).toBe(
			'[data-dashboard-sidebar-action="menu"]',
		);
		expect(dashboardSidebarKeyboardActionSelector("rename")).toBe(
			'[data-dashboard-sidebar-action="rename"]',
		);
	});
});

describe("dashboardSidebarActivationActionFromKey", () => {
	test("maps Enter to activation and Space variants to expansion toggle", () => {
		expect(dashboardSidebarActivationActionFromKey("Enter")).toBe("activate");
		expect(dashboardSidebarActivationActionFromKey(" ")).toBe(
			"toggle-expansion",
		);
		expect(dashboardSidebarActivationActionFromKey("Space")).toBe(
			"toggle-expansion",
		);
		expect(dashboardSidebarActivationActionFromKey("Spacebar")).toBe(
			"toggle-expansion",
		);
		expect(dashboardSidebarActivationActionFromKey("j")).toBe("none");
	});
});

describe("isDashboardSidebarSpaceKey", () => {
	test("accepts modern and legacy Space key strings", () => {
		expect(isDashboardSidebarSpaceKey(" ")).toBe(true);
		expect(isDashboardSidebarSpaceKey("Space")).toBe(true);
		expect(isDashboardSidebarSpaceKey("Spacebar")).toBe(true);
		expect(isDashboardSidebarSpaceKey("Enter")).toBe(false);
	});
});

describe("dashboardSidebarLocalKeyAllowsModifiers", () => {
	test("lets unmodified local sidebar keys through", () => {
		expect(
			dashboardSidebarLocalKeyAllowsModifiers({
				altKey: false,
				ctrlKey: false,
				metaKey: false,
			}),
		).toBe(true);
	});

	test("blocks platform command modifiers so global shortcuts always win", () => {
		for (const modifiers of [
			{ altKey: true, ctrlKey: false, metaKey: false },
			{ altKey: false, ctrlKey: true, metaKey: false },
			{ altKey: false, ctrlKey: false, metaKey: true },
			{ altKey: true, ctrlKey: true, metaKey: false },
		]) {
			expect(dashboardSidebarLocalKeyAllowsModifiers(modifiers)).toBe(false);
		}
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

describe("dashboardSidebarRovingNavigationBoundaryFromKey", () => {
	test("maps Home and End to sidebar roving boundaries", () => {
		expect(dashboardSidebarRovingNavigationBoundaryFromKey("Home")).toBe(
			"first",
		);
		expect(dashboardSidebarRovingNavigationBoundaryFromKey("End")).toBe("last");
		expect(dashboardSidebarRovingNavigationBoundaryFromKey("ArrowDown")).toBe(
			null,
		);
	});
});

describe("dashboardSidebarExpansionIntentFromKey", () => {
	test("maps h/l to sidebar collapse and expand intents", () => {
		expect(dashboardSidebarExpansionIntentFromKey("h")).toBe("collapse");
		expect(dashboardSidebarExpansionIntentFromKey("l")).toBe("expand");
		expect(dashboardSidebarExpansionIntentFromKey("H")).toBe("none");
		expect(dashboardSidebarExpansionIntentFromKey("ArrowLeft")).toBe("none");
	});
});

describe("dashboardSidebarLocalCommandFromKey", () => {
	test("maps local visible sidebar hints to shell commands", () => {
		expect(dashboardSidebarLocalCommandFromKey("/")).toBe("focus-search");
		expect(dashboardSidebarLocalCommandFromKey("?")).toBe("show-help");
		expect(dashboardSidebarLocalCommandFromKey("d")).toBe("none");
	});
});

describe("dashboardSidebarNextRovingIndex", () => {
	test("starts forward navigation on the first row when no row is focused", () => {
		expect(
			dashboardSidebarNextRovingIndex({
				activeIndex: -1,
				delta: 1,
				itemCount: 4,
			}),
		).toBe(0);
	});

	test("starts backward navigation on the last row when no row is focused", () => {
		expect(
			dashboardSidebarNextRovingIndex({
				activeIndex: -1,
				delta: -1,
				itemCount: 4,
			}),
		).toBe(3);
	});

	test("wraps from focused rows", () => {
		expect(
			dashboardSidebarNextRovingIndex({
				activeIndex: 3,
				delta: 1,
				itemCount: 4,
			}),
		).toBe(0);
		expect(
			dashboardSidebarNextRovingIndex({
				activeIndex: 0,
				delta: -1,
				itemCount: 4,
			}),
		).toBe(3);
	});

	test("returns -1 when there are no rows", () => {
		expect(
			dashboardSidebarNextRovingIndex({
				activeIndex: -1,
				delta: 1,
				itemCount: 0,
			}),
		).toBe(-1);
	});
});

describe("dashboardSidebarVimJumpFromKey", () => {
	test("maps G and double-g to bottom and top sidebar jumps", () => {
		expect(
			dashboardSidebarVimJumpFromKey({
				key: "G",
				lastGAt: 1000,
				now: 1200,
			}),
		).toEqual({
			action: "last",
			handled: true,
			nextLastGAt: 0,
		});
		expect(
			dashboardSidebarVimJumpFromKey({
				key: "g",
				lastGAt: 0,
				now: 1000,
			}),
		).toEqual({
			action: "none",
			handled: true,
			nextLastGAt: 1000,
		});
		expect(
			dashboardSidebarVimJumpFromKey({
				key: "g",
				lastGAt: 1000,
				now: 1200,
			}),
		).toEqual({
			action: "first",
			handled: true,
			nextLastGAt: 0,
		});
		expect(
			dashboardSidebarVimJumpFromKey({
				key: "g",
				lastGAt: 1000,
				now: 1600,
			}),
		).toEqual({
			action: "none",
			handled: true,
			nextLastGAt: 1600,
		});
		expect(
			dashboardSidebarVimJumpFromKey({
				key: "j",
				lastGAt: 1000,
				now: 1200,
			}),
		).toEqual({
			action: "none",
			handled: false,
			nextLastGAt: 1000,
		});
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
		for (const key of [
			".",
			"/",
			"?",
			"N",
			"c",
			"d",
			"h",
			"j",
			"k",
			"l",
			"n",
			"p",
		]) {
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

describe("dashboardSidebarTypeaheadQueryFromSeed", () => {
	test("builds a short buffered query while typing quickly", () => {
		expect(
			dashboardSidebarTypeaheadQueryFromSeed({
				currentQuery: "de",
				lastAt: 1000,
				now: 1200,
				seed: "v",
			}),
		).toBe("dev");
	});

	test("starts a fresh query after the typeahead window expires", () => {
		expect(
			dashboardSidebarTypeaheadQueryFromSeed({
				currentQuery: "de",
				lastAt: 1000,
				now: 1900,
				seed: "c",
			}),
		).toBe("c");
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

describe("findDashboardSidebarTypeaheadMatch", () => {
	test("finds matching sidebar rows by visible text, label, or title", () => {
		if (typeof document === "undefined") return;

		const chrome = document.createElement("button");
		chrome.textContent = "Chrome";
		makeVisible(chrome);
		const capy = document.createElement("button");
		capy.setAttribute("aria-label", "Capy active sessions");
		makeVisible(capy);
		const devin = document.createElement("button");
		devin.title = "Devin Sessions";
		makeVisible(devin);

		expect(
			findDashboardSidebarTypeaheadMatch({
				activeIndex: -1,
				items: [chrome, capy, devin],
				query: "dev",
			}),
		).toBe(devin);
		expect(
			findDashboardSidebarTypeaheadMatch({
				activeIndex: -1,
				items: [chrome, capy, devin],
				query: "active",
			}),
		).toBe(capy);
	});

	test("prefers explicit typeahead labels over noisy title and text content", () => {
		if (typeof document === "undefined") return;

		const session = document.createElement("button");
		session.setAttribute(
			"data-dashboard-sidebar-typeahead-label",
			"Devin QES dashboard",
		);
		session.title = "Tooltip text with hidden metadata and stale shortcuts";
		session.textContent = "visible clipped title";
		makeVisible(session);

		expect(
			findDashboardSidebarTypeaheadMatch({
				activeIndex: -1,
				items: [session],
				query: "dev",
			}),
		).toBe(session);
		expect(
			findDashboardSidebarTypeaheadMatch({
				activeIndex: -1,
				items: [session],
				query: "metadata",
			}),
		).toBeNull();
	});

	test("wraps from the focused row when cycling a single-character query", () => {
		if (typeof document === "undefined") return;

		const first = document.createElement("button");
		first.textContent = "Capy";
		makeVisible(first);
		const second = document.createElement("button");
		second.textContent = "Canonical";
		makeVisible(second);
		const third = document.createElement("button");
		third.textContent = "Devin";
		makeVisible(third);

		expect(
			findDashboardSidebarTypeaheadMatch({
				activeIndex: 0,
				items: [first, second, third],
				query: "c",
			}),
		).toBe(second);
		expect(
			findDashboardSidebarTypeaheadMatch({
				activeIndex: 1,
				items: [first, second, third],
				query: "c",
			}),
		).toBe(first);
	});

	test("keeps the focused row when it still matches a multi-character query", () => {
		if (typeof document === "undefined") return;

		const capy = document.createElement("button");
		capy.textContent = "Capy";
		makeVisible(capy);
		const devin = document.createElement("button");
		devin.textContent = "Devin";
		makeVisible(devin);

		expect(
			findDashboardSidebarTypeaheadMatch({
				activeIndex: 1,
				items: [capy, devin],
				query: "de",
			}),
		).toBe(devin);
	});
});

describe("focusFirstDashboardSidebarItem", () => {
	test("focuses the first real sidebar navigation item", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const action = document.createElement("button");
		action.dataset.dashboardSidebarAction = "create";
		action.id = "action";
		makeVisible(action);

		const first = document.createElement("button");
		first.dataset.dashboardWebAppTrigger = "chrome";
		first.id = "first";
		makeVisible(first);

		const second = document.createElement("button");
		second.dataset.nativeAgentSessionRowId = "devin-1";
		second.id = "second";
		makeVisible(second);

		root.append(action, first, second);
		document.body.append(root);
		try {
			expect(focusFirstDashboardSidebarItem(root)).toBe(first);
			expect(document.activeElement).toBe(first);
			expect(
				first.getAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE),
			).toBe("true");
		} finally {
			root.remove();
		}
	});

	test("returns null when no sidebar navigation item is available", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		expect(focusFirstDashboardSidebarItem(root)).toBeNull();
	});

	test("keeps one explicit keyboard focus marker as roving focus moves", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		root.dataset.dashboardSidebarRoot = "true";
		const first = document.createElement("button");
		first.id = "first";
		makeVisible(first);
		const second = document.createElement("button");
		second.id = "second";
		makeVisible(second);
		root.append(first, second);
		document.body.append(root);
		try {
			focusDashboardSidebarItem(first);
			expect(
				first.getAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE),
			).toBe("true");

			focusDashboardSidebarItem(second);

			expect(
				first.getAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE),
			).toBeNull();
			expect(
				second.getAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE),
			).toBe("true");
			expect(document.activeElement).toBe(second);
		} finally {
			root.remove();
		}
	});
});

describe("runDashboardSidebarKeyboardCommand", () => {
	test("moves sidebar focus through visible rows from a preserved row marker", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		root.dataset.dashboardSidebarRoot = "true";
		const first = document.createElement("button");
		first.id = "first";
		first.dataset.dashboardWebAppTrigger = "chrome";
		makeVisible(first);
		const second = document.createElement("button");
		second.id = "second";
		second.dataset.nativeAgentSessionRowId = "devin-1";
		makeVisible(second);
		const third = document.createElement("button");
		third.id = "third";
		third.dataset.nativeAgentSessionRowId = "devin-2";
		makeVisible(third);
		second.setAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE, "true");
		root.append(first, second, third);
		document.body.append(root);

		try {
			expect(
				runDashboardSidebarKeyboardCommand({
					activeElement: document.body,
					command: "focus-next",
					root,
				}),
			).toBe(true);
			expect(document.activeElement).toBe(third);
			expect(
				runDashboardSidebarKeyboardCommand({
					activeElement: document.activeElement,
					command: "focus-previous",
					root,
				}),
			).toBe(true);
			expect(document.activeElement).toBe(second);
		} finally {
			root.remove();
		}
	});

	test("jumps to the top and bottom sidebar rows", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const first = document.createElement("button");
		first.dataset.dashboardWebAppTrigger = "chrome";
		makeVisible(first);
		const second = document.createElement("button");
		second.dataset.nativeAgentSessionRowId = "capy-1";
		makeVisible(second);
		root.append(first, second);
		document.body.append(root);

		try {
			expect(
				runDashboardSidebarKeyboardCommand({
					command: "focus-last",
					root,
				}),
			).toBe(true);
			expect(document.activeElement).toBe(second);
			expect(
				runDashboardSidebarKeyboardCommand({
					command: "focus-first",
					root,
				}),
			).toBe(true);
			expect(document.activeElement).toBe(first);
		} finally {
			root.remove();
		}
	});

	test("activates the focused row and toggles row-scoped expansion", () => {
		if (typeof document === "undefined") return;

		let rowClicks = 0;
		let expansionClicks = 0;
		const root = document.createElement("div");
		root.dataset.dashboardSidebarRoot = "true";
		const scope = document.createElement("div");
		scope.dataset.dashboardSidebarActionScope = "";
		const row = document.createElement("button");
		row.dataset.nativeAgentFolderRowId = "folder-1";
		row.onclick = () => {
			rowClicks += 1;
		};
		makeVisible(row);
		const expansion = document.createElement("button");
		expansion.setAttribute("aria-expanded", "false");
		expansion.onclick = () => {
			expansionClicks += 1;
		};
		makeVisible(expansion);
		scope.append(row, expansion);
		root.append(scope);
		document.body.append(root);

		try {
			focusDashboardSidebarItem(row);
			expect(
				runDashboardSidebarKeyboardCommand({
					command: "activate",
					root,
				}),
			).toBe(true);
			expect(rowClicks).toBe(1);
			expect(expansionClicks).toBe(0);
			expect(
				runDashboardSidebarKeyboardCommand({
					command: "toggle-expansion",
					root,
				}),
			).toBe(true);
			expect(rowClicks).toBe(1);
			expect(expansionClicks).toBe(1);
		} finally {
			root.remove();
		}
	});

	test("does not open a non-expandable row when toggling expansion", () => {
		if (typeof document === "undefined") return;

		let rowClicks = 0;
		const root = document.createElement("div");
		root.dataset.dashboardSidebarRoot = "true";
		const row = document.createElement("button");
		row.dataset.nativeAgentSessionRowId = "devin-1";
		row.onclick = () => {
			rowClicks += 1;
		};
		makeVisible(row);
		root.append(row);
		document.body.append(root);

		try {
			focusDashboardSidebarItem(row);
			expect(
				runDashboardSidebarKeyboardCommand({
					command: "toggle-expansion",
					root,
				}),
			).toBe(false);
			expect(rowClicks).toBe(0);
		} finally {
			root.remove();
		}
	});

	test("runs row-scoped action commands from the preserved sidebar row", () => {
		if (typeof document === "undefined") return;

		let replyClicks = 0;
		let moveClicks = 0;
		const root = document.createElement("div");
		root.dataset.dashboardSidebarRoot = "true";
		const scope = document.createElement("div");
		scope.dataset.dashboardSidebarActionScope = "";
		const session = document.createElement("button");
		session.dataset.nativeAgentSessionRowId = "devin-1";
		session.setAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE, "true");
		makeVisible(session);
		const reply = document.createElement("button");
		reply.dataset.dashboardSidebarAction = "reply";
		reply.onclick = () => {
			replyClicks += 1;
		};
		makeVisible(reply);
		const move = document.createElement("button");
		move.dataset.dashboardSidebarAction = "move";
		move.onclick = () => {
			moveClicks += 1;
		};
		makeVisible(move);
		scope.append(session, reply, move);
		root.append(scope);
		document.body.append(root);

		try {
			expect(
				runDashboardSidebarKeyboardCommand({
					activeElement: document.body,
					command: "action-reply",
					root,
				}),
			).toBe(true);
			expect(replyClicks).toBe(1);
			expect(moveClicks).toBe(0);
			expect(
				runDashboardSidebarKeyboardCommand({
					activeElement: document.body,
					command: "action-move",
					root,
				}),
			).toBe(true);
			expect(replyClicks).toBe(1);
			expect(moveClicks).toBe(1);
		} finally {
			root.remove();
		}
	});
});

describe("dashboardSidebarKeyboardFocusIndex", () => {
	test("uses the active DOM row when focus is inside the sidebar", () => {
		if (typeof document === "undefined") return;

		const first = document.createElement("button");
		const second = document.createElement("button");
		makeVisible(first);
		makeVisible(second);

		expect(
			dashboardSidebarKeyboardFocusIndex({
				activeElement: second,
				focusInsideSidebar: true,
				items: [first, second],
				root: document.createElement("div"),
			}),
		).toBe(1);
	});

	test("falls back to the preserved sidebar keyboard row when focus is outside", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const first = document.createElement("button");
		const second = document.createElement("button");
		makeVisible(first);
		makeVisible(second);
		second.setAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE, "true");
		root.append(first, second);

		expect(
			dashboardSidebarKeyboardFocusIndex({
				activeElement: document.createElement("button"),
				focusInsideSidebar: false,
				items: [first, second],
				root,
			}),
		).toBe(1);
	});

	test("ignores stale preserved focus markers outside the visible row set", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		const visible = document.createElement("button");
		const stale = document.createElement("button");
		makeVisible(visible);
		makeVisible(stale);
		stale.setAttribute(DASHBOARD_SIDEBAR_KEYBOARD_FOCUS_ATTRIBUTE, "true");
		root.append(visible, stale);

		expect(
			dashboardSidebarKeyboardFocusIndex({
				activeElement: document.createElement("button"),
				focusInsideSidebar: false,
				items: [visible],
				root,
			}),
		).toBe(-1);
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

		const createFolder = document.createElement("button");
		createFolder.dataset.dashboardSidebarAction = "create-folder";
		makeVisible(createFolder);

		groupScope.append(chrome, menu, create, createFolder);

		expect(findDashboardSidebarActionButton(chrome, "menu")).toBe(menu);
		expect(findDashboardSidebarActionButton(chrome, "create")).toBe(create);
		expect(findDashboardSidebarActionButton(chrome, "create-folder")).toBe(
			createFolder,
		);
	});

	test("resolves workspace row menu and management actions from the focused workspace row", () => {
		if (typeof document === "undefined") return;

		const workspaceScope = document.createElement("div");
		workspaceScope.dataset.dashboardSidebarActionScope = "";

		const workspace = document.createElement("div");
		workspace.dataset.dashboardSidebarRovingItem = "true";
		makeVisible(workspace);

		const menu = document.createElement("button");
		menu.dataset.dashboardSidebarAction = "menu";
		makeVisible(menu);

		const createFolder = document.createElement("button");
		createFolder.dataset.dashboardSidebarAction = "create-folder";
		makeVisible(createFolder);

		const move = document.createElement("button");
		move.dataset.dashboardSidebarAction = "move";
		makeVisible(move);

		const removeFromFolder = document.createElement("button");
		removeFromFolder.dataset.dashboardSidebarAction = "remove-from-folder";
		makeVisible(removeFromFolder);

		const archive = document.createElement("button");
		archive.dataset.dashboardSidebarAction = "archive";
		makeVisible(archive);

		const rename = document.createElement("button");
		rename.dataset.dashboardSidebarAction = "rename";
		makeVisible(rename);

		const deleteButton = document.createElement("button");
		deleteButton.dataset.dashboardSidebarAction = "delete";
		makeVisible(deleteButton);

		workspaceScope.append(
			workspace,
			menu,
			createFolder,
			move,
			removeFromFolder,
			archive,
			rename,
			deleteButton,
		);

		expect(findDashboardSidebarActionButton(workspace, "menu")).toBe(menu);
		expect(findDashboardSidebarActionButton(workspace, "create-folder")).toBe(
			createFolder,
		);
		expect(findDashboardSidebarActionButton(workspace, "move")).toBe(move);
		expect(
			findDashboardSidebarActionButton(workspace, "remove-from-folder"),
		).toBe(removeFromFolder);
		expect(findDashboardSidebarActionButton(workspace, "archive")).toBe(
			archive,
		);
		expect(findDashboardSidebarActionButton(workspace, "rename")).toBe(rename);
		expect(findDashboardSidebarActionButton(workspace, "delete")).toBe(
			deleteButton,
		);
	});

	test("resolves native provider folder creation from the focused provider row", () => {
		if (typeof document === "undefined") return;

		const providerScope = document.createElement("div");
		providerScope.dataset.dashboardSidebarActionScope = "";

		const provider = document.createElement("button");
		provider.dataset.dashboardNativeProviderTrigger = "capy";
		makeVisible(provider);

		const createFolder = document.createElement("button");
		createFolder.dataset.dashboardSidebarAction = "create-folder";
		makeVisible(createFolder);

		providerScope.append(provider, createFolder);

		expect(findDashboardSidebarActionButton(provider, "create-folder")).toBe(
			createFolder,
		);
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

	test("uses Space variants to toggle a row-scoped expansion control", () => {
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
		expect(findDashboardSidebarActivationTarget(row, "Space")).toBe(
			countToggle,
		);
		expect(findDashboardSidebarActivationTarget(row, "Spacebar")).toBe(
			countToggle,
		);
	});

	test("does not fall back to opening the focused row for Space", () => {
		if (typeof document === "undefined") return;

		const row = document.createElement("button");
		makeVisible(row);

		expect(findDashboardSidebarActivationTarget(row, " ")).toBeNull();
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
