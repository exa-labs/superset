import { afterEach, describe, expect, it } from "bun:test";
import {
	addDashboardKeyboardChainResetListener,
	dispatchDashboardKeyboardChainReset,
} from "./dashboard-keyboard-chain-reset";

const originalWindow = globalThis.window;

function restoreWindow() {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: originalWindow,
	});
}

function installFakeWindow() {
	const target = new EventTarget();
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			addEventListener: target.addEventListener.bind(target),
			dispatchEvent: target.dispatchEvent.bind(target),
			removeEventListener: target.removeEventListener.bind(target),
		},
	});
}

describe("dashboard keyboard chain reset", () => {
	afterEach(() => {
		restoreWindow();
	});

	it("notifies listeners when control-plane and global actions reset chains", () => {
		installFakeWindow();
		const reasons: string[] = [];
		const unsubscribe = addDashboardKeyboardChainResetListener((reason) => {
			reasons.push(reason);
		});

		dispatchDashboardKeyboardChainReset("control-plane");
		dispatchDashboardKeyboardChainReset("global-keyboard-action");

		expect(reasons).toEqual(["control-plane", "global-keyboard-action"]);

		unsubscribe();
		dispatchDashboardKeyboardChainReset("control-plane");

		expect(reasons).toEqual(["control-plane", "global-keyboard-action"]);
	});

	it("is a noop during server-side tests without a window", () => {
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: undefined,
		});

		const unsubscribe = addDashboardKeyboardChainResetListener(() => {
			throw new Error("listener should not run without a window");
		});

		expect(() =>
			dispatchDashboardKeyboardChainReset("control-plane"),
		).not.toThrow();
		expect(() => unsubscribe()).not.toThrow();
	});
});
