import { toast } from "@superset/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	LuArchive,
	LuExternalLink,
	LuFileText,
	LuGitPullRequest,
	LuImage,
	LuKeyRound,
	LuPin,
	LuRefreshCw,
	LuSend,
	LuSquare,
} from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { CommentCodeBlock } from "renderer/components/CommentMarkdown/components/CommentCodeBlock";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { DashboardWebView } from "renderer/routes/_authenticated/_dashboard/components/DashboardWebView";
import { NATIVE_AGENT_ASSET_PROTOCOL_SCHEME } from "shared/constants";
import {
	formatNativeAgentTimestamp,
	type NativeAgentProvider,
	nativeAgentConversationLabel,
	nativeAgentConversationSetLabel,
	nativeAgentProviderTitle,
	nativeAgentStatusTone,
	nativeAgentTimestampMs,
	normalizeNativeAgentRole,
} from "../../utils/native-agent-ui";

type ReactMarkdownComponents = ComponentProps<
	typeof ReactMarkdown
>["components"];

interface NativeAgentChatViewProps {
	provider: NativeAgentProvider;
	selectedId?: string | null;
	userEmail?: string | null;
}

type NativeMessage = {
	id: string;
	body: string;
	createdAt: string | number | null | undefined;
	role?: string | null;
};

type OptimisticNativeMessage = NativeMessage & {
	provider: NativeAgentProvider;
	targetId: string;
};

type NativeItem = {
	id: string;
	title: string;
	status: string | null;
	url: string | null;
	isProviderActive?: boolean;
	sidebarPinned?: boolean;
	sidebarHidden?: boolean;
};

type NativeBrowserTarget = {
	id: string;
	key: string;
	provider: NativeAgentProvider;
	title: string;
	url: string;
};

type NativeAttachment = {
	fileSize: number | null;
	fileName: string;
	url: string;
};

type ParsedNativeMessagePart =
	| {
			key: string;
			kind: "text";
			value: string;
	  }
	| {
			attachment: NativeAttachment;
			key: string;
			kind: "attachment";
	  }
	| {
			key: string;
			kind: "systemReminder";
			value: string;
	  };

const CAPY_MONOREPO_PROJECT_ID = "a275b1f7-318b-49ed-b2c8-5bb31ca7cd97";
const CAPY_LOCAL_USER_EMAIL = "lakee@exa.ai";
const NATIVE_AGENT_LIST_STALE_MS = 60_000;
const NATIVE_AGENT_DETAIL_STALE_MS = 30_000;
const NATIVE_AGENT_CACHE_MS = 2 * 60 * 60 * 1000;
const ATTACHMENT_PATTERN = /ATTACHMENT:\s*(\{[^{}]*\})/g;
const SYSTEM_REMINDER_PATTERN =
	/<system_reminder>([\s\S]*?)<\/system_reminder>/g;
const PR_REFERENCE_PATTERN =
	/\[\[pr:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)]]/g;
const DEVIN_SESSION_ID_PREFIX = "devin-";

const markdownComponents = {
	code: ({
		className,
		children,
	}: {
		className?: string;
		children?: ReactNode;
	}) => <CommentCodeBlock className={className}>{children}</CommentCodeBlock>,
	a: ({ href, children }: { href?: string; children?: ReactNode }) => (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"inline-flex items-center gap-1 align-baseline text-foreground underline underline-offset-2 hover:text-foreground/80",
				href?.includes("github.com") && href.includes("/pull/")
					? "rounded border border-border bg-background/80 px-1.5 py-0.5 text-xs no-underline shadow-sm hover:bg-accent"
					: "",
			)}
		>
			{href?.includes("github.com") && href.includes("/pull/") ? (
				<LuGitPullRequest className="size-3.5 shrink-0 text-muted-foreground" />
			) : null}
			{children}
		</a>
	),
	img: ({ alt, src }: { alt?: string; src?: string }) => {
		if (!src) return null;
		const imageUrl = shouldProxyNativeAgentAsset(src)
			? nativeAgentAssetPreviewUrl(src)
			: src;
		return (
			<img
				src={imageUrl}
				alt={alt ?? ""}
				loading="lazy"
				className="my-3 max-h-[420px] w-full rounded-md border border-border bg-black/20 object-contain"
			/>
		);
	},
} satisfies ReactMarkdownComponents;

function formatFileSize(size: number | null): string | null {
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

function fileNameFromAttachmentUrl(url: string): string {
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

function parseAttachmentPayload(value: string): NativeAttachment | null {
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
			fileName: fileNameFromAttachmentUrl(url),
			fileSize,
			url,
		};
	} catch {
		return null;
	}
}

function devinSessionAppUrl(sessionId: string): string {
	const appSessionId = sessionId.startsWith(DEVIN_SESSION_ID_PREFIX)
		? sessionId.slice(DEVIN_SESSION_ID_PREFIX.length)
		: sessionId;
	return `https://app.devin.ai/sessions/${encodeURIComponent(appSessionId)}`;
}

function normalizeDevinAppUrl(url: string | null | undefined): string | null {
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

function nativeAgentAssetPreviewUrl(url: string): string {
	return `${NATIVE_AGENT_ASSET_PROTOCOL_SCHEME}://image/?url=${encodeURIComponent(url)}`;
}

function shouldProxyNativeAgentAsset(url: string): boolean {
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

function isImageAttachment(attachment: NativeAttachment): boolean {
	try {
		const pathName = new URL(attachment.url).pathname;
		return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(pathName);
	} catch {
		return /\.(avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(attachment.url);
	}
}

function parseNativeMessageParts(body: string): ParsedNativeMessagePart[] {
	const parts: ParsedNativeMessagePart[] = [];
	let lastIndex = 0;

	const matches = [
		...Array.from(body.matchAll(ATTACHMENT_PATTERN), (match) => ({
			kind: "attachment" as const,
			match,
		})),
		...Array.from(body.matchAll(SYSTEM_REMINDER_PATTERN), (match) => ({
			kind: "systemReminder" as const,
			match,
		})),
	].sort((left, right) => (left.match.index ?? 0) - (right.match.index ?? 0));

	for (const { kind, match } of matches) {
		const matchIndex = match.index ?? 0;
		if (matchIndex < lastIndex) continue;

		let part: ParsedNativeMessagePart | null = null;
		if (kind === "attachment") {
			const rawPayload = match[1];
			const attachment = rawPayload ? parseAttachmentPayload(rawPayload) : null;
			if (!attachment) continue;
			part = {
				attachment,
				key: `attachment:${matchIndex}:${attachment.url}`,
				kind: "attachment",
			};
		} else {
			const reminder = (match[1] ?? "").trim();
			if (!reminder) continue;
			part = {
				key: `system-reminder:${matchIndex}`,
				kind: "systemReminder",
				value: reminder,
			};
		}

		const textBefore = body.slice(lastIndex, matchIndex);
		if (textBefore) {
			parts.push({ key: `text:${lastIndex}`, kind: "text", value: textBefore });
		}
		parts.push(part);
		lastIndex = matchIndex + match[0].length;
	}

	const textAfter = body.slice(lastIndex);
	if (textAfter) {
		parts.push({ key: `text:${lastIndex}`, kind: "text", value: textAfter });
	}

	return parts.length > 0
		? parts
		: [{ key: "text:0", kind: "text", value: body }];
}

function markdownWithNativeLinks(body: string): string {
	return body.replace(
		PR_REFERENCE_PATTERN,
		(_match, owner: string, repo: string, number: string) =>
			`[${owner}/${repo}#${number}](https://github.com/${owner}/${repo}/pull/${number})`,
	);
}

function NativeAttachmentImage({
	attachment,
}: {
	attachment: NativeAttachment;
}) {
	const [failed, setFailed] = useState(false);

	if (failed) {
		return (
			<div className="border-border border-t px-3 py-3 text-xs text-muted-foreground">
				Image preview failed. Open the attachment to view it in the browser
				session.
			</div>
		);
	}

	return (
		<img
			src={nativeAgentAssetPreviewUrl(attachment.url)}
			alt={attachment.fileName}
			loading="lazy"
			onError={() => setFailed(true)}
			className="max-h-[420px] w-full bg-black/20 object-contain"
		/>
	);
}

function AttachmentChip({ attachment }: { attachment: NativeAttachment }) {
	const size = formatFileSize(attachment.fileSize);
	const isImage = isImageAttachment(attachment);

	if (isImage) {
		return (
			<div
				title={attachment.url}
				className="my-3 block max-w-xl overflow-hidden rounded-lg border border-border bg-background/80 text-xs text-foreground shadow-sm transition-colors hover:bg-accent/45"
			>
				<div className="flex items-center gap-2 border-border border-b px-2.5 py-2">
					<span className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
						<LuImage className="size-4" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate font-medium">
							{attachment.fileName}
						</span>
						{size && (
							<span className="block text-[11px] text-muted-foreground">
								{size}
							</span>
						)}
					</span>
					<a
						href={attachment.url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
						aria-label={`Open ${attachment.fileName}`}
					>
						<LuExternalLink className="size-3.5" />
					</a>
				</div>
				<NativeAttachmentImage attachment={attachment} />
			</div>
		);
	}

	return (
		<a
			href={attachment.url}
			target="_blank"
			rel="noopener noreferrer"
			title={attachment.url}
			className="my-2 flex w-fit max-w-full items-center gap-2 rounded-md border border-border bg-background/80 px-2.5 py-2 text-xs text-foreground shadow-sm transition-colors hover:bg-accent"
		>
			<span className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
				<LuFileText className="size-4" />
			</span>
			<span className="min-w-0">
				<span className="block truncate font-medium">
					{attachment.fileName}
				</span>
				{size && (
					<span className="block text-[11px] text-muted-foreground">
						{size}
					</span>
				)}
			</span>
			<LuExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
		</a>
	);
}

function NativeMarkdownText({ body }: { body: string }) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeRaw, rehypeSanitize]}
			components={markdownComponents}
		>
			{markdownWithNativeLinks(body)}
		</ReactMarkdown>
	);
}

function SystemReminderDisclosure({ body }: { body: string }) {
	return (
		<details className="my-2 rounded-md border border-amber-500/25 bg-amber-500/5 text-xs">
			<summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-amber-200 outline-none transition-colors hover:bg-amber-500/10 [&::-webkit-details-marker]:hidden">
				<LuKeyRound className="size-3.5 shrink-0" />
				<span>System reminder</span>
				<span className="ml-auto text-[11px] font-normal text-amber-200/65">
					Click to expand
				</span>
			</summary>
			<div className="border-amber-500/15 border-t px-3 py-2 text-muted-foreground">
				<NativeMarkdownText body={body} />
			</div>
		</details>
	);
}

function orderNativeMessagesOldestFirst<T extends NativeMessage>(
	messages: T[],
): T[] {
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

function hasConfirmedUserMessage(
	confirmedMessages: NativeMessage[],
	optimisticMessage: OptimisticNativeMessage,
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

function NativeMarkdown({ body }: { body: string }) {
	const parts = useMemo(() => parseNativeMessageParts(body), [body]);

	return (
		<div
			className={cn(
				"native-agent-markdown min-w-0 select-text text-sm leading-6",
				"[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
				"[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
				"[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
				"[&_li]:my-1 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
				"[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1",
				"[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em]",
				"[&_pre_code]:bg-transparent [&_pre_code]:p-0",
			)}
		>
			{parts.map((part) =>
				part.kind === "attachment" ? (
					<AttachmentChip key={part.key} attachment={part.attachment} />
				) : part.kind === "systemReminder" ? (
					<SystemReminderDisclosure key={part.key} body={part.value} />
				) : (
					<NativeMarkdownText key={part.key} body={part.value} />
				),
			)}
		</div>
	);
}

function MessageBubble({
	message,
	provider,
}: {
	message: NativeMessage;
	provider: NativeAgentProvider;
}) {
	const role = normalizeNativeAgentRole(message.role, provider);

	return (
		<div className={cn("flex", role.isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[86%] rounded-lg border p-3 shadow-sm",
					role.isUser
						? "border-sky-500/30 bg-sky-500/10"
						: "border-border bg-muted/25",
				)}
			>
				<div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
					<span
						className={cn(
							"font-medium",
							role.isUser ? "text-sky-200" : "text-foreground/80",
						)}
					>
						{role.label}
					</span>
					<span>
						{formatNativeAgentTimestamp(message.createdAt, {
							dateStyle: "short",
							timeStyle: "short",
						})}
					</span>
				</div>
				<NativeMarkdown body={message.body} />
			</div>
		</div>
	);
}

export function NativeAgentChatView({
	provider,
	selectedId,
	userEmail,
}: NativeAgentChatViewProps) {
	const navigate = useNavigate();
	const utils = electronTrpc.useUtils();
	const [messageDraft, setMessageDraft] = useState("");
	const [credentialDraft, setCredentialDraft] = useState("");
	const [optimisticMessages, setOptimisticMessages] = useState<
		OptimisticNativeMessage[]
	>([]);
	const selectedViewKey = `${provider}:${selectedId ?? ""}`;
	const [viewState, setViewState] = useState<{
		key: string;
		mode: "browser" | "native";
	}>(() => ({ key: selectedViewKey, mode: "native" }));
	const viewMode =
		viewState.key === selectedViewKey ? viewState.mode : "native";
	const [openedBrowserTargets, setOpenedBrowserTargets] = useState<
		NativeBrowserTarget[]
	>([]);
	const [devinFlavor, setDevinFlavor] = useState<"v1" | "v3">("v1");
	const [devinOrgId, setDevinOrgId] = useState("");
	const [devinUserEmail, setDevinUserEmail] = useState(userEmail ?? "");
	const messageEndRef = useRef<HTMLDivElement | null>(null);

	const credentialStatus =
		electronTrpc.nativeAgents.credentials.status.useQuery(undefined, {
			staleTime: 15_000,
		});
	const credentials = credentialStatus.data;
	const isConfigured =
		provider === "capy"
			? credentials?.capy.configured === true
			: credentials?.devin.configured === true;
	const effectiveUserEmail =
		provider === "devin"
			? (credentials?.devin.userEmail ?? userEmail)
			: userEmail;
	const sourceLabel =
		provider === "capy" ? credentials?.capy.source : credentials?.devin.source;

	const capyThreadsQuery = electronTrpc.nativeAgents.capy.listThreads.useQuery(
		{
			limit: 100,
			mineOnly: true,
			projectId: CAPY_MONOREPO_PROJECT_ID,
			userEmail: CAPY_LOCAL_USER_EMAIL,
		},
		{
			enabled: provider === "capy" && isConfigured && !selectedId,
			gcTime: NATIVE_AGENT_CACHE_MS,
			refetchInterval: 60_000,
			staleTime: NATIVE_AGENT_LIST_STALE_MS,
		},
	);
	const capyActiveThreadsQuery =
		electronTrpc.nativeAgents.capy.listThreads.useQuery(
			{
				limit: 100,
				mineOnly: true,
				projectId: CAPY_MONOREPO_PROJECT_ID,
				status: "active",
				userEmail: CAPY_LOCAL_USER_EMAIL,
			},
			{
				enabled: provider === "capy" && isConfigured && !selectedId,
				gcTime: NATIVE_AGENT_CACHE_MS,
				refetchInterval: 10_000,
				staleTime: 10_000,
			},
		);
	const devinSessionsQuery =
		electronTrpc.nativeAgents.devin.listSessions.useQuery(
			{
				limit: 100,
				mineOnly: true,
				userEmail: effectiveUserEmail,
			},
			{
				enabled: provider === "devin" && isConfigured && !selectedId,
				gcTime: NATIVE_AGENT_CACHE_MS,
				refetchInterval: 15_000,
				staleTime: NATIVE_AGENT_LIST_STALE_MS,
			},
		);

	const capyThreadQuery = electronTrpc.nativeAgents.capy.getThread.useQuery(
		{ threadId: selectedId ?? "" },
		{
			enabled: provider === "capy" && isConfigured && !!selectedId,
			gcTime: NATIVE_AGENT_CACHE_MS,
			staleTime: NATIVE_AGENT_DETAIL_STALE_MS,
		},
	);
	const capyMessagesQuery =
		electronTrpc.nativeAgents.capy.listMessages.useQuery(
			{ limit: 100, threadId: selectedId ?? "" },
			{
				enabled: provider === "capy" && isConfigured && !!selectedId,
				gcTime: NATIVE_AGENT_CACHE_MS,
				refetchInterval: 8_000,
				staleTime: NATIVE_AGENT_DETAIL_STALE_MS,
			},
		);
	const devinSessionQuery = electronTrpc.nativeAgents.devin.getSession.useQuery(
		{ sessionId: selectedId ?? "" },
		{
			enabled: provider === "devin" && isConfigured && !!selectedId,
			gcTime: NATIVE_AGENT_CACHE_MS,
			refetchInterval: 8_000,
			staleTime: NATIVE_AGENT_DETAIL_STALE_MS,
		},
	);

	const selectedItem: NativeItem | null = useMemo(() => {
		if (!selectedId) return null;
		if (provider === "capy") {
			const thread = capyThreadQuery.data;
			return {
				id: selectedId,
				sidebarHidden: thread?.nativeAgentMetadata?.hiddenFromSidebar === true,
				sidebarPinned: thread?.nativeAgentMetadata?.pinned === true,
				status: thread?.runState ?? thread?.status ?? null,
				title: thread?.title ?? nativeAgentConversationLabel(provider),
				url: `https://capy.ai/project/${thread?.projectId ?? CAPY_MONOREPO_PROJECT_ID}/thread/${selectedId}`,
			};
		}
		const session = devinSessionQuery.data?.session;
		return {
			id: selectedId,
			sidebarHidden: session?.nativeAgentMetadata?.hiddenFromSidebar === true,
			sidebarPinned: session?.nativeAgentMetadata?.pinned === true,
			status: session?.status ?? null,
			title: session?.title ?? nativeAgentConversationLabel(provider),
			url: normalizeDevinAppUrl(session?.url) ?? devinSessionAppUrl(selectedId),
		};
	}, [
		capyThreadQuery.data,
		devinSessionQuery.data?.session,
		provider,
		selectedId,
	]);

	const workspaceItems: NativeItem[] = useMemo(() => {
		if (provider === "capy") {
			const activeThreadIds = new Set(
				(capyActiveThreadsQuery.data?.items ?? []).map((thread) => thread.id),
			);
			const threadsById = new Map(
				[
					...(capyThreadsQuery.data?.items ?? []),
					...(capyActiveThreadsQuery.data?.items ?? []),
				].map((thread) => [thread.id, thread]),
			);
			return [...threadsById.values()].map((thread) => ({
				id: thread.id,
				isProviderActive: activeThreadIds.has(thread.id),
				sidebarHidden: thread.nativeAgentMetadata?.hiddenFromSidebar === true,
				sidebarPinned: thread.nativeAgentMetadata?.pinned === true,
				status: thread.runState ?? thread.status ?? null,
				title:
					thread.title ?? `Untitled ${nativeAgentConversationLabel(provider)}`,
				url: `https://capy.ai/project/${thread.projectId}/thread/${thread.id}`,
			}));
		}
		return (devinSessionsQuery.data?.items ?? []).map((session) => ({
			id: session.id,
			sidebarHidden: session.nativeAgentMetadata?.hiddenFromSidebar === true,
			sidebarPinned: session.nativeAgentMetadata?.pinned === true,
			status: session.status,
			title: session.title ?? session.id,
			url: normalizeDevinAppUrl(session.url),
		}));
	}, [
		capyActiveThreadsQuery.data?.items,
		capyThreadsQuery.data?.items,
		devinSessionsQuery.data?.items,
		provider,
	]);

	const confirmedMessages: NativeMessage[] = useMemo(() => {
		if (provider === "capy") {
			return (capyMessagesQuery.data?.items ?? []).map((message) => ({
				id: message.id,
				body: message.content,
				createdAt: message.createdAt,
				role: message.role ?? message.source,
			}));
		}
		return devinSessionQuery.data?.messages ?? [];
	}, [
		capyMessagesQuery.data?.items,
		devinSessionQuery.data?.messages,
		provider,
	]);

	const messages: NativeMessage[] = useMemo(() => {
		if (!selectedId) {
			return orderNativeMessagesOldestFirst(confirmedMessages);
		}
		const pendingMessages = optimisticMessages.filter(
			(message) =>
				message.provider === provider &&
				message.targetId === selectedId &&
				!hasConfirmedUserMessage(confirmedMessages, message, provider),
		);
		return orderNativeMessagesOldestFirst([
			...confirmedMessages,
			...pendingMessages,
		]);
	}, [confirmedMessages, optimisticMessages, provider, selectedId]);
	const lastMessageId = messages.at(-1)?.id ?? null;

	useEffect(() => {
		if (!selectedId || !lastMessageId) return;
		messageEndRef.current?.scrollIntoView({ block: "end" });
	}, [lastMessageId, selectedId]);

	useEffect(() => {
		if (!selectedId || confirmedMessages.length === 0) return;
		setOptimisticMessages((current) => {
			const next = current.filter(
				(message) =>
					message.provider !== provider ||
					message.targetId !== selectedId ||
					!hasConfirmedUserMessage(confirmedMessages, message, provider),
			);
			return next.length === current.length ? current : next;
		});
	}, [confirmedMessages, provider, selectedId]);

	const saveCredentials =
		electronTrpc.nativeAgents.credentials.save.useMutation({
			onSuccess: async () => {
				setCredentialDraft("");
				toast.success(
					`${nativeAgentProviderTitle(provider)} credentials saved`,
				);
				await credentialStatus.refetch();
			},
			onError: (error) => toast.error(error.message),
		});
	const sendCapyMessage =
		electronTrpc.nativeAgents.capy.sendMessage.useMutation();
	const sendDevinMessage =
		electronTrpc.nativeAgents.devin.sendMessage.useMutation();
	const stopCapyThread =
		electronTrpc.nativeAgents.capy.stopThread.useMutation();
	const terminateDevinSession =
		electronTrpc.nativeAgents.devin.terminateSession.useMutation();
	const archiveDevinSession =
		electronTrpc.nativeAgents.devin.archiveSession.useMutation();
	const archiveMetadata =
		electronTrpc.nativeAgents.metadata.archiveSession.useMutation();
	const setPinned = electronTrpc.nativeAgents.metadata.setPinned.useMutation();
	const setSidebarVisible =
		electronTrpc.nativeAgents.metadata.setSidebarVisible.useMutation();
	const openExternal = electronTrpc.external.openUrl.useMutation();
	const nativeBrowserKey =
		selectedId && selectedItem?.url ? `${provider}:${selectedId}` : null;

	useEffect(() => {
		if (!nativeBrowserKey || !selectedItem?.url) return;
		const selectedUrl = selectedItem.url;
		setOpenedBrowserTargets((current) => {
			const existingIndex = current.findIndex(
				(target) => target.key === nativeBrowserKey,
			);
			if (existingIndex === -1) return current;
			const currentTarget = current[existingIndex];
			if (
				currentTarget.title === selectedItem.title &&
				currentTarget.url === selectedUrl
			) {
				return current;
			}
			const next = [...current];
			next[existingIndex] = {
				id: selectedItem.id,
				key: nativeBrowserKey,
				provider,
				title: selectedItem.title,
				url: selectedUrl,
			};
			return next;
		});
	}, [nativeBrowserKey, provider, selectedItem]);

	const isSending = sendCapyMessage.isPending || sendDevinMessage.isPending;
	const isStopping =
		stopCapyThread.isPending || terminateDevinSession.isPending;
	const isArchiving =
		archiveDevinSession.isPending || archiveMetadata.isPending;
	const messagesLoading =
		provider === "capy"
			? capyMessagesQuery.isLoading
			: devinSessionQuery.isLoading;
	const messagesError =
		provider === "capy" ? capyMessagesQuery.error : devinSessionQuery.error;

	const invalidateProvider = async () => {
		if (provider === "capy") {
			await Promise.all([
				utils.nativeAgents.capy.listThreads.invalidate(),
				utils.nativeAgents.capy.getThread.invalidate(),
				utils.nativeAgents.capy.listMessages.invalidate(),
			]);
			return;
		}
		await Promise.all([
			utils.nativeAgents.devin.listSessions.invalidate(),
			utils.nativeAgents.devin.getSession.invalidate(),
		]);
	};

	const scheduleProviderRefresh = () => {
		void invalidateProvider();
		window.setTimeout(() => void invalidateProvider(), 1_500);
		window.setTimeout(() => void invalidateProvider(), 5_000);
	};

	const handleSetSidebarVisible = async (
		item: NativeItem,
		visible: boolean,
	) => {
		try {
			await setSidebarVisible.mutateAsync({
				id: item.id,
				provider,
				title: item.title,
				visible,
			});
			await invalidateProvider();
			toast.success(visible ? "Shown in sidebar" : "Moved to overview");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleSetPinned = async (item: NativeItem, pinned: boolean) => {
		try {
			await setPinned.mutateAsync({
				id: item.id,
				pinned,
				provider,
				title: item.title,
			});
			await invalidateProvider();
			toast.success(pinned ? "Pinned in sidebar" : "Unpinned");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleSaveCredentials = async () => {
		if (!credentialDraft.trim()) {
			toast.error("Paste an API key first");
			return;
		}
		if (provider === "capy") {
			await saveCredentials.mutateAsync({ capyApiKey: credentialDraft.trim() });
			return;
		}
		await saveCredentials.mutateAsync({
			devinApiFlavor: devinFlavor,
			devinApiKey: credentialDraft.trim(),
			devinOrgId: devinFlavor === "v3" ? devinOrgId.trim() || null : null,
			devinUserEmail: devinUserEmail.trim() || userEmail || null,
		});
	};

	const handleSendMessage = async () => {
		const message = messageDraft.trim();
		if (!message || !selectedId) return;
		const optimisticMessage: OptimisticNativeMessage = {
			body: message,
			createdAt: Date.now(),
			id: `optimistic-${provider}-${selectedId}-${Date.now()}`,
			provider,
			role: "user",
			targetId: selectedId,
		};
		setMessageDraft("");
		setOptimisticMessages((current) => [...current, optimisticMessage]);
		scheduleProviderRefresh();
		try {
			if (provider === "capy") {
				await sendCapyMessage.mutateAsync({
					message,
					threadId: selectedId,
				});
			} else {
				await sendDevinMessage.mutateAsync({
					message,
					sessionId: selectedId,
				});
			}
			scheduleProviderRefresh();
		} catch (error) {
			setOptimisticMessages((current) =>
				current.filter((item) => item.id !== optimisticMessage.id),
			);
			setMessageDraft(message);
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleStop = async () => {
		if (!selectedId) return;
		try {
			if (provider === "capy") {
				await stopCapyThread.mutateAsync({ threadId: selectedId });
			} else {
				await terminateDevinSession.mutateAsync({ sessionId: selectedId });
			}
			await invalidateProvider();
			toast.success(
				provider === "capy"
					? `${nativeAgentConversationLabel(provider)} stopped`
					: `${nativeAgentConversationLabel(provider)} terminated`,
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleArchive = async () => {
		if (!selectedId) return;
		try {
			if (provider === "devin") {
				await archiveDevinSession.mutateAsync({ sessionId: selectedId });
			} else {
				await archiveMetadata.mutateAsync({
					archived: true,
					id: selectedId,
					provider,
				});
			}
			await invalidateProvider();
			toast.success(`${nativeAgentConversationLabel(provider)} archived`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleSelectViewMode = (mode: "browser" | "native") => {
		setViewState({ key: selectedViewKey, mode });
		if (mode !== "browser" || !nativeBrowserKey || !selectedItem?.url) return;
		const nextTarget: NativeBrowserTarget = {
			id: selectedItem.id,
			key: nativeBrowserKey,
			provider,
			title: selectedItem.title,
			url: selectedItem.url,
		};
		setOpenedBrowserTargets((current) => {
			const existingIndex = current.findIndex(
				(target) => target.key === nativeBrowserKey,
			);
			if (existingIndex === -1) return [...current, nextTarget];
			const next = [...current];
			next[existingIndex] = nextTarget;
			return next;
		});
	};

	return (
		<div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
			<header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h1 className="truncate text-sm font-semibold">
							{selectedItem?.title ?? nativeAgentProviderTitle(provider)}
						</h1>
						{selectedItem?.status && (
							<span
								className={cn(
									"rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
									nativeAgentStatusTone(selectedItem.status),
								)}
							>
								{selectedItem.status}
							</span>
						)}
						{sourceLabel && !selectedItem && (
							<span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
								{sourceLabel}
							</span>
						)}
					</div>
					<p className="truncate text-xs text-muted-foreground">
						{selectedItem
							? selectedItem.id
							: `Select a conversation from the sidebar or create one with +.`}
					</p>
				</div>
				{selectedItem?.url && (
					<div className="flex h-8 shrink-0 rounded-md border border-border bg-muted/30 p-0.5">
						<button
							type="button"
							onClick={() => handleSelectViewMode("native")}
							className={cn(
								"rounded px-2.5 text-xs font-medium transition-colors",
								viewMode === "native"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Native
						</button>
						<button
							type="button"
							onClick={() => handleSelectViewMode("browser")}
							className={cn(
								"rounded px-2.5 text-xs font-medium transition-colors",
								viewMode === "browser"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Browser
						</button>
					</div>
				)}
				<button
					type="button"
					onClick={() => void invalidateProvider()}
					disabled={!isConfigured}
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
					aria-label="Refresh native agent data"
				>
					<LuRefreshCw className="size-4" />
				</button>
				{selectedItem && (
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={() =>
									void handleSetSidebarVisible(
										selectedItem,
										selectedItem.sidebarHidden === true,
									)
								}
								disabled={setSidebarVisible.isPending}
								className={cn(
									"flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50",
									selectedItem.sidebarHidden !== true
										? "border border-border/70 bg-muted/40 text-foreground"
										: "text-muted-foreground",
								)}
								aria-label={
									selectedItem.sidebarHidden
										? "Show in native sidebar"
										: "Move to overview"
								}
							>
								<LuPin
									className={cn(
										"size-4",
										selectedItem.sidebarHidden !== true && "fill-current",
									)}
								/>
								<span>
									{selectedItem.sidebarHidden ? "Show" : "In sidebar"}
								</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							{selectedItem.sidebarHidden
								? "Show in sidebar"
								: "Move to overview"}
						</TooltipContent>
					</Tooltip>
				)}
				{selectedItem?.url && (
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={() => openExternal.mutate(selectedItem.url ?? "")}
								className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
								aria-label="Open in browser"
							>
								<LuExternalLink className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>Open browser version</TooltipContent>
					</Tooltip>
				)}
				{selectedItem && (
					<>
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={handleArchive}
									disabled={isArchiving}
									className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
									aria-label="Archive"
								>
									<LuArchive className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent>Archive</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={handleStop}
									disabled={isStopping}
									className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
									aria-label={provider === "capy" ? "Stop" : "Terminate"}
								>
									<LuSquare className="size-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								{provider === "capy" ? "Stop" : "Terminate"}
							</TooltipContent>
						</Tooltip>
					</>
				)}
			</header>

			{!isConfigured ? (
				<div className="flex flex-1 items-center justify-center p-6">
					<div className="w-full max-w-xl rounded-lg border border-border bg-muted/30 p-5">
						<div className="mb-4 flex items-center gap-3">
							<div className="flex size-9 items-center justify-center rounded-md bg-accent text-foreground">
								<LuKeyRound className="size-4" />
							</div>
							<div>
								<h2 className="text-sm font-semibold">
									Configure {nativeAgentProviderTitle(provider)}
								</h2>
								<p className="text-xs text-muted-foreground">
									The key is encrypted in local app storage and never returned
									to the renderer after saving.
								</p>
							</div>
						</div>
						<div className="flex flex-col gap-3">
							<input
								type="password"
								value={credentialDraft}
								onChange={(event) => setCredentialDraft(event.target.value)}
								placeholder={
									provider === "capy"
										? "capy_..."
										: "apk_user_..., apk_..., or cog_..."
								}
								className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
							/>
							{provider === "devin" && (
								<>
									<div className="grid grid-cols-[120px_1fr] gap-2">
										<select
											value={devinFlavor}
											onChange={(event) =>
												setDevinFlavor(event.target.value as "v1" | "v3")
											}
											className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-foreground/40"
										>
											<option value="v1">v1 key</option>
											<option value="v3">v3 org key</option>
										</select>
										<input
											value={devinOrgId}
											onChange={(event) => setDevinOrgId(event.target.value)}
											placeholder="org id for v3 only"
											disabled={devinFlavor !== "v3"}
											className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40 disabled:opacity-40"
										/>
									</div>
									<input
										value={devinUserEmail}
										onChange={(event) => setDevinUserEmail(event.target.value)}
										placeholder="Devin email for my sessions filter"
										className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
									/>
								</>
							)}
							<button
								type="button"
								onClick={handleSaveCredentials}
								disabled={saveCredentials.isPending}
								className="h-9 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity disabled:opacity-50"
							>
								Save credentials
							</button>
						</div>
					</div>
				</div>
			) : selectedItem ? (
				<div className="relative min-h-0 flex-1">
					<div
						className={cn(
							"absolute inset-0 flex min-h-0 flex-col",
							viewMode === "native"
								? "pointer-events-auto opacity-100"
								: "pointer-events-none opacity-0",
						)}
					>
						<div className="min-h-0 flex-1 overflow-y-auto p-4">
							{messagesError && (
								<div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
									{messagesError.message}
								</div>
							)}
							{messagesLoading && messages.length === 0 ? (
								<div className="text-xs text-muted-foreground">Loading...</div>
							) : (
								<div className="mx-auto flex max-w-5xl flex-col gap-4">
									{messages.map((message) => (
										<MessageBubble
											key={message.id}
											message={message}
											provider={provider}
										/>
									))}
									<div ref={messageEndRef} />
									{messages.length === 0 && (
										<div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
											No messages returned by the API yet.
										</div>
									)}
								</div>
							)}
						</div>

						<div className="shrink-0 border-t border-border p-3">
							<div className="mx-auto flex max-w-5xl gap-2">
								<textarea
									value={messageDraft}
									onChange={(event) => setMessageDraft(event.target.value)}
									onKeyDown={(event) => {
										if (
											event.key === "Enter" &&
											(event.metaKey || event.ctrlKey)
										) {
											event.preventDefault();
											void handleSendMessage();
										}
									}}
									placeholder="Send a follow-up..."
									className="h-20 flex-1 resize-none rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-foreground/40"
								/>
								<button
									type="button"
									onClick={handleSendMessage}
									disabled={isSending || !messageDraft.trim()}
									className="flex w-11 items-center justify-center rounded-md bg-foreground text-background transition-opacity disabled:opacity-50"
									aria-label="Send message"
								>
									<LuSend className="size-4" />
								</button>
							</div>
						</div>
					</div>

					{openedBrowserTargets.map((target) => {
						const isTargetActive =
							viewMode === "browser" && nativeBrowserKey === target.key;
						return (
							<div
								key={target.key}
								className={cn(
									"absolute inset-0 flex min-h-0",
									isTargetActive
										? "pointer-events-auto opacity-100"
										: "pointer-events-none opacity-0",
								)}
							>
								<DashboardWebView
									cacheKey={`native-browser:${target.provider}:${target.id}`}
									id={`native-browser-${target.provider}-${target.id}`}
									label={target.title}
									isActive={isTargetActive}
									url={target.url}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<div className="mx-auto flex max-w-6xl flex-col gap-4">
						<div className="flex items-end justify-between gap-3">
							<div>
								<h2 className="text-sm font-semibold">
									All my {nativeAgentConversationSetLabel(provider)}
								</h2>
								<p className="text-xs text-muted-foreground">
									{provider === "devin" && effectiveUserEmail
										? `Filtered to ${effectiveUserEmail}, including sessions from Devin UI, Slack, and Clankee.`
										: "Filtered to conversations this local workspace can identify as yours."}
								</p>
							</div>
						</div>

						{(provider === "capy"
							? capyThreadsQuery.isLoading
							: devinSessionsQuery.isLoading) && workspaceItems.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
								Loading...
							</div>
						) : (
							<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
								{workspaceItems.map((item) => (
									<div
										key={item.id}
										title={`${item.title}\n${item.id}${item.status ? `\n${item.status}` : ""}`}
										className="group flex min-h-24 flex-col rounded-lg border border-border bg-muted/20 p-3 text-left transition-colors hover:bg-accent/40 hover:text-foreground"
									>
										<button
											type="button"
											onClick={() => {
												if (provider === "capy") {
													navigate({
														to: "/native/capy/$threadId",
														params: { threadId: item.id },
													});
													return;
												}
												navigate({
													to: "/native/devin/$sessionId",
													params: { sessionId: item.id },
												});
											}}
											className="min-w-0 flex-1 text-left"
										>
											<div className="flex items-start gap-2">
												<span className="min-w-0 flex-1 truncate text-sm font-medium">
													{item.title}
												</span>
												{item.status && (
													<span
														className={cn(
															"shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
															nativeAgentStatusTone(item.status),
														)}
													>
														{item.status}
													</span>
												)}
											</div>
											<div className="mt-2 line-clamp-2 break-all text-xs text-muted-foreground">
												{item.id}
											</div>
										</button>
										<div className="mt-3 flex items-center justify-between gap-2">
											<span className="text-[10px] text-muted-foreground">
												{item.sidebarHidden
													? "In overview"
													: item.sidebarPinned
														? "Pinned in sidebar"
														: "Auto sidebar"}
											</span>
											<button
												type="button"
												onClick={() =>
													void handleSetSidebarVisible(
														item,
														item.sidebarHidden === true,
													)
												}
												disabled={setSidebarVisible.isPending}
												className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
											>
												<LuPin
													className={cn(
														"size-3",
														item.sidebarHidden !== true && "fill-current",
													)}
												/>
												<span>
													{item.sidebarHidden ? "Show in sidebar" : "Hide"}
												</span>
											</button>
											{item.sidebarHidden !== true && (
												<button
													type="button"
													onClick={() =>
														void handleSetPinned(item, !item.sidebarPinned)
													}
													disabled={setPinned.isPending}
													className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
												>
													<LuPin
														className={cn(
															"size-3",
															item.sidebarPinned && "fill-current",
														)}
													/>
													<span>{item.sidebarPinned ? "Unpin" : "Pin"}</span>
												</button>
											)}
										</div>
									</div>
								))}
								{workspaceItems.length === 0 && (
									<div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
										No matching{" "}
										{nativeAgentConversationLabel(provider, { plural: true })}{" "}
										yet.
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
