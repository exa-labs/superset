import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT,
	dispatchNativeAgentCurrentAction,
	isNativeAgentCurrentAction,
	nativeAgentCurrentActionEventDetail,
} from "./native-agent-current-actions";

describe("native agent current action events", () => {
	it("validates current action event details", () => {
		expect(isNativeAgentCurrentAction("toggle-browser")).toBe(true);
		expect(isNativeAgentCurrentAction("widen-native-split")).toBe(true);
		expect(isNativeAgentCurrentAction("unknown")).toBe(false);

		expect(
			nativeAgentCurrentActionEventDetail(
				new CustomEvent(DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT, {
					detail: { action: "toggle-browser", provider: "capy" },
				}),
			),
		).toEqual({ action: "toggle-browser", provider: "capy" });
		expect(
			nativeAgentCurrentActionEventDetail(
				new CustomEvent(DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT, {
					detail: { action: "toggle-browser", provider: "other" },
				}),
			),
		).toBeNull();
		expect(
			nativeAgentCurrentActionEventDetail(
				new CustomEvent(DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT, {
					detail: { action: "unknown", provider: "devin" },
				}),
			),
		).toBeNull();
	});

	it("reports handled current action events only when a listener accepts them", () => {
		const originalWindow = globalThis.window;
		const testWindow = new EventTarget();
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: testWindow,
		});

		try {
			expect(
				dispatchNativeAgentCurrentAction({
					action: "toggle-browser",
					provider: "devin",
				}),
			).toBe(false);

			const listener = (event: Event) => {
				expect(nativeAgentCurrentActionEventDetail(event)).toEqual({
					action: "toggle-browser",
					provider: "devin",
				});
				event.preventDefault();
			};
			window.addEventListener(
				DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT,
				listener,
			);
			expect(
				dispatchNativeAgentCurrentAction({
					action: "toggle-browser",
					provider: "devin",
				}),
			).toBe(true);
			window.removeEventListener(
				DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT,
				listener,
			);
		} finally {
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
