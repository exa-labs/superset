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
	saveNativeAgentCredentials,
	setNativeAgentSessionSidebarVisible,
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
		thread.userEmail,
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

export function isCapyThreadCreatedByUser(
	thread: CapyClientThread,
	userEmail: string,
): boolean {
	const record = thread as unknown as Record<string, unknown>;
	const emails = capyThreadEmails(record);
	if (emails.includes(userEmail)) return true;
	const creatorUserIds = capyThreadCreatorUserIds(record);
	return creatorUserIds.some((userId) => CAPY_LOCAL_USER_IDS.has(userId));
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
						const threadRecord = thread as unknown as Record<string, unknown>;
						if (hasCapyCreatorIdentity(threadRecord)) return false;
						if (input.status !== "active") return false;
						try {
							const detailedThread = await client.getThread(thread.id);
							return isCapyThreadCreatedByUser(detailedThread, userEmail);
						} catch {
							return false;
						}
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
							limit: 100,
						});
						for (const thread of result.items) {
							if (await shouldIncludeThread(thread)) filteredItems.push(thread);
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
						pagesRead < CAPY_MINE_SCAN_PAGE_LIMIT
					);

					return {
						hasMore,
						nextCursor,
						items: filteredItems.slice(0, requestedLimit).map((thread) => ({
							...thread,
							nativeAgentMetadata: metadataById[`capy:${thread.id}`] ?? null,
						})),
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
