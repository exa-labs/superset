import { describe, expect, it } from "bun:test";
import {
	focusDashboardNavigationShell,
	scheduleDashboardNavigationShellFocus,
} from "./dashboard-shell-focus";

class FakeElement {
	tabIndex = 0;
	focusCount = 0;
	scrollCount = 0;
	scrollOptions: ScrollIntoViewOptions | null = null;
	private readonly attributes = new Map<string, string>();

	constructor(
		private readonly text: string,
		private readonly options: {
			active?: boolean;
			action?: boolean;
			actionScope?: boolean;
			height?: number;
			nativeSession?: boolean;
			roving?: boolean;
			webTab?: boolean;
			width?: number;
		} = {},
	) {}

	getAttribute(name: string) {
		if (this.attributes.has(name)) return this.attributes.get(name) ?? null;
		if (name === "aria-hidden") return null;
		if (name === "data-dashboard-sidebar-active") {
			return this.options.active ? "true" : null;
		}
		if (name === "data-native-agent-session-row-id") {
			return this.options.nativeSession ? "native-session" : null;
		}
		if (name === "data-dashboard-sidebar-roving-item") {
			return this.options.roving ? "true" : null;
		}
		if (name === "data-dashboard-sidebar-action") {
			return this.options.action ? "pin" : null;
		}
		if (name === "data-dashboard-web-tab-row-button") {
			return this.options.webTab ? "chrome-tab" : null;
		}
		return null;
	}

	setAttribute(name: string, value: string) {
		this.attributes.set(name, value);
	}

	removeAttribute(name: string) {
		this.attributes.delete(name);
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

	matches(selector: string) {
		if (selector.includes("data-dashboard-sidebar-roving-item")) {
			return this.options.roving === true;
		}
		if (selector.includes("data-dashboard-sidebar-action")) {
			return this.options.action === true;
		}
		if (selector.includes("data-dashboard-sidebar-action-scope")) {
			return this.options.actionScope === true;
		}
		return false;
	}

	closest(selector: string) {
		if (
			selector.includes("data-dashboard-sidebar-action-scope") &&
			this.options.actionScope
		) {
			return this;
		}
		return null;
	}

	scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
		this.scrollCount += 1;
		this.scrollOptions = typeof options === "object" ? options : null;
	}

	toString() {
		return this.text;
	}
}

class FakeSidebarRoot {
	constructor(private readonly elements: FakeElement[]) {}

	querySelectorAll(selector: string) {
		if (selector.includes("data-dashboard-sidebar-keyboard-focus")) {
			return this.elements.filter(
				(element) =>
					element.getAttribute("data-dashboard-sidebar-keyboard-focus") ===
					"true",
			);
		}
		if (selector.includes("data-dashboard-sidebar-roving-item")) {
			return this.elements.filter(
				(element) =>
					element.getAttribute("data-dashboard-sidebar-roving-item") === "true",
			);
		}
		if (selector.includes("data-native-agent-session-row-id")) {
			return this.elements.filter(
				(element) =>
					element.getAttribute("data-dashboard-sidebar-active") === "true" &&
					element.getAttribute("data-native-agent-session-row-id") != null,
			);
		}
		if (selector.includes("data-dashboard-web-tab-row-button")) {
			return this.elements.filter(
				(element) =>
					element.getAttribute("data-dashboard-sidebar-active") === "true" &&
					element.getAttribute("data-dashboard-web-tab-row-button") != null,
			);
		}
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
		expect(active.scrollOptions).toEqual({
			block: "nearest",
			inline: "nearest",
		});
		expect(active.getAttribute("data-dashboard-sidebar-keyboard-focus")).toBe(
			"true",
		);
	});

	it("keeps the preserved keyboard focus marker when returning to the shell", () => {
		const preserved = new FakeElement("preserved", { roving: true });
		const active = new FakeElement("active", { active: true });
		preserved.setAttribute("data-dashboard-sidebar-keyboard-focus", "true");

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([preserved, active])),
			),
		).toBe(true);
		expect(
			preserved.getAttribute("data-dashboard-sidebar-keyboard-focus"),
		).toBe("true");
		expect(
			active.getAttribute("data-dashboard-sidebar-keyboard-focus"),
		).toBeNull();
		expect(preserved.focusCount).toBe(1);
		expect(active.focusCount).toBe(0);
	});

	it("moves the keyboard focus marker when the preserved target is not visible", () => {
		const stale = new FakeElement("stale", { height: 0 });
		const active = new FakeElement("active", { active: true });
		stale.setAttribute("data-dashboard-sidebar-keyboard-focus", "true");

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([stale, active])),
			),
		).toBe(true);
		expect(
			stale.getAttribute("data-dashboard-sidebar-keyboard-focus"),
		).toBeNull();
		expect(active.getAttribute("data-dashboard-sidebar-keyboard-focus")).toBe(
			"true",
		);
	});

	it("returns to the preserved keyboard focus marker before the active route row", () => {
		const focused = new FakeElement("keyboard focused", { roving: true });
		const active = new FakeElement("active route", { active: true });
		focused.setAttribute("data-dashboard-sidebar-keyboard-focus", "true");

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([focused, active])),
			),
		).toBe(true);
		expect(focused.focusCount).toBe(1);
		expect(active.focusCount).toBe(0);
		expect(focused.getAttribute("data-dashboard-sidebar-keyboard-focus")).toBe(
			"true",
		);
	});

	it("keeps restored shell focus visible inside the sidebar scroller", () => {
		if (typeof document === "undefined") return;

		const root = document.createElement("div");
		root.dataset.dashboardSidebarRoot = "true";
		const container = document.createElement("div");
		container.dataset.dashboardSidebarScrollContainer = "true";
		container.scrollTop = 60;
		container.scrollLeft = 20;
		Object.defineProperty(container, "clientHeight", {
			configurable: true,
			value: 100,
		});
		Object.defineProperty(container, "clientWidth", {
			configurable: true,
			value: 100,
		});
		Object.defineProperty(container, "scrollHeight", {
			configurable: true,
			value: 500,
		});
		Object.defineProperty(container, "scrollWidth", {
			configurable: true,
			value: 500,
		});
		container.getBoundingClientRect = () =>
			({
				bottom: 100,
				height: 100,
				left: 0,
				right: 100,
				top: 0,
				width: 100,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}) as DOMRect;

		const active = document.createElement("button");
		active.dataset.dashboardSidebarActive = "true";
		active.getBoundingClientRect = () =>
			({
				bottom: 180,
				height: 40,
				left: 120,
				right: 170,
				top: 140,
				width: 50,
				x: 120,
				y: 140,
				toJSON: () => ({}),
			}) as DOMRect;
		const scrollCalls: ScrollIntoViewOptions[] = [];
		const originalScrollIntoView = active.scrollIntoView;
		active.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
			if (typeof options === "object") {
				scrollCalls.push(options);
			}
		};

		container.append(active);
		root.append(container);
		document.body.append(root);

		try {
			expect(focusDashboardNavigationShell(document)).toBe(true);
			expect(document.activeElement).toBe(active);
			expect(scrollCalls).toEqual([]);
			expect(container.scrollTop).toBe(140);
			expect(container.scrollLeft).toBe(90);
		} finally {
			active.scrollIntoView = originalScrollIntoView;
			root.remove();
		}
	});

	it("ignores hidden keyboard focus markers and falls back to the active route row", () => {
		const hiddenFocused = new FakeElement("hidden keyboard focused", {
			height: 0,
			roving: true,
		});
		const active = new FakeElement("active route", { active: true });
		hiddenFocused.setAttribute("data-dashboard-sidebar-keyboard-focus", "true");

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([hiddenFocused, active])),
			),
		).toBe(true);
		expect(hiddenFocused.focusCount).toBe(0);
		expect(active.focusCount).toBe(1);
		expect(
			hiddenFocused.getAttribute("data-dashboard-sidebar-keyboard-focus"),
		).toBeNull();
		expect(active.getAttribute("data-dashboard-sidebar-keyboard-focus")).toBe(
			"true",
		);
	});

	it("ignores preserved focus markers on utility buttons", () => {
		const utilityButton = new FakeElement("resource meter");
		const active = new FakeElement("active route", { active: true });
		utilityButton.setAttribute("data-dashboard-sidebar-keyboard-focus", "true");

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([utilityButton, active])),
			),
		).toBe(true);
		expect(utilityButton.focusCount).toBe(0);
		expect(active.focusCount).toBe(1);
		expect(
			utilityButton.getAttribute("data-dashboard-sidebar-keyboard-focus"),
		).toBeNull();
		expect(active.getAttribute("data-dashboard-sidebar-keyboard-focus")).toBe(
			"true",
		);
	});

	it("prefers an active native session row over an active provider header", () => {
		const providerHeader = new FakeElement("Devin provider", { active: true });
		const nativeSession = new FakeElement("Active Devin session", {
			active: true,
			nativeSession: true,
		});

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([providerHeader, nativeSession])),
			),
		).toBe(true);
		expect(providerHeader.focusCount).toBe(0);
		expect(nativeSession.focusCount).toBe(1);
		expect(nativeSession.scrollCount).toBe(1);
	});

	it("prefers an active Chrome tab row over an active app header", () => {
		const appHeader = new FakeElement("Chrome app", { active: true });
		const chromeTab = new FakeElement("Active Chrome tab", {
			active: true,
			webTab: true,
		});

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([appHeader, chromeTab])),
			),
		).toBe(true);
		expect(appHeader.focusCount).toBe(0);
		expect(chromeTab.focusCount).toBe(1);
		expect(chromeTab.scrollCount).toBe(1);
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

	it("falls back to primary roving rows before ordinary controls", () => {
		const footerButton = new FakeElement("footer button");
		const row = new FakeElement("workspace row", { roving: true });

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([footerButton, row])),
			),
		).toBe(true);
		expect(footerButton.focusCount).toBe(0);
		expect(row.focusCount).toBe(1);
	});

	it("does not focus nested row action buttons as fallback targets", () => {
		const nestedAction = new FakeElement("pin action", { action: true });
		const row = new FakeElement("workspace row", { actionScope: true });

		expect(
			focusDashboardNavigationShell(
				fakeDocument(new FakeSidebarRoot([nestedAction, row])),
			),
		).toBe(true);
		expect(nestedAction.focusCount).toBe(0);
		expect(row.focusCount).toBe(1);
	});

	it("returns false when the dashboard sidebar or document is missing", () => {
		expect(focusDashboardNavigationShell(fakeDocument(null))).toBe(false);
		expect(focusDashboardNavigationShell(null)).toBe(false);
	});
});

describe("scheduleDashboardNavigationShellFocus", () => {
	it("schedules an immediate and delayed focus attempt for route-driven jumps", () => {
		const calls: number[] = [];
		let focusCount = 0;

		scheduleDashboardNavigationShellFocus({
			focus: () => {
				focusCount += 1;
				return true;
			},
			setTimer: (callback, ms) => {
				calls.push(ms);
				callback();
				return ms;
			},
		});

		expect(calls).toEqual([0, 120]);
		expect(focusCount).toBe(2);
	});

	it("allows focused tests to override retry timings", () => {
		const calls: number[] = [];

		scheduleDashboardNavigationShellFocus({
			delaysMs: [10, 250, 500],
			focus: () => true,
			setTimer: (_callback, ms) => {
				calls.push(ms);
				return ms;
			},
		});

		expect(calls).toEqual([10, 250, 500]);
	});
});
