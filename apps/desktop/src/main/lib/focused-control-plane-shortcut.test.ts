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

const { createFocusedControlPlaneShortcutController } = await import(
	"./focused-control-plane-shortcut"
);

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
