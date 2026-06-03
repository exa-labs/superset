import { describe, expect, it } from "bun:test";
import {
	compactNativeAgentReplyPreview,
	getLatestUnreadNativeAgentReplyItem,
	getUnreadNativeAgentReplyNotifications,
	isNativeAgentReplyNotificationRead,
	markNativeAgentReplyNotificationRead,
	NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY,
	NATIVE_AGENT_READ_STATE_STORAGE_KEY,
	nativeAgentNotificationKey,
	readLatestNativeAgentReplyNotification,
	readNativeAgentReadState,
	writeLatestNativeAgentReplyNotification,
	writeNativeAgentReadState,
} from "./native-agent-notifications";

describe("native agent reply notifications", () => {
	function withLocalStorage(
		values: Record<string, string>,
		run: () => void,
	): void {
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
			run();
		} finally {
			if (previous) Object.defineProperty(globalThis, "localStorage", previous);
			else delete (globalThis as { localStorage?: unknown }).localStorage;
		}
	}

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

	it("selects the newest unread agent-authored reply for global keyboard jumps", () => {
		const readCapyKey = nativeAgentNotificationKey("capy", "read-thread");
		const latest = getLatestUnreadNativeAgentReplyItem({
			itemsByProvider: {
				capy: [
					{
						id: "read-thread",
						latestMessage: {
							body: "already read",
							createdAt: "2026-06-01T12:00:00.000Z",
							role: "assistant",
						},
						provider: "capy",
						title: "Read Capy",
					},
					{
						id: "human-thread",
						latestMessage: {
							body: "human typed most recently",
							createdAt: "2026-06-01T12:05:00.000Z",
							role: "human",
						},
						provider: "capy",
						title: "Human Capy",
					},
				],
				devin: [
					{
						id: "newest-unread",
						latestMessage: {
							body: "newest agent reply",
							createdAt: "2026-06-01T12:04:00.000Z",
							role: "devin_message",
						},
						provider: "devin",
						title: "Newest Devin",
					},
					{
						id: "older-unread",
						latestMessage: {
							body: "older agent reply",
							createdAt: "2026-06-01T12:01:00.000Z",
							role: "devin_message",
						},
						provider: "devin",
						title: "Older Devin",
					},
				],
			},
			readState: { [readCapyKey]: Date.parse("2026-06-01T12:00:00.000Z") },
		});

		expect(latest?.id).toBe("newest-unread");
		expect(latest?.provider).toBe("devin");
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
		withLocalStorage({}, () => {
			writeLatestNativeAgentReplyNotification({
				id: "thread-1",
				key: "capy:thread-1",
				latestTime: 1780323000000,
				preview: "Done",
				provider: "capy",
				title: "Capy thread",
			});

			expect(
				localStorage.getItem(NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY),
			).toBeString();
			expect(readLatestNativeAgentReplyNotification()).toEqual({
				id: "thread-1",
				key: "capy:thread-1",
				latestTime: 1780323000000,
				preview: "Done",
				provider: "capy",
				title: "Capy thread",
			});
		});
	});

	it("persists and updates native reply read state for keyboard acknowledgement", () => {
		withLocalStorage({}, () => {
			const notification = {
				key: "devin:session-1",
				latestTime: 1780323000000,
			};

			expect(isNativeAgentReplyNotificationRead(notification)).toBe(false);

			markNativeAgentReplyNotificationRead(notification);

			expect(readNativeAgentReadState()).toEqual({
				"devin:session-1": 1780323000000,
			});
			expect(isNativeAgentReplyNotificationRead(notification)).toBe(true);

			writeNativeAgentReadState({ "capy:thread-1": 1780322000000 });
			expect(localStorage.getItem(NATIVE_AGENT_READ_STATE_STORAGE_KEY)).toBe(
				JSON.stringify({ "capy:thread-1": 1780322000000 }),
			);
		});
	});
});
