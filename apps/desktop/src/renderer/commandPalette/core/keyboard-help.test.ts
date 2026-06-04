import { describe, expect, it } from "bun:test";
import { DASHBOARD_KEYBOARD_HELP_OPEN_EVENT } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import {
	isSettingsRoute,
	KEYBOARD_SETTINGS_PATH,
	openCommandPaletteKeyboardHelp,
} from "./keyboard-help";
import type { CommandContext } from "./types";

function keyboardHelpContext(
	pathname: string,
	navigate: (path: string) => void = () => undefined,
): Pick<CommandContext, "navigate" | "route"> {
	return {
		navigate,
		route: { params: {}, pathname },
	};
}

describe("command palette keyboard help routing", () => {
	it("detects settings routes", () => {
		expect(isSettingsRoute("/settings")).toBe(true);
		expect(isSettingsRoute("/settings/account")).toBe(true);
		expect(isSettingsRoute("/native/devin")).toBe(false);
	});

	it("opens keyboard settings from settings routes", () => {
		const navigated: string[] = [];
		const opened = openCommandPaletteKeyboardHelp(
			keyboardHelpContext("/settings/account", (path) => {
				navigated.push(path);
			}),
		);

		expect(opened).toBe(true);
		expect(navigated).toEqual([KEYBOARD_SETTINGS_PATH]);
	});

	it("opens dashboard keyboard help from dashboard-owned routes", () => {
		const originalWindow = globalThis.window;
		const testWindow = new EventTarget();
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: testWindow,
		});

		let openEventCount = 0;
		const listener = () => {
			openEventCount += 1;
		};
		window.addEventListener(DASHBOARD_KEYBOARD_HELP_OPEN_EVENT, listener);

		try {
			const opened = openCommandPaletteKeyboardHelp(
				keyboardHelpContext("/native/devin"),
			);
			expect(opened).toBe(true);
			expect(openEventCount).toBe(1);
		} finally {
			window.removeEventListener(DASHBOARD_KEYBOARD_HELP_OPEN_EVENT, listener);
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
