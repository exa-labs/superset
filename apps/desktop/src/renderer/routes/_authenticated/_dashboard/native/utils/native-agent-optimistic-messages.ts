import { orderNativeAgentMessagesOldestFirst } from "./native-agent-message-rendering";
import {
	type NativeAgentProvider,
	nativeAgentTimestampMs,
	normalizeNativeAgentRole,
} from "./native-agent-ui";

export interface NativeAgentConfirmedMessage {
	id: string;
	body: string;
	createdAt: string | number | null | undefined;
	role?: string | null;
}

export type NativeAgentOptimisticMessage = NativeAgentConfirmedMessage & {
	provider: NativeAgentProvider;
	targetId: string;
};

export function hasConfirmedNativeAgentUserMessage(
	confirmedMessages: readonly NativeAgentConfirmedMessage[],
	optimisticMessage: NativeAgentOptimisticMessage,
	provider: NativeAgentProvider,
): boolean {
	const optimisticBody = optimisticMessage.body.trim();
	if (!optimisticBody) return false;
	const optimisticTime = nativeAgentTimestampMs(optimisticMessage.createdAt);

	return confirmedMessages.some((message) => {
		if (!normalizeNativeAgentRole(message.role, provider).isUser) return false;
		if (message.body.trim() !== optimisticBody) return false;
		const confirmedTime = nativeAgentTimestampMs(message.createdAt);
		if (optimisticTime == null || confirmedTime == null) return true;
		return Math.abs(confirmedTime - optimisticTime) < 10 * 60 * 1000;
	});
}

export function pendingNativeAgentOptimisticMessages(input: {
	confirmedMessages: readonly NativeAgentConfirmedMessage[];
	optimisticMessages: readonly NativeAgentOptimisticMessage[];
	provider: NativeAgentProvider;
	targetId: string | null | undefined;
}): NativeAgentOptimisticMessage[] {
	if (!input.targetId) return [];
	return input.optimisticMessages.filter(
		(message) =>
			message.provider === input.provider &&
			message.targetId === input.targetId &&
			!hasConfirmedNativeAgentUserMessage(
				input.confirmedMessages,
				message,
				input.provider,
			),
	);
}

export function mergeNativeAgentMessagesWithOptimistic(input: {
	confirmedMessages: NativeAgentConfirmedMessage[];
	optimisticMessages: readonly NativeAgentOptimisticMessage[];
	provider: NativeAgentProvider;
	targetId: string | null | undefined;
}): NativeAgentConfirmedMessage[] {
	return orderNativeAgentMessagesOldestFirst([
		...input.confirmedMessages,
		...pendingNativeAgentOptimisticMessages(input),
	]);
}

export function pruneConfirmedNativeAgentOptimisticMessages(input: {
	confirmedMessages: readonly NativeAgentConfirmedMessage[];
	optimisticMessages: readonly NativeAgentOptimisticMessage[];
	provider: NativeAgentProvider;
	targetId: string | null | undefined;
}): NativeAgentOptimisticMessage[] {
	if (!input.targetId) return [...input.optimisticMessages];
	const pendingForTarget = new Set(
		pendingNativeAgentOptimisticMessages(input).map((message) => message.id),
	);
	return input.optimisticMessages.filter((message) => {
		if (
			message.provider !== input.provider ||
			message.targetId !== input.targetId
		) {
			return true;
		}
		return pendingForTarget.has(message.id);
	});
}
