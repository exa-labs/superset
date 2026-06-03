import { describe, expect, it } from "bun:test";
import {
	DASHBOARD_NATIVE_AGENT_OPEN_INDEX_EVENT,
	dashboardNativeAgentOpenIndexDetail,
	dispatchDashboardNativeAgentOpenIndex,
} from "./native-agent-shortcut-events";

describe("native agent shortcut events", () => {
	it("reports handled indexed shortcut events when a listener prevents default", () => {
		const originalWindow = globalThis.window;
		const listeners = new Map<string, (event: Event) => void>();
		(globalThis as { window?: unknown }).window = {
			addEventListener: (type: string, listener: (event: Event) => void) => {
				listeners.set(type, listener);
			},
			dispatchEvent: (event: Event) => {
				listeners.get(event.type)?.(event);
				return !event.defaultPrevented;
			},
		};

		window.addEventListener(
			DASHBOARD_NATIVE_AGENT_OPEN_INDEX_EVENT,
			(event) => {
				expect(dashboardNativeAgentOpenIndexDetail(event)).toEqual({
					index: 2,
					provider: "devin",
				});
				event.preventDefault();
			},
		);

		expect(
			dispatchDashboardNativeAgentOpenIndex({ index: 2, provider: "devin" }),
		).toBe(true);
		(globalThis as { window?: unknown }).window = originalWindow;
	});

	it("ignores invalid indexed shortcut event details", () => {
		expect(
			dashboardNativeAgentOpenIndexDetail(
				new CustomEvent(DASHBOARD_NATIVE_AGENT_OPEN_INDEX_EVENT, {
					detail: { index: 0, provider: "other" },
				}),
			),
		).toBeNull();
		expect(
			dashboardNativeAgentOpenIndexDetail(
				new CustomEvent(DASHBOARD_NATIVE_AGENT_OPEN_INDEX_EVENT, {
					detail: { index: -1, provider: "capy" },
				}),
			),
		).toBeNull();
	});
});
