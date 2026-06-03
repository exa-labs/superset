import { describe, expect, it } from "bun:test";
import {
	dashboardFocusScopeForDocument,
	dashboardFocusScopeForElement,
} from "./dashboard-focus-scope";

function selectorMatches(
	selector: string,
	selectors: Set<string>,
	tagName: string,
): boolean {
	return selector
		.split(",")
		.map((item) => item.trim())
		.some((item) => selectors.has(item) || item === tagName.toLowerCase());
}

function element(selectors: string[], tagName = "div"): Element {
	const selectorSet = new Set(selectors);
	return {
		closest: (selector: string) =>
			selectorMatches(selector, selectorSet, tagName) ? ({} as Element) : null,
		tagName,
	} as Element;
}

describe("dashboard focus scope", () => {
	it("classifies known keyboard focus regions by stable dashboard selectors", () => {
		expect(
			dashboardFocusScopeForElement(element(["[data-dashboard-sidebar-root]"]))
				.id,
		).toBe("sidebar");
		expect(
			dashboardFocusScopeForElement(element(["[data-native-agent-view-root]"]))
				.id,
		).toBe("native-agent");
		expect(
			dashboardFocusScopeForElement(element(["[data-dashboard-browser-view]"]))
				.id,
		).toBe("browser");
		expect(
			dashboardFocusScopeForElement(
				element(["[data-command-palette-command-id]"]),
			).id,
		).toBe("command-palette");
		expect(
			dashboardFocusScopeForElement(element(["[data-dashboard-keyboard-help]"]))
				.id,
		).toBe("keyboard-help");
		expect(
			dashboardFocusScopeForElement(element(["[data-terminal-root]"])).id,
		).toBe("terminal");
		expect(
			dashboardFocusScopeForElement(element(["[data-monaco-editor]"])).id,
		).toBe("editor");
	});

	it("classifies xterm, webview, and missing focus defensively", () => {
		expect(dashboardFocusScopeForElement(element([".xterm"])).id).toBe(
			"terminal",
		);
		expect(dashboardFocusScopeForElement(element([], "webview")).id).toBe(
			"browser",
		);
		expect(dashboardFocusScopeForElement(element([])).id).toBe("app");
		expect(dashboardFocusScopeForElement(null).id).toBe("app");
	});

	it("falls back to app scope when document activeElement cannot be validated", () => {
		expect(
			dashboardFocusScopeForDocument({
				activeElement: element(["[data-dashboard-sidebar-root]"]),
			}),
		).toEqual({
			description: "App shell focus",
			id: "app",
			label: "App",
		});
		expect(dashboardFocusScopeForDocument(null).id).toBe("app");
	});
});
