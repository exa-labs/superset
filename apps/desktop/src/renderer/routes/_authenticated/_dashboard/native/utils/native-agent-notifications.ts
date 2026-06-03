import {
	type NativeAgentProvider,
	nativeAgentTimestampMs,
	normalizeNativeAgentRole,
} from "./native-agent-ui";

export interface NativeAgentNotificationItem {
	id: string;
	provider: NativeAgentProvider;
	title: string;
	latestMessage?: {
		body: string;
		createdAt: string | number | null | undefined;
		role?: string | null;
	} | null;
}

export interface NativeAgentReplyNotification {
	id: string;
	key: string;
	latestTime: number;
	preview: string;
	provider: NativeAgentProvider;
	title: string;
}

export const NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY =
	"dashboard-native-agent-latest-reply-v1";
export const NATIVE_AGENT_READ_STATE_STORAGE_KEY =
	"dashboard-native-agent-read-state-v1";
export const NATIVE_AGENT_READ_STATE_CHANGE_EVENT =
	"dashboard-native-agent-read-state-change";

export type NativeAgentReadState = Record<string, number>;

type NativeAgentNotificationStorage = Pick<Storage, "getItem" | "setItem">;

function getLocalStorage(): NativeAgentNotificationStorage | null {
	if (typeof localStorage === "undefined") return null;
	return localStorage;
}

function dispatchNativeAgentReadStateChange(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(NATIVE_AGENT_READ_STATE_CHANGE_EVENT));
}

export function nativeAgentNotificationKey(
	provider: NativeAgentProvider,
	id: string,
): string {
	return `${provider}:${id}`;
}

export function readNativeAgentReadState(
	storage: NativeAgentNotificationStorage | null = getLocalStorage(),
): NativeAgentReadState {
	if (!storage) return {};
	try {
		const raw = storage.getItem(NATIVE_AGENT_READ_STATE_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		return Object.fromEntries(
			Object.entries(parsed).filter(
				(entry): entry is [string, number] =>
					typeof entry[0] === "string" &&
					typeof entry[1] === "number" &&
					Number.isFinite(entry[1]),
			),
		);
	} catch {
		return {};
	}
}

export function writeNativeAgentReadState(
	readState: NativeAgentReadState,
	storage: NativeAgentNotificationStorage | null = getLocalStorage(),
): void {
	if (!storage) return;
	try {
		storage.setItem(
			NATIVE_AGENT_READ_STATE_STORAGE_KEY,
			JSON.stringify(readState),
		);
		dispatchNativeAgentReadStateChange();
	} catch {}
}

export function isNativeAgentReplyNotificationRead(
	notification: Pick<NativeAgentReplyNotification, "key" | "latestTime">,
	readState: NativeAgentReadState = readNativeAgentReadState(),
): boolean {
	return (readState[notification.key] ?? 0) >= notification.latestTime;
}

export function markNativeAgentReplyNotificationRead(
	notification: Pick<NativeAgentReplyNotification, "key" | "latestTime">,
	storage: NativeAgentNotificationStorage | null = getLocalStorage(),
): NativeAgentReadState {
	const current = readNativeAgentReadState(storage);
	if (isNativeAgentReplyNotificationRead(notification, current)) return current;
	const next = { ...current, [notification.key]: notification.latestTime };
	writeNativeAgentReadState(next, storage);
	return next;
}

export function compactNativeAgentReplyPreview(
	body: string,
	maxLength = 140,
): string {
	const compacted = replaceNativeAgentAttachmentMarkers(body)
		.replace(/<system_reminder>[\s\S]*?<\/system_reminder>/g, "[system]")
		.replace(/\s+/g, " ")
		.trim();
	if (compacted.length <= maxLength) return compacted;
	return `${compacted.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function replaceNativeAgentAttachmentMarkers(body: string): string {
	let output = "";
	let index = 0;
	while (index < body.length) {
		const markerIndex = body.indexOf("ATTACHMENT:", index);
		if (markerIndex === -1) {
			output += body.slice(index);
			break;
		}
		output += body.slice(index, markerIndex);
		let payloadStart = markerIndex + "ATTACHMENT:".length;
		while (/\s/.test(body[payloadStart] ?? "")) payloadStart += 1;
		if (body[payloadStart] !== "{") {
			output += "ATTACHMENT:";
			index = markerIndex + "ATTACHMENT:".length;
			continue;
		}
		const payloadEnd = nativeAgentAttachmentPayloadEnd(body, payloadStart);
		if (payloadEnd == null) {
			output += "ATTACHMENT:";
			index = markerIndex + "ATTACHMENT:".length;
			continue;
		}
		output += "[attachment]";
		index = payloadEnd;
	}
	return output;
}

function nativeAgentAttachmentPayloadEnd(
	body: string,
	payloadStart: number,
): number | null {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = payloadStart; index < body.length; index += 1) {
		const char = body[index];
		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}
		if (char === '"') {
			inString = true;
			continue;
		}
		if (char === "{") {
			depth += 1;
			continue;
		}
		if (char !== "}") continue;
		depth -= 1;
		if (depth === 0) return index + 1;
	}
	return null;
}

export function getUnreadNativeAgentReplyNotification(input: {
	activeId?: string | null;
	item: NativeAgentNotificationItem;
	notifiedState: Record<string, number>;
	readState: Record<string, number>;
}): NativeAgentReplyNotification | null {
	const { activeId, item, notifiedState, readState } = input;
	const latestMessage = item.latestMessage;
	if (!latestMessage) return null;
	if (activeId === item.id) return null;
	if (normalizeNativeAgentRole(latestMessage.role, item.provider).isUser) {
		return null;
	}
	const latestTime = nativeAgentTimestampMs(latestMessage.createdAt);
	if (latestTime == null) return null;
	const key = nativeAgentNotificationKey(item.provider, item.id);
	if (latestTime <= (readState[key] ?? 0)) return null;
	if (latestTime <= (notifiedState[key] ?? 0)) return null;
	return {
		id: item.id,
		key,
		latestTime,
		preview: compactNativeAgentReplyPreview(latestMessage.body),
		provider: item.provider,
		title: item.title,
	};
}

export function getUnreadNativeAgentReplyNotifications(input: {
	activeIdByProvider: Partial<Record<NativeAgentProvider, string | null>>;
	itemsByProvider: Record<NativeAgentProvider, NativeAgentNotificationItem[]>;
	notifiedState: Record<string, number>;
	readState: Record<string, number>;
}): NativeAgentReplyNotification[] {
	return (
		Object.entries(input.itemsByProvider) as Array<
			[NativeAgentProvider, NativeAgentNotificationItem[]]
		>
	)
		.flatMap(([provider, items]) =>
			items.map((item) =>
				getUnreadNativeAgentReplyNotification({
					activeId: input.activeIdByProvider[provider],
					item,
					notifiedState: input.notifiedState,
					readState: input.readState,
				}),
			),
		)
		.filter(
			(notification): notification is NativeAgentReplyNotification =>
				notification != null,
		)
		.sort((left, right) => right.latestTime - left.latestTime);
}

export function writeLatestNativeAgentReplyNotification(
	notification: NativeAgentReplyNotification,
): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(
			NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY,
			JSON.stringify(notification),
		);
	} catch {}
}

export function readLatestNativeAgentReplyNotification(): NativeAgentReplyNotification | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<NativeAgentReplyNotification>;
		if (
			(parsed.provider !== "capy" && parsed.provider !== "devin") ||
			typeof parsed.id !== "string" ||
			typeof parsed.key !== "string" ||
			typeof parsed.latestTime !== "number" ||
			typeof parsed.preview !== "string" ||
			typeof parsed.title !== "string"
		) {
			return null;
		}
		return parsed as NativeAgentReplyNotification;
	} catch {
		return null;
	}
}
