import { describe, expect, it, mock } from "bun:test";
import { EventEmitter } from "node:events";

mock.module("electron", () => ({
	app: new EventEmitter(),
	BrowserWindow: {
		getFocusedWindow: () => null,
	},
	clipboard: {
		writeImage: mock(() => undefined),
		writeText: mock(() => undefined),
	},
	globalShortcut: {
		register: () => true,
		unregister: () => undefined,
	},
	Menu: {
		buildFromTemplate: mock(() => ({ popup: mock(() => undefined) })),
	},
	shell: {
		openExternal: mock(() => Promise.resolve()),
	},
	webContents: {
		fromId: () => null,
	},
}));

const {
	createFocusedControlPlaneShortcutController,
	focusedDashboardGlobalActionShortcuts,
	focusedDashboardWebShortcuts,
} = await import("./focused-control-plane-shortcut");

type ShortcutCallback = () => void;

class FakeShortcutBackend extends EventEmitter {
	focusedWindow: unknown | null = null;
	registered = new Map<string, ShortcutCallback>();
	registerCalls: string[] = [];
	unregistered: string[] = [];

	getFocusedWindow = () => this.focusedWindow;

	register = (accelerator: string, callback: ShortcutCallback): boolean => {
		this.registerCalls.push(accelerator);
		this.registered.set(accelerator, callback);
		return true;
	};

	unregister = (accelerator: string): void => {
		this.unregistered.push(accelerator);
		this.registered.delete(accelerator);
	};
}

function createHarness() {
	const backend = new FakeShortcutBackend();
	let openCount = 0;
	const controller = createFocusedControlPlaneShortcutController({
		accelerator: "Alt+K",
		backend,
		onOpenControlPlane: () => {
			openCount += 1;
		},
		scheduleFocusCheck: (callback) => callback(),
	});
	return {
		backend,
		controller,
		get openCount() {
			return openCount;
		},
	};
}

describe("focused control plane shortcut", () => {
	it("registers Option+K only while an app window is focused", () => {
		const { backend, controller } = createHarness();

		controller.install();
		expect(controller.isRegistered()).toBe(false);
		expect(backend.registered.has("Alt+K")).toBe(false);

		backend.focusedWindow = {};
		backend.emit("browser-window-focus");
		expect(controller.isRegistered()).toBe(true);
		expect(backend.registered.has("Alt+K")).toBe(true);

		backend.focusedWindow = null;
		backend.emit("browser-window-blur");
		expect(controller.isRegistered()).toBe(false);
		expect(backend.unregistered).toEqual(["Alt+K"]);
	});

	it("opens the control plane through the registered main-process callback", () => {
		const harness = createHarness();
		harness.backend.focusedWindow = {};

		harness.controller.install();
		harness.backend.registered.get("Alt+K")?.();

		expect(harness.openCount).toBe(1);
	});

	it("registers focused dashboard global actions alongside Option+K", () => {
		const backend = new FakeShortcutBackend();
		const actions: string[] = [];
		const shortcuts: string[] = [];
		let openCount = 0;
		const controller = createFocusedControlPlaneShortcutController({
			accelerator: "Alt+K",
			additionalShortcuts: [
				{
					accelerator: "Alt+V",
					callback: () => actions.push("TOGGLE_VIM_MODE"),
				},
				{
					accelerator: "Alt+Tab",
					callback: () => actions.push("SWITCH_DASHBOARD_VIEW_NEXT"),
				},
				{
					accelerator: "Alt+C",
					callback: () => shortcuts.push("OPEN_CAPY"),
				},
			],
			backend,
			onOpenControlPlane: () => {
				openCount += 1;
			},
			scheduleFocusCheck: (callback) => callback(),
		});
		backend.focusedWindow = {};

		controller.install();

		expect([...backend.registered.keys()]).toEqual([
			"Alt+K",
			"Alt+V",
			"Alt+Tab",
			"Alt+C",
		]);
		expect(controller.isRegistered()).toBe(true);

		backend.registered.get("Alt+K")?.();
		backend.registered.get("Alt+V")?.();
		backend.registered.get("Alt+Tab")?.();
		backend.registered.get("Alt+C")?.();

		expect(openCount).toBe(1);
		expect(actions).toEqual(["TOGGLE_VIM_MODE", "SWITCH_DASHBOARD_VIEW_NEXT"]);
		expect(shortcuts).toEqual(["OPEN_CAPY"]);

		backend.focusedWindow = null;
		backend.emit("browser-window-blur");

		expect(controller.isRegistered()).toBe(false);
		expect(backend.unregistered).toEqual([
			"Alt+K",
			"Alt+V",
			"Alt+Tab",
			"Alt+C",
		]);
	});

	it("keeps repeated focus events idempotent while preserving the callback", () => {
		const harness = createHarness();
		harness.backend.focusedWindow = {};

		harness.controller.install();
		harness.backend.emit("browser-window-focus");
		harness.backend.emit("browser-window-focus");
		harness.backend.registered.get("Alt+K")?.();

		expect(harness.controller.isRegistered()).toBe(true);
		expect(harness.backend.registerCalls).toEqual(["Alt+K"]);
		expect(harness.openCount).toBe(1);
	});

	it("keeps the shortcut registered during window-to-window focus transfers", () => {
		const { backend, controller } = createHarness();
		backend.focusedWindow = {};
		controller.install();

		backend.focusedWindow = {};
		backend.emit("browser-window-blur");

		expect(controller.isRegistered()).toBe(true);
		expect(backend.unregistered).toEqual([]);
	});

	it("unregisters on app quit and dispose", () => {
		const { backend, controller } = createHarness();
		backend.focusedWindow = {};
		controller.install();

		backend.emit("will-quit");
		expect(controller.isRegistered()).toBe(false);
		expect(backend.unregistered).toEqual(["Alt+K"]);

		backend.emit("browser-window-focus");
		expect(controller.isRegistered()).toBe(true);

		controller.dispose();
		expect(controller.isRegistered()).toBe(false);
		expect(backend.unregistered).toEqual(["Alt+K", "Alt+K"]);
	});
});

describe("focusedDashboardGlobalActionShortcuts", () => {
	it("maps macOS Option shortcuts to dashboard global actions", () => {
		expect(focusedDashboardGlobalActionShortcuts("darwin")).toEqual([
			{ accelerator: "Alt+V", action: "TOGGLE_VIM_MODE" },
			{
				accelerator: "Alt+Slash",
				action: "SHOW_DASHBOARD_KEYBOARD_HELP",
			},
			{ accelerator: "Alt+F", action: "SHOW_DASHBOARD_ACTION_HINTS" },
			{ accelerator: "Alt+N", action: "OPEN_UNREAD_NATIVE_REPLY" },
			{
				accelerator: "Alt+Shift+N",
				action: "MARK_LATEST_NATIVE_REPLY_READ",
			},
			{ accelerator: "Alt+Tab", action: "SWITCH_DASHBOARD_VIEW_NEXT" },
			{
				accelerator: "Alt+Shift+Tab",
				action: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
			},
		]);
	});

	it("uses Ctrl+Alt variants on non-macOS platforms", () => {
		expect(focusedDashboardGlobalActionShortcuts("linux")[0]).toEqual({
			accelerator: "Ctrl+Alt+V",
			action: "TOGGLE_VIM_MODE",
		});
		expect(focusedDashboardGlobalActionShortcuts("win32").at(-1)).toEqual({
			accelerator: "Ctrl+Alt+Shift+Tab",
			action: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
		});
	});
});

describe("focusedDashboardWebShortcuts", () => {
	it("maps macOS Option shortcuts to high-impact dashboard web shortcuts", () => {
		expect(focusedDashboardWebShortcuts("darwin")).toEqual([
			{ accelerator: "Alt+1", shortcut: "OPEN_WEB_PAGE_1" },
			{ accelerator: "Alt+2", shortcut: "OPEN_WEB_PAGE_2" },
			{ accelerator: "Alt+3", shortcut: "OPEN_WEB_PAGE_3" },
			{ accelerator: "Alt+4", shortcut: "OPEN_WEB_PAGE_4" },
			{ accelerator: "Alt+5", shortcut: "OPEN_WEB_PAGE_5" },
			{ accelerator: "Alt+6", shortcut: "OPEN_WEB_PAGE_6" },
			{ accelerator: "Alt+C", shortcut: "OPEN_CAPY" },
			{ accelerator: "Alt+Shift+C", shortcut: "CREATE_CAPY" },
			{ accelerator: "Alt+D", shortcut: "OPEN_DEVIN" },
			{ accelerator: "Alt+Shift+D", shortcut: "CREATE_DEVIN" },
			{ accelerator: "Alt+G", shortcut: "OPEN_CHROME" },
			{ accelerator: "Alt+W", shortcut: "OPEN_WORKSPACES" },
			{
				accelerator: "Alt+Shift+S",
				shortcut: "OPEN_ROOT_TERMINAL_STAG",
			},
			{
				accelerator: "Alt+Shift+P",
				shortcut: "OPEN_ROOT_TERMINAL_PROD",
			},
			{
				accelerator: "Alt+Shift+H",
				shortcut: "OPEN_ROOT_TERMINAL_HEPH",
			},
			{ accelerator: "Alt+B", shortcut: "TOGGLE_NATIVE_BROWSER_VIEW" },
			{ accelerator: "Alt+S", shortcut: "TOGGLE_NATIVE_SPLIT_VIEW" },
			{ accelerator: "Alt+Period", shortcut: "SIDEBAR_ACTION_MENU" },
			{ accelerator: "Alt+P", shortcut: "SIDEBAR_ACTION_PIN" },
			{ accelerator: "Alt+A", shortcut: "SIDEBAR_ACTION_ARCHIVE" },
			{
				accelerator: "Alt+Shift+A",
				shortcut: "SIDEBAR_ACTION_HARD_ARCHIVE",
			},
			{ accelerator: "Alt+M", shortcut: "SIDEBAR_ACTION_MOVE" },
			{
				accelerator: "Alt+Shift+M",
				shortcut: "SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
			},
			{ accelerator: "Alt+E", shortcut: "SIDEBAR_ACTION_RENAME" },
			{ accelerator: "Alt+Shift+R", shortcut: "SIDEBAR_ACTION_REPLY" },
			{ accelerator: "Alt+O", shortcut: "SIDEBAR_ACTION_OPEN_BROWSER" },
			{ accelerator: "Alt+U", shortcut: "SIDEBAR_ACTION_MARK_READ" },
			{ accelerator: "Alt+T", shortcut: "BROWSER_NEW_TAB" },
			{ accelerator: "Alt+R", shortcut: "BROWSER_RELOAD" },
			{ accelerator: "Alt+Left", shortcut: "BROWSER_GO_BACK" },
			{ accelerator: "Alt+Right", shortcut: "BROWSER_GO_FORWARD" },
			{ accelerator: "Alt+Shift+Left", shortcut: "BROWSER_PREVIOUS_TAB" },
			{ accelerator: "Alt+Shift+Right", shortcut: "BROWSER_NEXT_TAB" },
			{ accelerator: "Alt+Shift+W", shortcut: "BROWSER_CLOSE_TAB" },
			{ accelerator: "Alt+Shift+I", shortcut: "BROWSER_TOGGLE_PIN" },
			{ accelerator: "Alt+Shift+O", shortcut: "BROWSER_OPEN_EXTERNAL" },
			{ accelerator: "Alt+Shift+B", shortcut: "BROWSER_TOGGLE_SPLIT" },
			{ accelerator: "Alt+Shift+X", shortcut: "BROWSER_CLOSE_SPLIT" },
			{ accelerator: "Alt+Shift+F", shortcut: "BROWSER_SWAP_SPLIT" },
			{ accelerator: "Alt+Shift+Comma", shortcut: "BROWSER_NARROW_SPLIT" },
			{ accelerator: "Alt+Shift+Period", shortcut: "BROWSER_WIDEN_SPLIT" },
			{ accelerator: "Alt+Shift+0", shortcut: "BROWSER_EQUALIZE_SPLIT" },
		]);
	});

	it("uses Ctrl+Alt variants on non-macOS platforms", () => {
		expect(focusedDashboardWebShortcuts("linux")[0]).toEqual({
			accelerator: "Ctrl+Alt+1",
			shortcut: "OPEN_WEB_PAGE_1",
		});
		expect(focusedDashboardWebShortcuts("win32").at(-1)).toEqual({
			accelerator: "Ctrl+Alt+Shift+0",
			shortcut: "BROWSER_EQUALIZE_SPLIT",
		});
		expect(focusedDashboardWebShortcuts("linux")).toContainEqual({
			accelerator: "Ctrl+Alt+P",
			shortcut: "SIDEBAR_ACTION_PIN",
		});
	});
});
