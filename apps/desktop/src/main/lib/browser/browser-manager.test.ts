import { describe, expect, it, mock } from "bun:test";
import { EventEmitter } from "node:events";
import type { Input } from "electron";
import type { DashboardWebShortcut } from "main/lib/dashboard-web-shortcut";

class FakeWebContents extends EventEmitter {
	id: number;
	windowOpenHandler: ((details: { url: string }) => unknown) | null = null;

	constructor(id: number) {
		super();
		this.id = id;
	}

	isDestroyed() {
		return false;
	}

	setBackgroundThrottling() {}

	setWindowOpenHandler(handler: (details: { url: string }) => unknown) {
		this.windowOpenHandler = handler;
	}

	executeJavaScript() {
		return Promise.resolve(false);
	}

	canGoBack() {
		return false;
	}

	canGoForward() {
		return false;
	}

	reload() {}

	goBack() {}

	goForward() {}
}

const fakeWebContentsById = new Map<number, FakeWebContents>();

mock.module("electron", () => ({
	clipboard: {
		writeImage: mock(() => {}),
		writeText: mock(() => {}),
	},
	Menu: {
		buildFromTemplate: mock(() => ({ popup: mock(() => {}) })),
	},
	shell: {
		openExternal: mock(() => Promise.resolve()),
	},
	webContents: {
		fromId: (id: number) => fakeWebContentsById.get(id) ?? null,
	},
}));

const { BrowserManager } = await import("./browser-manager");

type BeforeInputEvent = {
	defaultPrevented: boolean;
	preventDefault: () => void;
};

function beforeInputEvent(): BeforeInputEvent {
	const event: BeforeInputEvent = {
		defaultPrevented: false,
		preventDefault: () => {
			event.defaultPrevented = true;
		},
	};
	return event;
}

function input(overrides: Partial<Input>): Input {
	return {
		alt: true,
		code: "KeyC",
		control: false,
		isAutoRepeat: false,
		key: "c",
		meta: false,
		shift: false,
		type: "keyDown",
		...overrides,
	} as Input;
}

describe("BrowserManager webview shortcuts", () => {
	it("clears pending Capy/Devin chains when the control plane opens", () => {
		const webContents = new FakeWebContents(1);
		fakeWebContentsById.set(webContents.id, webContents);
		const manager = new BrowserManager();
		const dashboardShortcuts: DashboardWebShortcut[] = [];
		let controlPlaneOpenCount = 0;
		manager.on("dashboard-web-shortcut", (shortcut: DashboardWebShortcut) => {
			dashboardShortcuts.push(shortcut);
		});
		manager.on("open-control-plane", () => {
			controlPlaneOpenCount += 1;
		});
		manager.register("pane-1", webContents.id);

		const capyEvent = beforeInputEvent();
		webContents.emit("before-input-event", capyEvent, input({}));
		expect(capyEvent.defaultPrevented).toBe(true);
		expect(dashboardShortcuts).toEqual(["OPEN_CAPY"]);

		const commandPaletteEvent = beforeInputEvent();
		webContents.emit(
			"before-input-event",
			commandPaletteEvent,
			input({ code: "KeyK", key: "Dead" }),
		);
		expect(commandPaletteEvent.defaultPrevented).toBe(true);
		expect(controlPlaneOpenCount).toBe(1);

		const digitEvent = beforeInputEvent();
		webContents.emit(
			"before-input-event",
			digitEvent,
			input({ alt: false, code: "Digit2", key: "2" }),
		);
		expect(digitEvent.defaultPrevented).toBe(false);
		expect(dashboardShortcuts).toEqual(["OPEN_CAPY"]);

		manager.unregister("pane-1");
		fakeWebContentsById.clear();
	});

	it("routes global keyboard actions emitted by the injected webview bridge", () => {
		const webContents = new FakeWebContents(2);
		fakeWebContentsById.set(webContents.id, webContents);
		const manager = new BrowserManager();
		const dashboardShortcuts: DashboardWebShortcut[] = [];
		const globalActions: string[] = [];
		manager.on("dashboard-web-shortcut", (shortcut: DashboardWebShortcut) => {
			dashboardShortcuts.push(shortcut);
		});
		manager.on("global-keyboard-action", (action: string) => {
			globalActions.push(action);
		});
		manager.register("pane-2", webContents.id);

		webContents.emit(
			"console-message",
			{},
			3,
			"__CLANKEE_DASHBOARD_WEB_SHORTCUT__:FOCUS_DASHBOARD_SHELL",
		);
		webContents.emit(
			"console-message",
			{},
			3,
			"__CLANKEE_DASHBOARD_WEB_SHORTCUT__:SWITCH_DASHBOARD_VIEW_NEXT",
		);
		webContents.emit(
			"console-message",
			{},
			3,
			"__CLANKEE_DASHBOARD_WEB_SHORTCUT__:TOGGLE_VIM_MODE",
		);

		expect(dashboardShortcuts).toEqual([]);
		expect(globalActions).toEqual([
			"FOCUS_DASHBOARD_SHELL",
			"SWITCH_DASHBOARD_VIEW_NEXT",
			"TOGGLE_VIM_MODE",
		]);

		manager.unregister("pane-2");
		fakeWebContentsById.clear();
	});

	it("routes bridge URL global actions before dashboard web shortcuts", () => {
		const webContents = new FakeWebContents(3);
		fakeWebContentsById.set(webContents.id, webContents);
		const manager = new BrowserManager();
		const dashboardShortcuts: DashboardWebShortcut[] = [];
		const globalActions: string[] = [];
		manager.on("dashboard-web-shortcut", (shortcut: DashboardWebShortcut) => {
			dashboardShortcuts.push(shortcut);
		});
		manager.on("global-keyboard-action", (action: string) => {
			globalActions.push(action);
		});
		manager.register("pane-3", webContents.id);

		const focusEvent = beforeInputEvent();
		webContents.emit(
			"will-navigate",
			focusEvent,
			"clankee-dashboard-shortcut://bridge?shortcut=FOCUS_DASHBOARD_SHELL",
		);
		const reloadEvent = beforeInputEvent();
		webContents.emit(
			"will-navigate",
			reloadEvent,
			"clankee-dashboard-shortcut://bridge?shortcut=BROWSER_RELOAD",
		);

		expect(focusEvent.defaultPrevented).toBe(true);
		expect(reloadEvent.defaultPrevented).toBe(true);
		expect(globalActions).toEqual(["FOCUS_DASHBOARD_SHELL"]);
		expect(dashboardShortcuts).toEqual(["BROWSER_RELOAD"]);

		manager.unregister("pane-3");
		fakeWebContentsById.clear();
	});
});
