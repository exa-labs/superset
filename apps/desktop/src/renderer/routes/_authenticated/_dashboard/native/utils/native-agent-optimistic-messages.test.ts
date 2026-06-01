import { describe, expect, it } from "bun:test";
import {
	hasConfirmedNativeAgentUserMessage,
	mergeNativeAgentMessagesWithOptimistic,
	pendingNativeAgentOptimisticMessages,
	pruneConfirmedNativeAgentOptimisticMessages,
} from "./native-agent-optimistic-messages";

describe("native agent optimistic messages", () => {
	it("keeps a sent user message visible before the API echoes it", () => {
		const messages = mergeNativeAgentMessagesWithOptimistic({
			confirmedMessages: [
				{
					body: "hello",
					createdAt: "2026-06-01T10:00:00.000Z",
					id: "agent-1",
					role: "assistant",
				},
			],
			optimisticMessages: [
				{
					body: "please check this",
					createdAt: "2026-06-01T10:01:00.000Z",
					id: "optimistic-1",
					provider: "devin",
					role: "user",
					targetId: "devin-1",
				},
			],
			provider: "devin",
			targetId: "devin-1",
		});

		expect(messages.map((message) => message.id)).toEqual([
			"agent-1",
			"optimistic-1",
		]);
	});

	it("removes the optimistic copy once the API confirms the same user message", () => {
		const optimistic = {
			body: "please check this",
			createdAt: "2026-06-01T10:01:00.000Z",
			id: "optimistic-1",
			provider: "capy" as const,
			role: "user",
			targetId: "thread-1",
		};
		const confirmedMessages = [
			{
				body: "please check this",
				createdAt: "2026-06-01T10:01:05.000Z",
				id: "confirmed-1",
				role: "human",
			},
		];

		expect(
			hasConfirmedNativeAgentUserMessage(confirmedMessages, optimistic, "capy"),
		).toBe(true);
		expect(
			pendingNativeAgentOptimisticMessages({
				confirmedMessages,
				optimisticMessages: [optimistic],
				provider: "capy",
				targetId: "thread-1",
			}),
		).toEqual([]);
	});

	it("keeps unrelated optimistic messages scoped to their provider and target", () => {
		const pending = pendingNativeAgentOptimisticMessages({
			confirmedMessages: [],
			optimisticMessages: [
				{
					body: "current",
					createdAt: 1,
					id: "current",
					provider: "devin",
					role: "user",
					targetId: "devin-1",
				},
				{
					body: "other target",
					createdAt: 1,
					id: "other-target",
					provider: "devin",
					role: "user",
					targetId: "devin-2",
				},
				{
					body: "other provider",
					createdAt: 1,
					id: "other-provider",
					provider: "capy",
					role: "user",
					targetId: "devin-1",
				},
			],
			provider: "devin",
			targetId: "devin-1",
		});

		expect(pending.map((message) => message.id)).toEqual(["current"]);
	});

	it("does not dedupe against old same-text messages outside the send window", () => {
		expect(
			hasConfirmedNativeAgentUserMessage(
				[
					{
						body: "retry",
						createdAt: "2026-06-01T09:00:00.000Z",
						id: "old",
						role: "user",
					},
				],
				{
					body: "retry",
					createdAt: "2026-06-01T10:00:00.000Z",
					id: "optimistic",
					provider: "devin",
					role: "user",
					targetId: "devin-1",
				},
				"devin",
			),
		).toBe(false);
	});

	it("does not dedupe against an agent message with the same body", () => {
		expect(
			hasConfirmedNativeAgentUserMessage(
				[
					{
						body: "same words",
						createdAt: "2026-06-01T10:00:05.000Z",
						id: "assistant-echo",
						role: "assistant",
					},
				],
				{
					body: "same words",
					createdAt: "2026-06-01T10:00:00.000Z",
					id: "optimistic",
					provider: "devin",
					role: "user",
					targetId: "devin-1",
				},
				"devin",
			),
		).toBe(false);
	});

	it("orders confirmed and optimistic messages oldest first after merging", () => {
		const messages = mergeNativeAgentMessagesWithOptimistic({
			confirmedMessages: [
				{
					body: "later agent",
					createdAt: "2026-06-01T10:02:00.000Z",
					id: "agent-later",
					role: "assistant",
				},
				{
					body: "earlier agent",
					createdAt: "2026-06-01T10:00:00.000Z",
					id: "agent-earlier",
					role: "assistant",
				},
			],
			optimisticMessages: [
				{
					body: "middle user",
					createdAt: "2026-06-01T10:01:00.000Z",
					id: "optimistic-middle",
					provider: "capy",
					role: "user",
					targetId: "thread-1",
				},
			],
			provider: "capy",
			targetId: "thread-1",
		});

		expect(messages.map((message) => message.id)).toEqual([
			"agent-earlier",
			"optimistic-middle",
			"agent-later",
		]);
	});

	it("prunes confirmed optimistic messages only for the active target", () => {
		const optimisticMessages = [
			{
				body: "confirmed current",
				createdAt: "2026-06-01T10:01:00.000Z",
				id: "current-confirmed",
				provider: "capy" as const,
				role: "user",
				targetId: "thread-1",
			},
			{
				body: "pending current",
				createdAt: "2026-06-01T10:02:00.000Z",
				id: "current-pending",
				provider: "capy" as const,
				role: "user",
				targetId: "thread-1",
			},
			{
				body: "other thread",
				createdAt: "2026-06-01T10:02:00.000Z",
				id: "other-thread",
				provider: "capy" as const,
				role: "user",
				targetId: "thread-2",
			},
			{
				body: "other provider",
				createdAt: "2026-06-01T10:02:00.000Z",
				id: "other-provider",
				provider: "devin" as const,
				role: "user",
				targetId: "thread-1",
			},
		];

		expect(
			pruneConfirmedNativeAgentOptimisticMessages({
				confirmedMessages: [
					{
						body: "confirmed current",
						createdAt: "2026-06-01T10:01:02.000Z",
						id: "confirmed-api",
						role: "human",
					},
				],
				optimisticMessages,
				provider: "capy",
				targetId: "thread-1",
			}).map((message) => message.id),
		).toEqual(["current-pending", "other-thread", "other-provider"]);
	});
});
