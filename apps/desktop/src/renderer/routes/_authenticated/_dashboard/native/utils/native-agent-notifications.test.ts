import { describe, expect, it } from "bun:test";
import {
	compactNativeAgentReplyPreview,
	getUnreadNativeAgentReplyNotifications,
	NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY,
	nativeAgentNotificationKey,
	readLatestNativeAgentReplyNotification,
	writeLatestNativeAgentReplyNotification,
} from "./native-agent-notifications";

describe("native agent reply notifications", () => {
	it("builds notifications only for unread agent replies", () => {
		const capyKey = nativeAgentNotificationKey("capy", "thread-1");
		const notifications = getUnreadNativeAgentReplyNotifications({
			activeIdByProvider: { capy: null, devin: "session-active" },
			itemsByProvider: {
				capy: [
					{
						id: "thread-1",
						latestMessage: {
							body: "Capy has an update",
							createdAt: "2026-06-01T12:00:00.000Z",
							role: "assistant",
						},
						provider: "capy",
						title: "Capy thread",
					},
					{
						id: "thread-2",
						latestMessage: {
							body: "human follow-up",
							createdAt: "2026-06-01T12:02:00.000Z",
							role: "human",
						},
						provider: "capy",
						title: "Human update",
					},
				],
				devin: [
					{
						id: "session-active",
						latestMessage: {
							body: "active session update",
							createdAt: "2026-06-01T12:03:00.000Z",
							role: "devin_message",
						},
						provider: "devin",
						title: "Open Devin",
					},
				],
			},
			notifiedState: {},
			readState: { [capyKey]: Date.parse("2026-06-01T11:59:00.000Z") },
		});

		expect(notifications).toEqual([
			{
				id: "thread-1",
				key: capyKey,
				latestTime: Date.parse("2026-06-01T12:00:00.000Z"),
				preview: "Capy has an update",
				provider: "capy",
				title: "Capy thread",
			},
		]);
	});

	it("suppresses already notified replies", () => {
		const key = nativeAgentNotificationKey("devin", "session-1");
		const notifications = getUnreadNativeAgentReplyNotifications({
			activeIdByProvider: {},
			itemsByProvider: {
				capy: [],
				devin: [
					{
						id: "session-1",
						latestMessage: {
							body: "same update",
							createdAt: "2026-06-01T12:00:00.000Z",
							role: "devin_message",
						},
						provider: "devin",
						title: "Devin session",
					},
				],
			},
			notifiedState: { [key]: Date.parse("2026-06-01T12:00:00.000Z") },
			readState: {},
		});

		expect(notifications).toEqual([]);
	});

	it("compacts noisy provider payloads for toast previews", () => {
		expect(
			compactNativeAgentReplyPreview(
				`Done

ATTACHMENT:{"url":"https://app.devin.ai/file.png","fileSize":1}
<system_reminder>hidden</system_reminder>`,
			),
		).toBe("Done [attachment] [system]");
	});

	it("compacts nested attachment payloads without leaking raw JSON", () => {
		expect(
			compactNativeAgentReplyPreview(
				`Done ATTACHMENT:{"url":"https://app.devin.ai/file.png","metadata":{"kind":"image","label":"brace } in string"}} tail`,
			),
		).toBe("Done [attachment] tail");
	});

	it("persists the latest reply notification for keyboard jumps", () => {
		const values: Record<string, string> = {};
		const previous = Object.getOwnPropertyDescriptor(
			globalThis,
			"localStorage",
		);
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: {
				getItem: (key: string) => values[key] ?? null,
				setItem: (key: string, value: string) => {
					values[key] = value;
				},
			},
		});
		try {
			writeLatestNativeAgentReplyNotification({
				id: "thread-1",
				key: "capy:thread-1",
				latestTime: 1780323000000,
				preview: "Done",
				provider: "capy",
				title: "Capy thread",
			});

			expect(values[NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY]).toBeString();
			expect(readLatestNativeAgentReplyNotification()).toEqual({
				id: "thread-1",
				key: "capy:thread-1",
				latestTime: 1780323000000,
				preview: "Done",
				provider: "capy",
				title: "Capy thread",
			});
		} finally {
			if (previous) Object.defineProperty(globalThis, "localStorage", previous);
			else delete (globalThis as { localStorage?: unknown }).localStorage;
		}
	});
});
