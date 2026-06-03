import { describe, expect, it } from "bun:test";
import {
	isNativeAgentLiveStatus,
	nativeAgentConversationLabel,
	nativeAgentConversationSetLabel,
	nativeAgentOverviewCardKeyboardHints,
	nativeAgentProviderConfig,
	nativeAgentStatusBadgeLabel,
	normalizeNativeAgentRole,
} from "./native-agent-ui";

describe("native agent UI terminology", () => {
	it("uses shared provider config for Capy and Devin", () => {
		expect(nativeAgentProviderConfig("capy")).toMatchObject({
			agentLabel: "Capy",
			conversationLabel: "thread",
			conversationLabelPlural: "threads",
			title: "Capy",
		});
		expect(nativeAgentProviderConfig("devin")).toMatchObject({
			agentLabel: "Devin",
			conversationLabel: "session",
			conversationLabelPlural: "sessions",
			title: "Devin",
		});
		expect(nativeAgentConversationLabel("capy", { plural: true })).toBe(
			"threads",
		);
		expect(nativeAgentConversationSetLabel("devin")).toBe("Devin sessions");
	});

	it("normalizes human, system, and agent roles across providers", () => {
		expect(normalizeNativeAgentRole("initial_user_message", "devin")).toEqual({
			isSystem: false,
			isUser: true,
			kind: "user",
			label: "You",
		});
		expect(normalizeNativeAgentRole("human", "capy")).toMatchObject({
			isUser: true,
			label: "You",
		});
		expect(normalizeNativeAgentRole("system_reminder", "capy")).toMatchObject({
			isSystem: true,
			label: "System",
		});
		expect(normalizeNativeAgentRole("assistant", "capy")).toMatchObject({
			isUser: false,
			label: "Capy",
		});
		expect(normalizeNativeAgentRole(undefined, "devin")).toMatchObject({
			isUser: false,
			label: "Devin",
		});
	});

	it("normalizes live statuses used by both provider sidebars", () => {
		expect(isNativeAgentLiveStatus("working")).toBe(true);
		expect(isNativeAgentLiveStatus("running")).toBe(true);
		expect(isNativeAgentLiveStatus("blocked")).toBe(true);
		expect(isNativeAgentLiveStatus("suspended")).toBe(true);
		expect(isNativeAgentLiveStatus("finished")).toBe(false);
	});

	it("keeps status badge labels compact for narrow sidebar rows", () => {
		expect(nativeAgentStatusBadgeLabel("finished")).toBe("done");
		expect(nativeAgentStatusBadgeLabel("running")).toBe("run");
		expect(nativeAgentStatusBadgeLabel("ready")).toBe("ready");
		expect(nativeAgentStatusBadgeLabel("waiting_for_input")).toBe("waiting");
	});

	it("surfaces overview card keyboard hints for primary inbox actions", () => {
		expect(nativeAgentOverviewCardKeyboardHints()).toEqual([
			{ key: "Enter", title: "Open" },
			{ key: "p", title: "Pin or unpin" },
			{ key: "m", title: "Move to folder" },
			{ key: "e", title: "Rename" },
			{ key: "x", title: "Archive or hide" },
		]);
	});
});
