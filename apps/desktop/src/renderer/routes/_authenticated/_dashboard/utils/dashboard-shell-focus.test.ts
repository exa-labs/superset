import { describe, expect, it } from "bun:test";
import { focusDashboardNavigationShell } from "./dashboard-shell-focus";

class FakeElement {
	tabIndex = 0;
	focusCount = 0;
	scrollCount = 0;

	constructor(
		private readonly text: string,
		private readonly options: {
			active?: boolean;
			height?: number;
			width?: number;
		} = {},
	) {}

	getAttribute(name: string) {
		if (name === "aria-hidden") return null;
		if (name === "data-dashboard-sidebar-active") {
			return this.options.active ? "true" : null;
		}
		return null;
	}

	getBoundingClientRect() {
		return {
			height: this.options.height ?? 20,
			width: this.options.width ?? 20,
		};
	}

	focus() {
		this.focusCount += 1;
	}

	scrollIntoView() {
		this.scrollCount += 1;
	}

	toString() {
		return this.text;
	}
}

class FakeSidebarRoot {
	constructor(private readonly elements: FakeElement[]) {}

	querySelectorAll(selector: string) {
		if (selector.includes("data-dashboard-sidebar-active")) {
			return this.elements.filter(
				(element) =>
					element.getAttribute("data-dashboard-sidebar-active") === "true",
			);
		}
		return this.elements;
	}
}

function fakeDocument(root: FakeSidebarRoot | null) {
	return {
		querySelector: () => root,
	} as unknown as Document;
}

describe("focusDashboardNavigationShell", () => {
	it("focuses the active visible sidebar item first", () => {
		const first = new FakeElement("first");
		const active = new FakeElement("active", { active: true });

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([first, active])),
			),
		).toBe(true);
		expect(first.focusCount).toBe(0);
		expect(active.focusCount).toBe(1);
		expect(active.scrollCount).toBe(1);
	});

	it("falls back to the first visible sidebar control", () => {
		const first = new FakeElement("fallback");
		const hiddenActive = new FakeElement("hidden active", {
			active: true,
			height: 0,
		});

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([first, hiddenActive])),
			),
		).toBe(true);
		expect(first.focusCount).toBe(1);
		expect(hiddenActive.focusCount).toBe(0);
	});

	it("returns false when the dashboard sidebar or document is missing", () => {
		expect(focusDashboardNavigationShell(fakeDocument(null))).toBe(false);
		expect(focusDashboardNavigationShell(null)).toBe(false);
	});
});
