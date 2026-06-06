import { describe, expect, it } from "bun:test";

describe("dashboard sidebar search focus", () => {
	it("opens the sidebar and dispatches a sidebar search focus event with an optional seed", async () => {
		const originalWindow = globalThis.window;
		const originalLocalStorage = globalThis.localStorage;
		const originalConsoleWarn = console.warn;
		console.warn = (...args: Parameters<typeof console.warn>) => {
			if (
				typeof args[0] === "string" &&
				args[0].startsWith("[zustand persist middleware]")
			) {
				return;
			}
			originalConsoleWarn(...args);
		};
		const storage = new Map<string, string>();
		const testLocalStorage: Storage = {
			get length() {
				return storage.size;
			},
			clear: () => {
				storage.clear();
			},
			getItem: (key) => storage.get(key) ?? null,
			key: (index) => Array.from(storage.keys())[index] ?? null,
			removeItem: (key) => {
				storage.delete(key);
			},
			setItem: (key, value) => {
				storage.set(key, value);
			},
		};
		const testWindow = new EventTarget();
		Object.defineProperty(testWindow, "localStorage", {
			configurable: true,
			value: testLocalStorage,
		});
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: testWindow,
		});
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: testLocalStorage,
		});
		const {
			COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
			DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
			useWorkspaceSidebarStore,
		} = await import("renderer/stores/workspace-sidebar-state");
		const {
			DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT,
			focusDashboardSidebarSearch,
		} = await import("./dashboard-sidebar-search-focus");

		useWorkspaceSidebarStore.setState({
			isOpen: false,
			width: 0,
			lastExpandedWidth: COLLAPSED_WORKSPACE_SIDEBAR_WIDTH,
		});

		const seeds: Array<string | undefined> = [];
		const listener = (event: Event) => {
			seeds.push((event as CustomEvent<{ seed?: string }>).detail?.seed);
		};
		window.addEventListener(DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT, listener);

		try {
			expect(focusDashboardSidebarSearch({ seed: "capy" })).toBe(true);
			expect(useWorkspaceSidebarStore.getState().isOpen).toBe(true);
			expect(useWorkspaceSidebarStore.getState().isCollapsed()).toBe(false);
			expect(useWorkspaceSidebarStore.getState().width).toBe(
				DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
			);
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(seeds).toEqual(["capy"]);
		} finally {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT,
				listener,
			);
			useWorkspaceSidebarStore.setState({
				isOpen: true,
				width: DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
				lastExpandedWidth: DEFAULT_WORKSPACE_SIDEBAR_WIDTH,
			});
			if (originalWindow) {
				Object.defineProperty(globalThis, "window", {
					configurable: true,
					value: originalWindow,
				});
			} else {
				delete (globalThis as { window?: unknown }).window;
			}
			if (originalLocalStorage) {
				Object.defineProperty(globalThis, "localStorage", {
					configurable: true,
					value: originalLocalStorage,
				});
			} else {
				delete (globalThis as { localStorage?: unknown }).localStorage;
			}
			console.warn = originalConsoleWarn;
		}
	});
});
