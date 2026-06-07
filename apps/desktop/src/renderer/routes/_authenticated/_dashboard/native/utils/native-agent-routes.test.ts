import { describe, expect, it } from "bun:test";
import {
	activeNativeAgentRoute,
	isNativeAgentProviderOverviewRoute,
} from "./native-agent-routes";

describe("native agent routes", () => {
	it("matches provider overview routes separately from session routes", () => {
		const overview = activeNativeAgentRoute("/native/capy");
		expect(overview).toEqual({ id: null, provider: "capy" });
		expect(isNativeAgentProviderOverviewRoute(overview, "capy")).toBe(true);

		const session = activeNativeAgentRoute("/native/capy/thread-1");
		expect(session).toEqual({ id: "thread-1", provider: "capy" });
		expect(isNativeAgentProviderOverviewRoute(session, "capy")).toBe(false);
	});

	it("decodes selected native agent ids from route params", () => {
		expect(
			activeNativeAgentRoute("/native/devin/devin%2Fwith%20space"),
		).toEqual({
			id: "devin/with space",
			provider: "devin",
		});
	});

	it("ignores non-native routes", () => {
		expect(activeNativeAgentRoute("/web-tabs/google")).toEqual({
			id: null,
			provider: null,
		});
	});
});
