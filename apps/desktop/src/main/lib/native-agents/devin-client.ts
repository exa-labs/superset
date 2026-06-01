import type { DevinApiFlavor } from "./credentials";
import { nativeAgentFetchJson } from "./http";

const DEVIN_V1_BASE_URL = "https://api.devin.ai/v1/";
const DEVIN_V3_BASE_URL = "https://api.devin.ai/v3/";

export interface DevinSession {
	id: string;
	title: string | null;
	status: string | null;
	url: string | null;
	tags: string[];
	createdAt: string | number | null;
	updatedAt: string | number | null;
	isArchived: boolean;
	pullRequestUrl: string | null;
	requestingUserEmail: string | null;
	latestMessage?: DevinMessage | null;
}

export interface DevinMessage {
	id: string;
	body: string;
	createdAt: string | number | null;
	role: string | null;
}

export interface DevinListSessionsResult {
	items: DevinSession[];
	nextCursor: string | null;
	hasMore: boolean;
	total: number | null;
}

interface DevinClientOptions {
	flavor: DevinApiFlavor;
	orgId: string | null;
	token: string;
}

function toStringOrNull(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value : null;
}

function toTags(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

function normalizePullRequestUrl(value: unknown): string | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	return toStringOrNull(record.url) ?? toStringOrNull(record.pr_url);
}

function devinSessionAppUrl(sessionId: string | null): string | null {
	if (!sessionId) return null;
	const appSessionId = sessionId.startsWith("devin-")
		? sessionId.slice("devin-".length)
		: sessionId;
	return `https://app.devin.ai/sessions/${encodeURIComponent(appSessionId)}`;
}

function normalizeDevinAppUrl(
	value: unknown,
	sessionId: string | null,
): string | null {
	const rawUrl = toStringOrNull(value);
	if (!rawUrl) return devinSessionAppUrl(sessionId);
	try {
		const url = new URL(rawUrl);
		if (url.hostname !== "app.devin.ai") return rawUrl;
		const match = url.pathname.match(/^\/sessions\/(devin-[^/?#]+)/);
		if (!match?.[1]) return rawUrl;
		url.pathname = `/sessions/${match[1].slice("devin-".length)}`;
		return url.toString();
	} catch {
		return rawUrl;
	}
}

function normalizeV1Session(value: unknown): DevinSession {
	const record =
		value && typeof value === "object" && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	const sessionId = toStringOrNull(record.session_id);
	return {
		id: sessionId ?? "",
		title: toStringOrNull(record.title),
		status: toStringOrNull(record.status_enum) ?? toStringOrNull(record.status),
		url: normalizeDevinAppUrl(record.url, sessionId),
		tags: toTags(record.tags),
		createdAt: toStringOrNull(record.created_at),
		updatedAt: toStringOrNull(record.updated_at),
		isArchived: record.is_archived === true,
		pullRequestUrl: normalizePullRequestUrl(record.pull_request),
		requestingUserEmail: toStringOrNull(record.requesting_user_email),
	};
}

function normalizeV3Session(value: unknown): DevinSession {
	const record =
		value && typeof value === "object" && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	const pullRequests = Array.isArray(record.pull_requests)
		? record.pull_requests
		: [];
	const firstPullRequest = pullRequests[0];
	const sessionId = toStringOrNull(record.session_id);
	return {
		id: sessionId ?? "",
		title: toStringOrNull(record.title),
		status: toStringOrNull(record.status),
		url: normalizeDevinAppUrl(record.url, sessionId),
		tags: toTags(record.tags),
		createdAt:
			typeof record.created_at === "number"
				? record.created_at
				: toStringOrNull(record.created_at),
		updatedAt:
			typeof record.updated_at === "number"
				? record.updated_at
				: toStringOrNull(record.updated_at),
		isArchived: record.is_archived === true,
		pullRequestUrl: normalizePullRequestUrl(firstPullRequest),
		requestingUserEmail:
			toStringOrNull(record.user_email) ??
			toStringOrNull(record.created_by_email),
	};
}

function normalizeMessage(value: unknown, index: number): DevinMessage {
	const record =
		value && typeof value === "object" && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	return {
		id:
			toStringOrNull(record.event_id) ??
			toStringOrNull(record.id) ??
			`message-${index}`,
		body:
			toStringOrNull(record.message) ??
			toStringOrNull(record.content) ??
			toStringOrNull(record.text) ??
			JSON.stringify(value),
		createdAt:
			typeof record.created_at === "number"
				? record.created_at
				: (toStringOrNull(record.created_at) ??
					toStringOrNull(record.createdAt)),
		role:
			toStringOrNull(record.role) ??
			toStringOrNull(record.author) ??
			toStringOrNull(record.type),
	};
}

export class DevinClient {
	constructor(private readonly options: DevinClientOptions) {}

	private get isV3() {
		return this.options.flavor === "v3";
	}

	private get orgPath() {
		if (!this.options.orgId) {
			throw new Error("Devin organization ID is required for v3 credentials");
		}
		return `organizations/${encodeURIComponent(this.options.orgId)}`;
	}

	async listSessions(
		input: {
			cursor?: string | null;
			limit?: number;
			offset?: number;
			tags?: string[];
			userEmail?: string | null;
		} = {},
	): Promise<DevinListSessionsResult> {
		if (this.isV3) {
			const response = await nativeAgentFetchJson<{
				items: unknown[];
				end_cursor?: string | null;
				has_next_page?: boolean;
				total?: number | null;
			}>({
				baseUrl: DEVIN_V3_BASE_URL,
				path: `${this.orgPath}/sessions`,
				query: {
					after: input.cursor,
					limit: input.limit ?? 50,
					tags: input.tags,
				},
				token: this.options.token,
			});
			return {
				items: response.items.map(normalizeV3Session).filter((item) => item.id),
				nextCursor: response.end_cursor ?? null,
				hasMore: response.has_next_page === true,
				total: response.total ?? null,
			};
		}

		const response = await nativeAgentFetchJson<{ sessions: unknown[] }>({
			baseUrl: DEVIN_V1_BASE_URL,
			path: "sessions",
			query: {
				limit: input.limit ?? 50,
				offset: input.offset ?? 0,
				tags: input.tags,
				user_email: input.userEmail,
			},
			token: this.options.token,
		});
		return {
			items: response.sessions
				.map(normalizeV1Session)
				.filter((item) => item.id),
			nextCursor: null,
			hasMore: false,
			total: response.sessions.length,
		};
	}

	async getSession(sessionId: string): Promise<{
		session: DevinSession;
		messages: DevinMessage[];
	}> {
		if (this.isV3) {
			const session = await nativeAgentFetchJson<unknown>({
				baseUrl: DEVIN_V3_BASE_URL,
				path: `${this.orgPath}/sessions/${encodeURIComponent(sessionId)}`,
				token: this.options.token,
			});
			const messages = await this.listMessages(sessionId);
			return { session: normalizeV3Session(session), messages };
		}

		const response = await nativeAgentFetchJson<Record<string, unknown>>({
			baseUrl: DEVIN_V1_BASE_URL,
			path: `sessions/${encodeURIComponent(sessionId)}`,
			token: this.options.token,
		});
		const rawMessages = Array.isArray(response.messages)
			? response.messages
			: [];
		return {
			session: normalizeV1Session(response),
			messages: rawMessages.map(normalizeMessage),
		};
	}

	async listMessages(sessionId: string): Promise<DevinMessage[]> {
		if (!this.isV3) {
			return (await this.getSession(sessionId)).messages;
		}
		const response = await nativeAgentFetchJson<{
			items: unknown[];
		}>({
			baseUrl: DEVIN_V3_BASE_URL,
			path: `${this.orgPath}/sessions/${encodeURIComponent(sessionId)}/messages`,
			query: { limit: 100 },
			token: this.options.token,
		});
		return response.items.map(normalizeMessage);
	}

	async createSession(input: {
		prompt: string;
		title?: string | null;
		tags?: string[];
		devinMode?: "normal" | "fast" | null;
	}) {
		if (this.isV3) {
			const response = await nativeAgentFetchJson<unknown>({
				baseUrl: DEVIN_V3_BASE_URL,
				body: {
					prompt: input.prompt,
					...(input.title ? { title: input.title } : {}),
					...(input.tags?.length ? { tags: input.tags } : {}),
					...(input.devinMode ? { devin_mode: input.devinMode } : {}),
				},
				method: "POST",
				path: `${this.orgPath}/sessions`,
				token: this.options.token,
			});
			return normalizeV3Session(response);
		}

		const response = await nativeAgentFetchJson<Record<string, unknown>>({
			baseUrl: DEVIN_V1_BASE_URL,
			body: {
				prompt: input.prompt,
				...(input.title ? { title: input.title } : {}),
				...(input.tags?.length ? { tags: input.tags } : {}),
			},
			method: "POST",
			path: "sessions",
			token: this.options.token,
		});
		return normalizeV1Session({
			...response,
			session_id: response.session_id,
			title: input.title,
			status: "new",
		});
	}

	sendMessage(input: { sessionId: string; message: string }) {
		if (this.isV3) {
			return nativeAgentFetchJson<unknown>({
				baseUrl: DEVIN_V3_BASE_URL,
				body: { message: input.message },
				method: "POST",
				path: `${this.orgPath}/sessions/${encodeURIComponent(input.sessionId)}/messages`,
				token: this.options.token,
			});
		}
		return nativeAgentFetchJson<unknown>({
			baseUrl: DEVIN_V1_BASE_URL,
			body: { message: input.message },
			method: "POST",
			path: `sessions/${encodeURIComponent(input.sessionId)}/message`,
			token: this.options.token,
		});
	}

	terminateSession(sessionId: string) {
		return nativeAgentFetchJson<unknown>({
			baseUrl: this.isV3 ? DEVIN_V3_BASE_URL : DEVIN_V1_BASE_URL,
			method: "DELETE",
			path: this.isV3
				? `${this.orgPath}/sessions/${encodeURIComponent(sessionId)}`
				: `sessions/${encodeURIComponent(sessionId)}`,
			token: this.options.token,
		});
	}

	archiveSession(sessionId: string) {
		if (!this.isV3) {
			throw new Error("Devin archive is only available for v3 credentials");
		}
		return nativeAgentFetchJson<unknown>({
			baseUrl: DEVIN_V3_BASE_URL,
			method: "POST",
			path: `${this.orgPath}/sessions/${encodeURIComponent(sessionId)}/archive`,
			token: this.options.token,
		});
	}
}
