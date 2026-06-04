import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT,
	focusDashboardSidebarSearch,
} from "./dashboard-sidebar-search-focus";

describe("dashboard sidebar search focus", () => {
	it("dispatches a sidebar search focus event with an optional seed", () => {
		const originalWindow = globalThis.window;
		const testWindow = new EventTarget();
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: testWindow,
		});

		const seeds: Array<string | undefined> = [];
		const listener = (event: Event) => {
			seeds.push((event as CustomEvent<{ seed?: string }>).detail?.seed);
		};
		window.addEventListener(DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT, listener);

		try {
			expect(focusDashboardSidebarSearch({ seed: "capy" })).toBe(true);
			expect(seeds).toEqual(["capy"]);
		} finally {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT,
				listener,
			);
			if (originalWindow) {
				Object.defineProperty(globalThis, "window", {
					configurable: true,
					value: originalWindow,
				});
			} else {
				delete (globalThis as { window?: unknown }).window;
			}
		}
	});
});
