import { NATIVE_AGENT_ASSET_PROTOCOL_SCHEME } from "shared/constants";
import { nativeAgentTimestampMs } from "./native-agent-ui";

export interface NativeAgentAttachment {
	fileSize: number | null;
	fileName: string;
	url: string;
}

export interface NativeAgentMessageForOrdering {
	createdAt: string | number | null | undefined;
}

export type ParsedNativeAgentMessagePart =
	| {
			key: string;
			kind: "text";
			value: string;
	  }
	| {
			attachment: NativeAgentAttachment;
			key: string;
			kind: "attachment";
	  }
	| {
			key: string;
			kind: "systemReminder";
			value: string;
	  };

const SYSTEM_REMINDER_PATTERN =
	/<system_reminder>([\s\S]*?)<\/system_reminder>/g;
const BARE_NATIVE_AGENT_IMAGE_URL_PATTERN =
	/https:\/\/(?:app\.devin\.ai|capy\.ai|www\.capy\.ai)\/[^\s<>"']+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^\s<>"']*)?/gi;
const PR_REFERENCE_PATTERN =
	/\[\[pr:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)]]/g;
const GITHUB_PULL_REQUEST_URL_PATTERN =
	/https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)(?:[/?#][^\s<>"')]*)?/g;
const DEVIN_SESSION_ID_PREFIX = "devin-";

type NativeAgentMessageToken =
	| {
			attachment: NativeAgentAttachment;
			endIndex: number;
			kind: "attachment";
			startIndex: number;
	  }
	| {
			attachment: NativeAgentAttachment;
			endIndex: number;
			kind: "bareImageUrl";
			startIndex: number;
	  }
	| {
			endIndex: number;
			kind: "systemReminder";
			startIndex: number;
			value: string;
	  };

export function formatNativeAgentFileSize(size: number | null): string | null {
	if (size == null || !Number.isFinite(size) || size < 0) return null;
	const units = ["B", "KB", "MB", "GB"];
	let value = size;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
	return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export function fileNameFromNativeAgentAttachmentUrl(url: string): string {
	try {
		const pathName = new URL(url).pathname;
		const name = decodeURIComponent(
			pathName.split("/").filter(Boolean).pop() ?? "",
		);
		return name || "Attachment";
	} catch {
		const name = url.split("/").filter(Boolean).pop();
		return name || "Attachment";
	}
}

export function parseNativeAgentAttachmentPayload(
	value: string,
): NativeAgentAttachment | null {
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}
		const record = parsed as Record<string, unknown>;
		const url = typeof record.url === "string" ? record.url.trim() : "";
		if (!url) return null;
		const fileSize =
			typeof record.fileSize === "number" && Number.isFinite(record.fileSize)
				? record.fileSize
				: null;
		return {
			fileName: fileNameFromNativeAgentAttachmentUrl(url),
			fileSize,
			url,
		};
	} catch {
		return null;
	}
}

function findAttachmentPayloadEnd(body: string, payloadStartIndex: number) {
	let depth = 0;
	let escaped = false;
	let inString = false;

	for (let index = payloadStartIndex; index < body.length; index += 1) {
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
		if (depth < 0) return null;
	}

	return null;
}

function findNativeAgentAttachmentTokens(
	body: string,
): NativeAgentMessageToken[] {
	const tokens: NativeAgentMessageToken[] = [];
	const marker = "ATTACHMENT:";
	let searchIndex = 0;

	while (searchIndex < body.length) {
		const markerIndex = body.indexOf(marker, searchIndex);
		if (markerIndex === -1) break;

		let payloadStartIndex = markerIndex + marker.length;
		while (/\s/.test(body[payloadStartIndex] ?? "")) payloadStartIndex += 1;
		if (body[payloadStartIndex] !== "{") {
			searchIndex = markerIndex + marker.length;
			continue;
		}

		const payloadEndIndex = findAttachmentPayloadEnd(body, payloadStartIndex);
		if (payloadEndIndex == null) {
			searchIndex = markerIndex + marker.length;
			continue;
		}

		const attachment = parseNativeAgentAttachmentPayload(
			body.slice(payloadStartIndex, payloadEndIndex),
		);
		if (attachment) {
			tokens.push({
				attachment,
				endIndex: payloadEndIndex,
				kind: "attachment",
				startIndex: markerIndex,
			});
		}
		searchIndex = payloadEndIndex;
	}

	return tokens;
}

export function devinSessionAppUrl(sessionId: string): string {
	const appSessionId = sessionId.startsWith(DEVIN_SESSION_ID_PREFIX)
		? sessionId.slice(DEVIN_SESSION_ID_PREFIX.length)
		: sessionId;
	return `https://app.devin.ai/sessions/${encodeURIComponent(appSessionId)}`;
}

export function normalizeDevinAppUrl(
	url: string | null | undefined,
): string | null {
	if (!url) return null;
	try {
		const parsed = new URL(url);
		if (parsed.host !== "app.devin.ai") return url;
		parsed.pathname = parsed.pathname.replace(
			/^\/sessions\/devin-/,
			"/sessions/",
		);
		return parsed.toString();
	} catch {
		return url.replace(
			"https://app.devin.ai/sessions/devin-",
			"https://app.devin.ai/sessions/",
		);
	}
}

export function nativeAgentAssetPreviewUrl(url: string): string {
	return `${NATIVE_AGENT_ASSET_PROTOCOL_SCHEME}://image/?url=${encodeURIComponent(url)}`;
}

export function shouldProxyNativeAgentAsset(url: string): boolean {
	try {
		const parsed = new URL(url);
		return (
			parsed.protocol === "https:" &&
			["app.devin.ai", "capy.ai", "www.capy.ai"].includes(parsed.host)
		);
	} catch {
		return false;
	}
}

export function isNativeAgentImageAttachment(
	attachment: NativeAgentAttachment,
): boolean {
	try {
		const pathName = new URL(attachment.url).pathname;
		return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(pathName);
	} catch {
		return /\.(avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(attachment.url);
	}
}

export function parseNativeAgentMessageParts(
	body: string,
): ParsedNativeAgentMessagePart[] {
	const parts: ParsedNativeAgentMessagePart[] = [];
	let lastIndex = 0;

	const tokens: NativeAgentMessageToken[] = [
		...findNativeAgentAttachmentTokens(body),
		...Array.from(body.matchAll(SYSTEM_REMINDER_PATTERN), (match) => ({
			endIndex: (match.index ?? 0) + match[0].length,
			kind: "systemReminder" as const,
			startIndex: match.index ?? 0,
			value: (match[1] ?? "").trim(),
		})),
		...Array.from(
			body.matchAll(BARE_NATIVE_AGENT_IMAGE_URL_PATTERN),
			(match) => ({
				attachment: {
					fileName: fileNameFromNativeAgentAttachmentUrl(match[0]),
					fileSize: null,
					url: match[0],
				},
				endIndex: (match.index ?? 0) + match[0].length,
				kind: "bareImageUrl" as const,
				startIndex: match.index ?? 0,
			}),
		),
	]
		.filter((token) => token.kind !== "systemReminder" || token.value)
		.sort((left, right) => left.startIndex - right.startIndex);

	for (const token of tokens) {
		const matchIndex = token.startIndex;
		if (matchIndex < lastIndex) continue;

		let part: ParsedNativeAgentMessagePart | null = null;
		if (token.kind === "attachment") {
			part = {
				attachment: token.attachment,
				key: `attachment:${matchIndex}:${token.attachment.url}`,
				kind: "attachment",
			};
		} else if (token.kind === "bareImageUrl") {
			part = {
				attachment: token.attachment,
				key: `bare-image:${matchIndex}:${token.attachment.url}`,
				kind: "attachment",
			};
		} else {
			part = {
				key: `system-reminder:${matchIndex}`,
				kind: "systemReminder",
				value: token.value,
			};
		}

		const textBefore = body.slice(lastIndex, matchIndex);
		if (textBefore) {
			parts.push({ key: `text:${lastIndex}`, kind: "text", value: textBefore });
		}
		parts.push(part);
		lastIndex = token.endIndex;
	}

	const textAfter = body.slice(lastIndex);
	if (textAfter) {
		parts.push({ key: `text:${lastIndex}`, kind: "text", value: textAfter });
	}

	return parts.length > 0
		? parts
		: [{ key: "text:0", kind: "text", value: body }];
}

export function markdownWithNativeAgentLinks(body: string): string {
	return body
		.replace(
			PR_REFERENCE_PATTERN,
			(_match, owner: string, repo: string, number: string) =>
				`[${owner}/${repo}#${number}](https://github.com/${owner}/${repo}/pull/${number})`,
		)
		.replace(
			GITHUB_PULL_REQUEST_URL_PATTERN,
			(
				match,
				owner: string,
				repo: string,
				number: string,
				offset: number,
				full: string,
			) => {
				if (full.slice(Math.max(0, offset - 2), offset) === "](") {
					return match;
				}
				return `[${owner}/${repo}#${number}](${match})`;
			},
		);
}

export function orderNativeAgentMessagesOldestFirst<
	T extends NativeAgentMessageForOrdering,
>(messages: T[]): T[] {
	return messages
		.map((message, index) => ({
			index,
			message,
			time: nativeAgentTimestampMs(message.createdAt),
		}))
		.sort((left, right) => {
			if (left.time == null && right.time == null) {
				return left.index - right.index;
			}
			if (left.time == null) return 1;
			if (right.time == null) return -1;
			return left.time - right.time || left.index - right.index;
		})
		.map(({ message }) => message);
}
