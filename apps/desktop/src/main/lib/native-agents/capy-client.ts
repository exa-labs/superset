import { nativeAgentFetchJson } from "./http";

const CAPY_BASE_URL = "https://capy.ai/api/v1/";

export interface CapyProject {
	id: string;
	name: string;
	description?: string | null;
	taskCode?: string | null;
	repos?: Array<{ repoFullName: string; branch?: string | null }>;
	createdAt?: string;
	updatedAt?: string;
}

export interface CapyThread {
	id: string;
	projectId: string;
	title: string | null;
	status?: string;
	runState?: string;
	createdByUserEmail?: string | null;
	createdByEmail?: string | null;
	creatorEmail?: string | null;
	ownerEmail?: string | null;
	userEmail?: string | null;
	createdByUserId?: string | null;
	createdBy?: unknown;
	creator?: unknown;
	owner?: unknown;
	participants?: Array<{
		userId?: string | null;
		userType?: string | null;
		firstParticipatedAt?: string | null;
		lastParticipatedAt?: string | null;
	}>;
	waitingOn?: string[];
	blockedOn?: string[];
	pendingWakeups?: number;
	tasks?: Array<{ id: string; identifier?: string; title?: string | null }>;
	pullRequests?: Array<{ url?: string; state?: string; repoFullName?: string }>;
	latestMessage?: CapyMessage | null;
	lastMessage?: CapyMessage | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface CapyMessage {
	id: string;
	content: string;
	createdAt?: string;
	created_at?: string;
	timestamp?: string | number;
	role?: string | null;
	source?: string | null;
}

interface CapyPage<T> {
	items: T[];
	nextCursor: string | null;
	hasMore: boolean;
}

export class CapyClient {
	constructor(private readonly token: string) {}

	listProjects(input: { cursor?: string | null; limit?: number } = {}) {
		return nativeAgentFetchJson<CapyPage<CapyProject>>({
			baseUrl: CAPY_BASE_URL,
			path: "projects",
			query: { cursor: input.cursor, limit: input.limit ?? 50 },
			token: this.token,
		});
	}

	listThreads(input: {
		cursor?: string | null;
		limit?: number;
		projectId: string;
		status?: "active" | "idle" | "archived";
	}) {
		return nativeAgentFetchJson<CapyPage<CapyThread>>({
			baseUrl: CAPY_BASE_URL,
			path: "threads",
			query: {
				cursor: input.cursor,
				limit: input.limit ?? 50,
				projectId: input.projectId,
				status: input.status,
			},
			token: this.token,
		});
	}

	getThread(threadId: string) {
		return nativeAgentFetchJson<CapyThread>({
			baseUrl: CAPY_BASE_URL,
			path: `threads/${encodeURIComponent(threadId)}`,
			token: this.token,
		});
	}

	createThread(input: {
		projectId: string;
		prompt: string;
		tags?: string[];
		model?: string | null;
		speed?: "fast" | "standard" | null;
	}) {
		return nativeAgentFetchJson<CapyThread>({
			baseUrl: CAPY_BASE_URL,
			body: {
				projectId: input.projectId,
				prompt: input.prompt,
				...(input.tags?.length ? { tags: input.tags } : {}),
				...(input.model ? { model: input.model } : {}),
				...(input.speed ? { speed: input.speed } : {}),
			},
			method: "POST",
			path: "threads",
			token: this.token,
		});
	}

	listMessages(input: {
		cursor?: string | null;
		limit?: number;
		threadId: string;
	}) {
		return nativeAgentFetchJson<CapyPage<CapyMessage>>({
			baseUrl: CAPY_BASE_URL,
			path: `threads/${encodeURIComponent(input.threadId)}/messages`,
			query: { cursor: input.cursor, limit: input.limit ?? 100 },
			token: this.token,
		});
	}

	sendMessage(input: {
		threadId: string;
		message: string;
		model?: string | null;
	}) {
		return nativeAgentFetchJson<{ id: string; status: string }>({
			baseUrl: CAPY_BASE_URL,
			body: {
				message: input.message,
				...(input.model ? { model: input.model } : {}),
			},
			method: "POST",
			path: `threads/${encodeURIComponent(input.threadId)}/message`,
			token: this.token,
		});
	}

	stopThread(threadId: string) {
		return nativeAgentFetchJson<{ id: string; status: string }>({
			baseUrl: CAPY_BASE_URL,
			method: "POST",
			path: `threads/${encodeURIComponent(threadId)}/stop`,
			token: this.token,
		});
	}
}
