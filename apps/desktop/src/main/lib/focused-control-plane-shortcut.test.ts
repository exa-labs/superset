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
		]);
		expect(controller.isRegistered()).toBe(true);

		backend.registered.get("Alt+K")?.();
		backend.registered.get("Alt+V")?.();
		backend.registered.get("Alt+Tab")?.();

		expect(openCount).toBe(1);
		expect(actions).toEqual(["TOGGLE_VIM_MODE", "SWITCH_DASHBOARD_VIEW_NEXT"]);

		backend.focusedWindow = null;
		backend.emit("browser-window-blur");

		expect(controller.isRegistered()).toBe(false);
		expect(backend.unregistered).toEqual(["Alt+K", "Alt+V", "Alt+Tab"]);
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
