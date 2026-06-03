import { afterAll, describe, expect, it, mock } from "bun:test";
import type { Terminal as XTerm } from "@xterm/xterm";

const testGlobal = globalThis as typeof globalThis & {
	electronTRPC?: {
		onMessage: (callback: (message: unknown) => void) => void;
		sendMessage: (message: unknown) => void;
	};
	window?: Window & typeof globalThis;
};

const previousWindow = testGlobal.window;

testGlobal.electronTRPC = {
	onMessage: () => {},
	sendMessage: () => {},
};

afterAll(() => {
	if (previousWindow === undefined) {
		Reflect.deleteProperty(testGlobal, "window");
		return;
	}
	testGlobal.window = previousWindow;
});

const { createTerminalKeyEventHandler } = await import(
	"./terminal-key-event-handler"
);
const { TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT } = await import(
	"./terminal-dashboard-events"
);

function keyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
	return {
		type: "keydown",
		key: "",
		code: "",
		keyCode: 0,
		metaKey: false,
		altKey: false,
		ctrlKey: false,
		shiftKey: false,
		isComposing: false,
		preventDefault: mock(),
		getModifierState: () => false,
		...overrides,
	} as KeyboardEvent;
}

function terminal() {
	return {
		input: mock(),
		selectAll: mock(),
		hasSelection: () => false,
	} as unknown as XTerm;
}

describe("createTerminalKeyEventHandler", () => {
	it("sends Mac Cmd+Enter to the PTY as the TUI newline sequence", () => {
		const xterm = terminal();
		const event = keyboardEvent({
			key: "Enter",
			code: "Enter",
			metaKey: true,
		});
		const handler = createTerminalKeyEventHandler(xterm, {
			platform: "MacIntel",
		});

		expect(handler(event)).toBe(false);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(xterm.input).toHaveBeenCalledWith("\x1b\r", true);
	});

	it("still bubbles unhandled Mac Cmd chords without sending PTY input", () => {
		const xterm = terminal();
		const event = keyboardEvent({
			key: "j",
			code: "KeyJ",
			metaKey: true,
		});
		const handler = createTerminalKeyEventHandler(xterm, {
			platform: "MacIntel",
		});

		expect(handler(event)).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(xterm.input).not.toHaveBeenCalled();
	});

	it("bubbles keyboard-native app shortcuts before xterm can consume them", () => {
		const xterm = terminal();
		const handler = createTerminalKeyEventHandler(xterm, {
			platform: "MacIntel",
		});

		for (const event of [
			keyboardEvent({ altKey: true, code: "KeyK", key: "k" }),
			keyboardEvent({ altKey: true, code: "KeyV", key: "v" }),
			keyboardEvent({ altKey: true, code: "KeyF", key: "f" }),
			keyboardEvent({ altKey: true, code: "Slash", key: "/" }),
			keyboardEvent({ altKey: true, code: "Tab", key: "Tab" }),
			keyboardEvent({
				altKey: true,
				code: "Tab",
				key: "Tab",
				shiftKey: true,
			}),
			keyboardEvent({ altKey: true, code: "KeyC", key: "c" }),
			keyboardEvent({ altKey: true, code: "KeyD", key: "d" }),
			keyboardEvent({ altKey: true, code: "KeyG", key: "g" }),
			keyboardEvent({ altKey: true, code: "KeyW", key: "w" }),
			keyboardEvent({ altKey: true, code: "Digit1", key: "1" }),
		]) {
			expect(handler(event)).toBe(false);
			expect(event.preventDefault).not.toHaveBeenCalled();
		}
		expect(xterm.input).not.toHaveBeenCalled();
	});

	it("turns bare Escape into a dashboard shell-focus request", () => {
		const xterm = terminal();
		const event = keyboardEvent({ code: "Escape", key: "Escape" });
		const handler = createTerminalKeyEventHandler(xterm, {
			platform: "MacIntel",
		});
		let focusRequestCount = 0;
		const listener = () => {
			focusRequestCount += 1;
		};
		if (testGlobal.window === undefined) {
			testGlobal.window = new EventTarget() as Window & typeof globalThis;
		}
		window.addEventListener(TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT, listener);

		try {
			expect(handler(event)).toBe(false);
		} finally {
			window.removeEventListener(
				TERMINAL_FOCUS_DASHBOARD_SHELL_EVENT,
				listener,
			);
		}

		expect(event.preventDefault).toHaveBeenCalled();
		expect(focusRequestCount).toBe(1);
		expect(xterm.input).not.toHaveBeenCalled();
	});

	it("keeps modified Escape available to terminal applications", () => {
		const xterm = terminal();
		const event = keyboardEvent({
			altKey: true,
			code: "Escape",
			key: "Escape",
		});
		const handler = createTerminalKeyEventHandler(xterm, {
			platform: "MacIntel",
		});

		expect(handler(event)).toBe(true);
		expect(xterm.input).not.toHaveBeenCalled();
	});

	it('treats Node-style "darwin" platform as Mac, not Windows', () => {
		const xterm = terminal();
		const event = keyboardEvent({
			key: "Enter",
			code: "Enter",
			metaKey: true,
		});
		const handler = createTerminalKeyEventHandler(xterm, {
			platform: "darwin",
		});

		expect(handler(event)).toBe(false);
		expect(xterm.input).toHaveBeenCalledWith("\x1b\r", true);
	});

	it("lets ordinary terminal input continue through xterm", () => {
		const xterm = terminal();
		const event = keyboardEvent({
			key: "a",
			code: "KeyA",
		});
		const handler = createTerminalKeyEventHandler(xterm, {
			platform: "MacIntel",
		});

		expect(handler(event)).toBe(true);
		expect(xterm.input).not.toHaveBeenCalled();
	});
});
