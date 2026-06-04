import { describe, expect, it } from "bun:test";
import {
	nativeAgentSessionRoute,
	publishDashboardNativeAgentCurrentSessionState,
	readDashboardNativeAgentCurrentSessionState,
} from "./native-agent-current-session-state";

function withWindow(run: () => void): void {
	const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
	const target = new EventTarget();
	const windowLike = {
		dispatchEvent: (event: Event) => target.dispatchEvent(event),
	};

	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: windowLike,
	});
	try {
		run();
	} finally {
		if (previousWindow) {
			Object.defineProperty(globalThis, "window", previousWindow);
		} else {
			delete (globalThis as { window?: unknown }).window;
		}
	}
}

describe("nativeAgentSessionRoute", () => {
	it("parses concrete native session routes", () => {
		expect(nativeAgentSessionRoute("/native/capy/thread-1")).toEqual({
			id: "thread-1",
			provider: "capy",
		});
		expect(nativeAgentSessionRoute("/native/devin/session%201")).toEqual({
			id: "session 1",
			provider: "devin",
		});
	});

	it("ignores provider overviews and unrelated routes", () => {
		expect(nativeAgentSessionRoute("/native/capy")).toBeNull();
		expect(nativeAgentSessionRoute("/web-tabs/google")).toBeNull();
	});
});

describe("dashboard native agent current session state", () => {
	it("reads only state matching the current route provider and id", () => {
		withWindow(() => {
			publishDashboardNativeAgentCurrentSessionState({
				id: "session-1",
				provider: "devin",
				sidebarHidden: false,
				sidebarPinned: true,
				title: "Pinned session",
			});

			expect(
				readDashboardNativeAgentCurrentSessionState("/native/devin/session-1"),
			).toEqual({
				id: "session-1",
				provider: "devin",
				sidebarHidden: false,
				sidebarPinned: true,
				title: "Pinned session",
			});
			expect(
				readDashboardNativeAgentCurrentSessionState("/native/capy/session-1"),
			).toBeNull();
			expect(
				readDashboardNativeAgentCurrentSessionState("/native/devin/session-2"),
			).toBeNull();
		});
	});
});
