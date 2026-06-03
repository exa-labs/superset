import { TRPCError } from "@trpc/server";
import {
	archiveNativeAgentSession,
	CapyClient,
	DevinClient,
	deleteNativeAgentCredential,
	getEffectiveNativeAgentCredentials,
	getNativeAgentCredentialStatus,
	listNativeAgentSessionMetadata,
	markNativeAgentSessionSeen,
	type NativeAgentSessionMetadata,
	saveNativeAgentCredentials,
	setNativeAgentSessionSidebarVisible,
	setNativeAgentSessionTitleOverride,
} from "main/lib/native-agents";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { orderMessagesOldestFirst } from "./message-ordering";

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = z.string().trim().min(1).optional().nullable();
const providerSchema = z.enum(["capy", "devin"]);
const devinFlavorSchema = z.enum(["v1", "v3"]);
const CAPY_LOCAL_USER_EMAIL = "lakee@exa.ai";
const CAPY_LOCAL_USER_IDS = new Set([
	// Human user id returned for Lakee-owned Capy threads with the local API key.
	// Do not compare this against participants; participants includes threads
	// created by other people where Lakee only commented.
	"user_3CPOt2D9tBk4PVimoQaDhBkf6Wn",
]);
const CAPY_MINE_SCAN_PAGE_LIMIT = 25;
export const CAPY_MINE_DEFAULT_SCAN_PAGE_LIMIT = 8;
const CAPY_METADATA_BACKFILL_LIMIT = 25;

function normalizeEmail(value: unknown): string | null {
	return typeof value === "string" && value.includes("@")
		? value.trim().toLowerCase()
		: null;
}

function emailsFromUnknown(value: unknown): string[] {
	if (!value || typeof value !== "object" || Array.isArray(value)) return [];
	const record = value as Record<string, unknown>;
	return [
		record.email,
		record.userEmail,
		record.createdByUserEmail,
		record.createdByEmail,
		record.creatorEmail,
		record.ownerEmail,
	]
		.map(normalizeEmail)
		.filter((email): email is string => email != null);
}

function userIdsFromUnknown(value: unknown): string[] {
	if (!value || typeof value !== "object" || Array.isArray(value)) return [];
	const record = value as Record<string, unknown>;
	return [
		record.id,
		record.userId,
		record.createdByUserId,
		record.creatorUserId,
		record.ownerUserId,
	]
		.map((item) => (typeof item === "string" ? item.trim() : null))
		.filter((item): item is string => !!item);
}

function capyThreadEmails(thread: Record<string, unknown>): string[] {
	return [
		thread.createdByUserEmail,
		thread.createdByEmail,
		thread.creatorEmail,
		thread.ownerEmail,
		...emailsFromUnknown(thread.createdBy),
		...emailsFromUnknown(thread.creator),
		...emailsFromUnknown(thread.owner),
	]
		.map(normalizeEmail)
		.filter((email): email is string => email != null);
}

function capyThreadCreatorUserIds(thread: Record<string, unknown>): string[] {
	return [
		thread.createdByUserId,
		thread.creatorUserId,
		thread.ownerUserId,
		...userIdsFromUnknown(thread.createdBy),
		...userIdsFromUnknown(thread.creator),
		...userIdsFromUnknown(thread.owner),
	]
		.map((item) => (typeof item === "string" ? item.trim() : null))
		.filter((userId): userId is string => !!userId);
}

function hasCapyCreatorIdentity(thread: Record<string, unknown>): boolean {
	return (
		capyThreadEmails(thread).length > 0 ||
		capyThreadCreatorUserIds(thread).length > 0
	);
}

function normalizeTimeMs(value: unknown): number | null {
	if (typeof value !== "string" && typeof value !== "number") return null;
	const date =
		typeof value === "number"
			? new Date(value > 10_000_000_000 ? value : value * 1000)
			: new Date(value);
	const time = date.getTime();
	return Number.isNaN(time) ? null : time;
}

function isSameCapyTimestamp(left: unknown, right: unknown): boolean {
	const leftTime = normalizeTimeMs(left);
	const rightTime = normalizeTimeMs(right);
	if (leftTime == null || rightTime == null) return false;
	return Math.abs(leftTime - rightTime) < 1_000;
}

function isCapyThreadStartedByLocalParticipant(
	thread: Record<string, unknown>,
): boolean {
	if (!Array.isArray(thread.participants)) return false;
	let hasLocalStartingParticipant = false;
	for (const participant of thread.participants) {
		if (!participant || typeof participant !== "object") continue;
		const record = participant as Record<string, unknown>;
		const userId = typeof record.userId === "string" ? record.userId : null;
		const userType =
			typeof record.userType === "string" ? record.userType : null;
		if (
			userType !== "human" ||
			!isSameCapyTimestamp(record.firstParticipatedAt, thread.createdAt)
		) {
			continue;
		}
		if (!userId || !CAPY_LOCAL_USER_IDS.has(userId)) return false;
		hasLocalStartingParticipant = true;
	}
	return hasLocalStartingParticipant;
}

export function isCapyThreadCreatedByUser(
	thread: CapyClientThread,
	userEmail: string,
): boolean {
	const record = thread as unknown as Record<string, unknown>;
	const emails = capyThreadEmails(record);
	if (emails.includes(userEmail)) return true;
	const creatorUserIds = capyThreadCreatorUserIds(record);
	if (creatorUserIds.some((userId) => CAPY_LOCAL_USER_IDS.has(userId))) {
		return true;
	}
	return (
		!hasCapyCreatorIdentity(record) &&
		isCapyThreadStartedByLocalParticipant(record)
	);
}

export function selectCapyMetadataBackfillIds(input: {
	existingThreadIds: Iterable<string>;
	includeArchived?: boolean;
	limit?: number;
	metadataById: Record<string, NativeAgentSessionMetadata>;
}): string[] {
	const existingThreadIds = new Set(input.existingThreadIds);
	const limit = input.limit ?? CAPY_METADATA_BACKFILL_LIMIT;
	return Object.values(input.metadataById)
		.filter((metadata) => {
			if (metadata.provider !== "capy") return false;
			if (existingThreadIds.has(metadata.id)) return false;
			if (!input.includeArchived && metadata.archivedLocally) return false;
			return (
				metadata.createdLocally === true ||
				metadata.pinned === true ||
				metadata.ownershipVerified === true
			);
		})
		.toSorted((a, b) => {
			const aTime = normalizeTimeMs(a.updatedAt) ?? 0;
			const bTime = normalizeTimeMs(b.updatedAt) ?? 0;
			return bTime - aTime;
		})
		.slice(0, limit)
		.map((metadata) => metadata.id);
}

async function mapWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	mapper: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let nextIndex = 0;
	const workerCount = Math.min(limit, items.length);
	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (nextIndex < items.length) {
				const currentIndex = nextIndex;
				nextIndex += 1;
				results[currentIndex] = await mapper(items[currentIndex]);
			}
		}),
	);
	return results;
}

type CapyClientThread = Awaited<
	ReturnType<CapyClient["listThreads"]>
>["items"][number];

async function getCapyClient(): Promise<CapyClient> {
	const credentials = await getEffectiveNativeAgentCredentials();
	if (!credentials.capyApiKey) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Capy API credentials are not configured locally.",
		});
	}
	return new CapyClient(credentials.capyApiKey);
}

async function getDevinClient(): Promise<DevinClient> {
	const credentials = await getEffectiveNativeAgentCredentials();
	if (!credentials.devinApiKey) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Devin API credentials are not configured locally.",
		});
	}
	return new DevinClient({
		flavor: credentials.devinApiFlavor,
		orgId: credentials.devinOrgId,
		token: credentials.devinApiKey,
	});
}

export const createNativeAgentsRouter = () =>
	router({
		credentials: router({
			status: publicProcedure.query(() => getNativeAgentCredentialStatus()),
			save: publicProcedure
				.input(
					z.object({
						capyApiKey: optionalNonEmptyString,
						devinApiKey: optionalNonEmptyString,
						devinApiFlavor: devinFlavorSchema.optional(),
						devinOrgId: z.string().trim().optional().nullable(),
						devinUserEmail: z.string().trim().optional().nullable(),
					}),
				)
				.mutation(async ({ input }) => {
					await saveNativeAgentCredentials(input);
					return getNativeAgentCredentialStatus();
				}),
			delete: publicProcedure
				.input(z.object({ provider: providerSchema }))
				.mutation(async ({ input }) => {
					await deleteNativeAgentCredential(input.provider);
					return getNativeAgentCredentialStatus();
				}),
		}),

		capy: router({
			listProjects: publicProcedure
				.input(
					z
						.object({
							cursor: z.string().nullable().optional(),
							limit: z.number().int().min(1).max(100).optional(),
						})
						.optional(),
				)
				.query(async ({ input }) => {
					const client = await getCapyClient();
					return client.listProjects(input ?? {});
				}),
			listThreads: publicProcedure
				.input(
					z.object({
						cursor: z.string().nullable().optional(),
						limit: z.number().int().min(1).max(100).optional(),
						projectId: nonEmptyString,
						status: z.enum(["active", "idle", "archived"]).optional(),
						mineOnly: z.boolean().optional(),
						userEmail: z.string().trim().optional().nullable(),
						includeArchived: z.boolean().optional(),
						scanPageLimit: z.number().int().min(1).max(25).optional(),
					}),
				)
				.query(async ({ input }) => {
					const client = await getCapyClient();
					const metadataById = await listNativeAgentSessionMetadata("capy");
					const userEmail =
						normalizeEmail(input.userEmail) ?? CAPY_LOCAL_USER_EMAIL;
					const shouldIncludeThread = async (thread: CapyClientThread) => {
						const metadata = metadataById[`capy:${thread.id}`];
						if (!input.includeArchived && metadata?.archivedLocally) {
							return false;
						}
						if (!input.mineOnly) return true;
						if (metadata?.createdLocally) return true;
						if (isCapyThreadCreatedByUser(thread, userEmail)) return true;
						return false;
					};
					if (!input.mineOnly) {
						const result = await client.listThreads(input);
						const items = [];
						for (const thread of result.items) {
							if (await shouldIncludeThread(thread)) items.push(thread);
						}
						return {
							...result,
							items: items.map((thread) => ({
								...thread,
								nativeAgentMetadata: metadataById[`capy:${thread.id}`] ?? null,
							})),
						};
					}
					const requestedLimit = input.limit ?? 50;
					const scanPageLimit =
						input.scanPageLimit ?? CAPY_MINE_DEFAULT_SCAN_PAGE_LIMIT;
					const scanPageSize = Math.min(Math.max(requestedLimit, 20), 50);
					const filteredItems: Awaited<
						ReturnType<CapyClient["listThreads"]>
					>["items"] = [];
					let nextCursor = input.cursor ?? null;
					let hasMore = false;
					let pagesRead = 0;

					do {
						const result = await client.listThreads({
							...input,
							cursor: nextCursor,
							limit: scanPageSize,
						});
						const shouldIncludeByIndex = await Promise.all(
							result.items.map((thread) => shouldIncludeThread(thread)),
						);
						for (const [index, thread] of result.items.entries()) {
							if (shouldIncludeByIndex[index]) filteredItems.push(thread);
							if (filteredItems.length >= requestedLimit) break;
						}
						nextCursor = result.nextCursor;
						hasMore = result.hasMore;
						pagesRead += 1;
					} while (
						input.mineOnly &&
						hasMore &&
						nextCursor &&
						filteredItems.length < requestedLimit &&
						pagesRead < Math.min(scanPageLimit, CAPY_MINE_SCAN_PAGE_LIMIT)
					);

					const existingThreadIds = new Set(
						filteredItems.map((thread) => thread.id),
					);
					const backfillIds = selectCapyMetadataBackfillIds({
						existingThreadIds,
						includeArchived: input.includeArchived,
						metadataById,
					});
					const backfillThreads = await mapWithConcurrency(
						backfillIds,
						5,
						async (threadId) => {
							const metadata = metadataById[`capy:${threadId}`];
							if (
								metadata?.discoveredFromProvider &&
								!metadata.createdLocally &&
								!metadata.pinned
							) {
								return {
									createdAt: metadata.createdAt,
									id: threadId,
									projectId: input.projectId,
									title: metadata.title ?? "Untitled thread",
									updatedAt: metadata.updatedAt,
								} satisfies CapyClientThread;
							}
							try {
								const thread = await client.getThread(threadId);
								if (thread.projectId !== input.projectId) return null;
								if (!(await shouldIncludeThread(thread))) return null;
								return thread;
							} catch {
								return null;
							}
						},
					);
					for (const thread of backfillThreads) {
						if (!thread || existingThreadIds.has(thread.id)) continue;
						existingThreadIds.add(thread.id);
						filteredItems.push(thread);
					}

					return {
						hasMore,
						nextCursor,
						items: filteredItems.map((thread) => ({
							...thread,
							nativeAgentMetadata: metadataById[`capy:${thread.id}`] ?? null,
						})),
					};
				}),
			syncMine: publicProcedure
				.input(
					z.object({
						projectId: nonEmptyString,
						userEmail: z.string().trim().optional().nullable(),
						scanPageLimit: z.number().int().min(1).max(25).optional(),
						limit: z.number().int().min(1).max(100).optional(),
					}),
				)
				.mutation(async ({ input }) => {
					const client = await getCapyClient();
					const userEmail =
						normalizeEmail(input.userEmail) ?? CAPY_LOCAL_USER_EMAIL;
					const scanPageLimit =
						input.scanPageLimit ?? CAPY_MINE_DEFAULT_SCAN_PAGE_LIMIT;
					const pageSize = input.limit ?? 50;
					let nextCursor: string | null = null;
					let hasMore = false;
					let pagesRead = 0;
					let scanned = 0;
					const discoveredIds: string[] = [];

					do {
						const result = await client.listThreads({
							cursor: nextCursor,
							limit: pageSize,
							projectId: input.projectId,
						});
						for (const thread of result.items) {
							scanned += 1;
							if (!isCapyThreadCreatedByUser(thread, userEmail)) continue;
							discoveredIds.push(thread.id);
							await markNativeAgentSessionSeen({
								discoveredFromProvider: true,
								id: thread.id,
								ownershipVerified: true,
								provider: "capy",
								title: thread.title,
							});
						}
						nextCursor = result.nextCursor;
						hasMore = result.hasMore;
						pagesRead += 1;
					} while (
						hasMore &&
						nextCursor &&
						pagesRead < Math.min(scanPageLimit, CAPY_MINE_SCAN_PAGE_LIMIT)
					);

					return {
						discovered: discoveredIds.length,
						discoveredIds,
						hasMore,
						nextCursor,
						pagesRead,
						scanned,
					};
				}),
			getThread: publicProcedure
				.input(z.object({ threadId: nonEmptyString }))
				.query(async ({ input }) => {
					const client = await getCapyClient();
					const [thread, metadataById] = await Promise.all([
						client.getThread(input.threadId),
						listNativeAgentSessionMetadata("capy"),
					]);
					return {
						...thread,
						nativeAgentMetadata: metadataById[`capy:${input.threadId}`] ?? null,
					};
				}),
			createThread: publicProcedure
				.input(
					z.object({
						projectId: nonEmptyString,
						prompt: nonEmptyString,
						tags: z.array(nonEmptyString).max(20).optional(),
						model: optionalNonEmptyString,
						speed: z.enum(["fast", "standard"]).optional().nullable(),
					}),
				)
				.mutation(async ({ input }) => {
					const client = await getCapyClient();
					const thread = await client.createThread(input);
					await markNativeAgentSessionSeen({
						createdLocally: true,
						id: thread.id,
						provider: "capy",
						title: thread.title,
					});
					return thread;
				}),
			listMessages: publicProcedure
				.input(
					z.object({
						cursor: z.string().nullable().optional(),
						limit: z.number().int().min(1).max(100).optional(),
						threadId: nonEmptyString,
					}),
				)
				.query(async ({ input }) => {
					const client = await getCapyClient();
					const result = await client.listMessages(input);
					return {
						...result,
						items: orderMessagesOldestFirst(
							result.items.map((message) => ({
								...message,
								createdAt:
									message.createdAt ?? message.created_at ?? message.timestamp,
								role: message.role ?? message.source,
							})),
						),
					};
				}),
			sendMessage: publicProcedure
				.input(
					z.object({
						threadId: nonEmptyString,
						message: nonEmptyString,
						model: optionalNonEmptyString,
					}),
				)
				.mutation(async ({ input }) => {
					const client = await getCapyClient();
					return client.sendMessage(input);
				}),
			stopThread: publicProcedure
				.input(z.object({ threadId: nonEmptyString }))
				.mutation(async ({ input }) => {
					const client = await getCapyClient();
					return client.stopThread(input.threadId);
				}),
		}),

		devin: router({
			listSessions: publicProcedure
				.input(
					z
						.object({
							cursor: z.string().nullable().optional(),
							limit: z.number().int().min(1).max(100).optional(),
							offset: z.number().int().min(0).optional(),
							tags: z.array(nonEmptyString).max(50).optional(),
							userEmail: z.string().trim().optional().nullable(),
							mineOnly: z.boolean().optional(),
							includeArchived: z.boolean().optional(),
						})
						.optional(),
				)
				.query(async ({ input }) => {
					const client = await getDevinClient();
					const credentials = await getEffectiveNativeAgentCredentials();
					const userEmail =
						normalizeEmail(credentials.devinUserEmail) ??
						normalizeEmail(input?.userEmail);
					const [result, metadataById] = await Promise.all([
						client.listSessions({
							...(input ?? {}),
							userEmail: input?.mineOnly ? userEmail : input?.userEmail,
						}),
						listNativeAgentSessionMetadata("devin"),
					]);
					const filteredItems = result.items.filter((session) => {
						const metadata = metadataById[`devin:${session.id}`];
						if (
							!input?.includeArchived &&
							(metadata?.archivedLocally || session.isArchived)
						) {
							return false;
						}
						if (!input?.mineOnly) return true;
						if (metadata?.createdLocally || metadata?.pinned) return true;
						if (!userEmail || !session.requestingUserEmail) return false;
						return (
							normalizeEmail(session.requestingUserEmail) ===
							normalizeEmail(userEmail)
						);
					});
					return {
						...result,
						items: filteredItems.map((session) => ({
							...session,
							nativeAgentMetadata: metadataById[`devin:${session.id}`] ?? null,
						})),
					};
				}),
			getSession: publicProcedure
				.input(z.object({ sessionId: nonEmptyString }))
				.query(async ({ input }) => {
					const client = await getDevinClient();
					const [sessionResult, metadataById] = await Promise.all([
						client.getSession(input.sessionId),
						listNativeAgentSessionMetadata("devin"),
					]);
					return {
						...sessionResult,
						session: sessionResult.session
							? {
									...sessionResult.session,
									nativeAgentMetadata:
										metadataById[`devin:${input.sessionId}`] ?? null,
								}
							: sessionResult.session,
					};
				}),
			createSession: publicProcedure
				.input(
					z.object({
						prompt: nonEmptyString,
						title: optionalNonEmptyString,
						tags: z.array(nonEmptyString).max(50).optional(),
						devinMode: z.enum(["normal", "fast"]).optional().nullable(),
					}),
				)
				.mutation(async ({ input }) => {
					const client = await getDevinClient();
					const session = await client.createSession(input);
					await markNativeAgentSessionSeen({
						createdLocally: true,
						id: session.id,
						provider: "devin",
						title: session.title,
					});
					return session;
				}),
			sendMessage: publicProcedure
				.input(
					z.object({
						sessionId: nonEmptyString,
						message: nonEmptyString,
					}),
				)
				.mutation(async ({ input }) => {
					const client = await getDevinClient();
					return client.sendMessage(input);
				}),
			terminateSession: publicProcedure
				.input(z.object({ sessionId: nonEmptyString }))
				.mutation(async ({ input }) => {
					const client = await getDevinClient();
					return client.terminateSession(input.sessionId);
				}),
			archiveSession: publicProcedure
				.input(z.object({ sessionId: nonEmptyString }))
				.mutation(async ({ input }) => {
					const credentials = await getEffectiveNativeAgentCredentials();
					if (credentials.devinApiFlavor === "v3") {
						const client = await getDevinClient();
						await client.archiveSession(input.sessionId);
					}
					return archiveNativeAgentSession({
						archived: true,
						id: input.sessionId,
						provider: "devin",
					});
				}),
		}),

		metadata: router({
			pinSession: publicProcedure
				.input(
					z.object({
						id: nonEmptyString,
						provider: providerSchema,
						title: optionalNonEmptyString,
					}),
				)
				.mutation(({ input }) =>
					markNativeAgentSessionSeen({
						id: input.id,
						pinned: true,
						provider: input.provider,
						title: input.title,
					}),
				),
			setPinned: publicProcedure
				.input(
					z.object({
						id: nonEmptyString,
						provider: providerSchema,
						pinned: z.boolean(),
						title: optionalNonEmptyString,
					}),
				)
				.mutation(({ input }) =>
					markNativeAgentSessionSeen({
						id: input.id,
						pinned: input.pinned,
						provider: input.provider,
						title: input.title,
					}),
				),
			setSidebarVisible: publicProcedure
				.input(
					z.object({
						id: nonEmptyString,
						provider: providerSchema,
						visible: z.boolean(),
						title: optionalNonEmptyString,
					}),
				)
				.mutation(({ input }) =>
					setNativeAgentSessionSidebarVisible({
						id: input.id,
						provider: input.provider,
						title: input.title,
						visible: input.visible,
					}),
				),
			setTitle: publicProcedure
				.input(
					z.object({
						id: nonEmptyString,
						provider: providerSchema,
						title: z.string().trim().min(1).max(200),
					}),
				)
				.mutation(({ input }) =>
					setNativeAgentSessionTitleOverride({
						id: input.id,
						provider: input.provider,
						titleOverride: input.title,
					}),
				),
			archiveSession: publicProcedure
				.input(
					z.object({
						id: nonEmptyString,
						provider: providerSchema,
						archived: z.boolean().default(true),
					}),
				)
				.mutation(({ input }) =>
					archiveNativeAgentSession({
						archived: input.archived,
						id: input.id,
						provider: input.provider,
					}),
				),
		}),
	});

export type NativeAgentsRouter = ReturnType<typeof createNativeAgentsRouter>;
