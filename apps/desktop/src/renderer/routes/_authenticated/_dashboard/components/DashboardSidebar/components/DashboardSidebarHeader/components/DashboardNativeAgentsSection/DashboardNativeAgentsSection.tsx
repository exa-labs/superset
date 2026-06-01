import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@superset/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { toast } from "@superset/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
	LuArchive,
	LuFolder,
	LuFolderPlus,
	LuFolderX,
	LuPalette,
	LuPencil,
	LuPin,
	LuPlus,
} from "react-icons/lu";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { authClient } from "renderer/lib/auth-client";
import { electronTrpc } from "renderer/lib/electron-trpc";
import {
	formatNativeAgentTimestamp,
	isFreshNativeAgentResponse,
	isNativeAgentLiveStatus,
	type NativeAgentProvider,
	nativeAgentConversationLabel,
	nativeAgentProviderConfig,
	nativeAgentStatusDotTone,
	nativeAgentStatusTone,
	nativeAgentTimestampMs,
	normalizeNativeAgentRole,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-ui";
import { DashboardWebPageIcon } from "../DashboardWebPagesGrid/components/DashboardWebPageIcon";

interface DashboardNativeAgentsSectionProps {
	variant: "collapsed" | "expanded";
}

type NativeAgentItem = {
	id: string;
	title: string;
	status: string | null;
	subtitle: string;
	updatedAt: string | number | null | undefined;
	provider: NativeAgentProvider;
	isProviderActive?: boolean;
	sidebarPinned?: boolean;
	sidebarHidden?: boolean;
	latestMessage?: {
		body: string;
		createdAt: string | number | null | undefined;
		role?: string | null;
	} | null;
};

type NativeAgentFolder = {
	id: string;
	provider: NativeAgentProvider;
	title: string;
	isCollapsed: boolean;
	color: string;
	createdAt: number;
	updatedAt: number;
};

const CAPY_MONOREPO_PROJECT_ID = "a275b1f7-318b-49ed-b2c8-5bb31ca7cd97";
const CAPY_LOCAL_USER_EMAIL = "lakee@exa.ai";
const COLLAPSED_STORAGE_KEY = "dashboard-native-agent-collapsed-v1";
const FOLDERS_STORAGE_KEY = "dashboard-native-agent-folders-v1";
const SESSION_FOLDERS_STORAGE_KEY = "dashboard-native-agent-session-folders-v1";
const READ_STATE_STORAGE_KEY = "dashboard-native-agent-read-state-v1";
const FOLDER_COLORS = [
	"#38bdf8",
	"#0ea5e9",
	"#a78bfa",
	"#8b5cf6",
	"#f472b6",
	"#ec4899",
	"#34d399",
	"#10b981",
	"#fbbf24",
	"#f59e0b",
	"#fb7185",
	"#ef4444",
	"#f97316",
	"#84cc16",
	"#14b8a6",
	"#6366f1",
	"#d946ef",
	"#64748b",
];
const NATIVE_AGENT_LIST_CACHE_MS = 2 * 60 * 60 * 1000;

const PROVIDERS = [
	nativeAgentProviderConfig("capy"),
	nativeAgentProviderConfig("devin"),
];

function readJson<T>(key: string, fallback: T): T {
	if (typeof localStorage === "undefined") return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function writeJson(key: string, value: unknown) {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}

function readCollapsedProviderIds(): Set<NativeAgentProvider> {
	const parsed = readJson<string[]>(COLLAPSED_STORAGE_KEY, []);
	return new Set(
		parsed.filter(
			(item): item is NativeAgentProvider =>
				item === "capy" || item === "devin",
		),
	);
}

function readFolders(): NativeAgentFolder[] {
	const parsed = readJson<NativeAgentFolder[]>(FOLDERS_STORAGE_KEY, []);
	return parsed
		.filter(
			(folder) =>
				(folder.provider === "capy" || folder.provider === "devin") &&
				typeof folder.id === "string" &&
				typeof folder.title === "string",
		)
		.map((folder, index) => ({
			...folder,
			color:
				typeof folder.color === "string" && folder.color
					? folder.color
					: (FOLDER_COLORS[index % FOLDER_COLORS.length] ?? FOLDER_COLORS[0]),
		}));
}

function readSessionFolders(): Record<string, string | null> {
	return readJson<Record<string, string | null>>(
		SESSION_FOLDERS_STORAGE_KEY,
		{},
	);
}

function writeFolders(folders: NativeAgentFolder[]) {
	writeJson(FOLDERS_STORAGE_KEY, folders);
}

function writeSessionFolders(sessionFolders: Record<string, string | null>) {
	writeJson(SESSION_FOLDERS_STORAGE_KEY, sessionFolders);
}

function sessionFolderKey(provider: NativeAgentProvider, id: string): string {
	return `${provider}:${id}`;
}

function readReadState(): Record<string, number> {
	return readJson<Record<string, number>>(READ_STATE_STORAGE_KEY, {});
}

function writeReadState(readState: Record<string, number>) {
	writeJson(READ_STATE_STORAGE_KEY, readState);
}

function latestAgentMessageTime(item: NativeAgentItem): number | null {
	if (!item.latestMessage) return null;
	return nativeAgentTimestampMs(item.latestMessage.createdAt);
}

function hasUnreadAgentResponse(
	item: NativeAgentItem,
	readState: Record<string, number>,
): boolean {
	if (!item.latestMessage) return false;
	if (normalizeNativeAgentRole(item.latestMessage.role, item.provider).isUser)
		return false;
	const latestTime = latestAgentMessageTime(item);
	if (latestTime == null) return false;
	return (
		latestTime > (readState[sessionFolderKey(item.provider, item.id)] ?? 0)
	);
}

function parseTags(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function makeFolderId(provider: NativeAgentProvider): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return `${provider}-native-folder-${crypto.randomUUID()}`;
	}
	return `${provider}-native-folder-${Date.now().toString(36)}`;
}

function activeNativeRoute(pathname: string): {
	provider: NativeAgentProvider | null;
	id: string | null;
} {
	const capyMatch = /\/native\/capy\/([^/]+)/.exec(pathname);
	if (capyMatch?.[1])
		return { id: decodeURIComponent(capyMatch[1]), provider: "capy" };
	const devinMatch = /\/native\/devin\/([^/]+)/.exec(pathname);
	if (devinMatch?.[1]) {
		return { id: decodeURIComponent(devinMatch[1]), provider: "devin" };
	}
	if (pathname.includes("/native/capy")) return { id: null, provider: "capy" };
	if (pathname.includes("/native/devin"))
		return { id: null, provider: "devin" };
	return { id: null, provider: null };
}

function NativeCreateDialog({
	open,
	provider,
	onCreated,
	onOpenChange,
}: {
	open: boolean;
	provider: NativeAgentProvider | null;
	onCreated: (item: { id: string; provider: NativeAgentProvider }) => void;
	onOpenChange: (open: boolean) => void;
}) {
	const [prompt, setPrompt] = useState("");
	const [title, setTitle] = useState("");
	const [tags, setTags] = useState("");
	const createCapy = electronTrpc.nativeAgents.capy.createThread.useMutation();
	const createDevin =
		electronTrpc.nativeAgents.devin.createSession.useMutation();
	const isCreating = createCapy.isPending || createDevin.isPending;

	const handleCreate = async () => {
		const trimmedPrompt = prompt.trim();
		if (!provider || !trimmedPrompt) return;
		try {
			if (provider === "capy") {
				const thread = await createCapy.mutateAsync({
					projectId: CAPY_MONOREPO_PROJECT_ID,
					prompt: trimmedPrompt,
					tags: parseTags(tags),
				});
				onCreated({ id: thread.id, provider });
			} else {
				const session = await createDevin.mutateAsync({
					prompt: trimmedPrompt,
					tags: parseTags(tags),
					title: title.trim() || undefined,
				});
				onCreated({ id: session.id, provider });
			}
			setPrompt("");
			setTitle("");
			setTags("");
			onOpenChange(false);
			toast.success(`${nativeAgentConversationLabel(provider)} created`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[460px]">
				<DialogHeader>
					<DialogTitle>
						New{" "}
						{provider ? nativeAgentConversationLabel(provider) : "conversation"}
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<textarea
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
						placeholder="What should the agent do?"
						className="h-28 resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-foreground/40"
					/>
					{provider === "devin" && (
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Optional title"
							className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
						/>
					)}
					<input
						value={tags}
						onChange={(event) => setTags(event.target.value)}
						placeholder="tags, comma separated"
						className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
					/>
					<button
						type="button"
						onClick={handleCreate}
						disabled={isCreating || !prompt.trim()}
						className="h-9 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity disabled:opacity-50"
					>
						{isCreating ? "Creating..." : "Create"}
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SessionRow({
	activeId,
	item,
	onMoveToFolder,
	onOpen,
	onPin,
	onSidebarVisible,
	shortcutLabel,
	variant,
}: {
	activeId: string | null;
	item: NativeAgentItem;
	onMoveToFolder: (item: NativeAgentItem, folderId: string | null) => void;
	onOpen: (item: NativeAgentItem) => void;
	onPin: (item: NativeAgentItem, pinned: boolean) => void;
	onSidebarVisible: (item: NativeAgentItem, visible: boolean) => void;
	shortcutLabel: string | null;
	variant: "collapsed" | "expanded";
}) {
	if (variant === "collapsed") return null;
	const isActive = activeId === item.id;
	const hasFreshAgentResponse = isFreshNativeAgentResponse(item, item.provider);
	const latestPreview = item.latestMessage?.body.trim();

	return (
		<li
			draggable
			onDragStart={(event) => {
				event.dataTransfer.setData(
					"application/x-native-agent-session",
					JSON.stringify({ id: item.id, provider: item.provider }),
				);
			}}
			className={cn(
				"group relative flex min-h-10 items-center gap-1 rounded-md border border-transparent pr-1 transition-colors",
				isActive
					? "border-border/80 bg-accent/70 text-foreground shadow-sm"
					: "text-muted-foreground hover:border-border/50 hover:bg-accent/30 hover:text-foreground",
				hasFreshAgentResponse &&
					!isActive &&
					"bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-500/25",
			)}
		>
			<button
				type="button"
				data-native-agent-session-row-id={item.id}
				data-native-agent-session-row-provider={item.provider}
				onClick={() => onOpen(item)}
				title={`${item.title}\n${item.id}${item.status ? `\n${item.status}` : ""}\n${item.subtitle}`}
				className="flex min-w-0 flex-1 flex-col px-2 py-1.5 text-left"
			>
				<span className="flex min-w-0 items-center gap-2">
					{hasFreshAgentResponse && (
						<span className="size-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
					)}
					<span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-4">
						{item.title}
					</span>
					{item.status && (
						<span
							className={cn(
								"inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium leading-none",
								nativeAgentStatusTone(item.status),
							)}
						>
							<span
								className={cn(
									"size-1.5 rounded-full",
									nativeAgentStatusDotTone(item.status),
								)}
							/>
							{item.status}
						</span>
					)}
				</span>
				<span className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] leading-3 text-muted-foreground/70">
					<span className="min-w-0 flex-1 truncate font-mono">
						{hasFreshAgentResponse && latestPreview
							? latestPreview
							: item.subtitle}
					</span>
					<span className="shrink-0">
						{formatNativeAgentTimestamp(item.updatedAt)}
					</span>
					{shortcutLabel && (
						<span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
							{shortcutLabel}
						</span>
					)}
				</span>
			</button>
			<Tooltip delayDuration={250}>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label={
							item.sidebarPinned
								? `Unpin ${item.title} from native sidebar`
								: `Pin ${item.title} to native sidebar`
						}
						onClick={() => onPin(item, item.sidebarPinned !== true)}
						className={cn(
							"flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-[10px] font-medium leading-none transition hover:bg-accent hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100",
							item.sidebarPinned
								? "border border-border/70 bg-background/70 text-foreground opacity-100"
								: "text-muted-foreground/70 opacity-0",
						)}
					>
						<LuPin
							className={cn("size-3", item.sidebarPinned && "fill-current")}
						/>
						{item.sidebarPinned && <span>Unpin</span>}
					</button>
				</TooltipTrigger>
				<TooltipContent side="right">
					{item.sidebarPinned ? "Unpin from sidebar" : "Pin to sidebar"}
				</TooltipContent>
			</Tooltip>
			<button
				type="button"
				aria-label={`Move ${item.title} to overview`}
				onClick={() => onSidebarVisible(item, false)}
				title="Move to overview"
				className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
			>
				<LuArchive className="size-3" />
			</button>
			<button
				type="button"
				aria-label={`Move ${item.title} out of folder`}
				onClick={() => onMoveToFolder(item, null)}
				className="sr-only"
			/>
		</li>
	);
}

export function DashboardNativeAgentsSection({
	variant,
}: DashboardNativeAgentsSectionProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: session } = authClient.useSession();
	const utils = electronTrpc.useUtils();
	const activeRoute = activeNativeRoute(location.pathname);
	const capyShortcut = useHotkeyDisplay("OPEN_CAPY").text;
	const devinShortcut = useHotkeyDisplay("OPEN_DEVIN").text;
	const credentialStatus =
		electronTrpc.nativeAgents.credentials.status.useQuery(undefined, {
			staleTime: 15_000,
		});
	const effectiveDevinUserEmail =
		credentialStatus.data?.devin.userEmail ?? session?.user.email;
	const [collapsedProviderIds, setCollapsedProviderIds] = useState(() =>
		readCollapsedProviderIds(),
	);
	const [folders, setFolders] = useState(() => readFolders());
	const [sessionFolders, setSessionFolders] = useState(() =>
		readSessionFolders(),
	);
	const [readState, setReadState] = useState(() => readReadState());
	const [createProvider, setCreateProvider] =
		useState<NativeAgentProvider | null>(null);
	const [editingFolder, setEditingFolder] = useState<NativeAgentFolder | null>(
		null,
	);
	const [deleteFolderTarget, setDeleteFolderTarget] =
		useState<NativeAgentFolder | null>(null);
	const [folderTitleDraft, setFolderTitleDraft] = useState("");

	const capyThreadsQuery = electronTrpc.nativeAgents.capy.listThreads.useQuery(
		{
			limit: 100,
			mineOnly: true,
			projectId: CAPY_MONOREPO_PROJECT_ID,
			userEmail: CAPY_LOCAL_USER_EMAIL,
		},
		{
			gcTime: NATIVE_AGENT_LIST_CACHE_MS,
			refetchInterval: 60_000,
			staleTime: 60_000,
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
				gcTime: NATIVE_AGENT_LIST_CACHE_MS,
				refetchInterval: 10_000,
				staleTime: 10_000,
			},
		);
	const devinSessionsQuery =
		electronTrpc.nativeAgents.devin.listSessions.useQuery(
			{
				limit: 100,
				mineOnly: true,
				userEmail: effectiveDevinUserEmail,
			},
			{
				gcTime: NATIVE_AGENT_LIST_CACHE_MS,
				refetchInterval: 15_000,
				staleTime: 60_000,
			},
		);
	const setPinned = electronTrpc.nativeAgents.metadata.setPinned.useMutation();
	const setSidebarVisible =
		electronTrpc.nativeAgents.metadata.setSidebarVisible.useMutation();

	const itemsByProvider = useMemo(() => {
		const activeCapyThreadIds = new Set(
			(capyActiveThreadsQuery.data?.items ?? []).map((thread) => thread.id),
		);
		const capyThreadsById = new Map(
			[
				...(capyThreadsQuery.data?.items ?? []),
				...(capyActiveThreadsQuery.data?.items ?? []),
			].map((thread) => [thread.id, thread]),
		);
		const capyItems: NativeAgentItem[] = [...capyThreadsById.values()].map(
			(thread) => {
				const latestMessage =
					thread.latestMessage ?? thread.lastMessage ?? null;
				return {
					id: thread.id,
					isProviderActive: activeCapyThreadIds.has(thread.id),
					latestMessage: latestMessage
						? {
								body: latestMessage.content,
								createdAt: latestMessage.createdAt,
								role: latestMessage.role,
							}
						: null,
					provider: "capy" as const,
					sidebarHidden: thread.nativeAgentMetadata?.hiddenFromSidebar === true,
					sidebarPinned: thread.nativeAgentMetadata?.pinned === true,
					status: thread.runState ?? thread.status ?? null,
					subtitle:
						thread.tasks?.[0]?.identifier ??
						thread.pullRequests?.[0]?.repoFullName ??
						thread.projectId,
					title: thread.title ?? "Untitled thread",
					updatedAt:
						latestMessage?.createdAt ?? thread.updatedAt ?? thread.createdAt,
				};
			},
		);
		const devinItems: NativeAgentItem[] = (
			devinSessionsQuery.data?.items ?? []
		).map((session) => ({
			id: session.id,
			latestMessage: session.latestMessage ?? null,
			provider: "devin" as const,
			sidebarHidden: session.nativeAgentMetadata?.hiddenFromSidebar === true,
			sidebarPinned: session.nativeAgentMetadata?.pinned === true,
			status: session.status,
			subtitle: session.pullRequestUrl ?? session.id,
			title: session.title ?? session.id,
			updatedAt: session.updatedAt ?? session.createdAt,
		}));
		return {
			capy: capyItems,
			devin: devinItems,
		};
	}, [
		capyActiveThreadsQuery.data?.items,
		capyThreadsQuery.data?.items,
		devinSessionsQuery.data?.items,
	]);

	const setProviderCollapsed = (
		provider: NativeAgentProvider,
		isCollapsed: boolean,
	) => {
		setCollapsedProviderIds((current) => {
			const next = new Set(current);
			if (isCollapsed) next.add(provider);
			else next.delete(provider);
			writeJson(COLLAPSED_STORAGE_KEY, [...next]);
			return next;
		});
	};

	const createFolder = (provider: NativeAgentProvider) => {
		const now = Date.now();
		const providerFolderCount = folders.filter(
			(folder) => folder.provider === provider,
		).length;
		const nextFolder: NativeAgentFolder = {
			id: makeFolderId(provider),
			provider,
			title: "Folder",
			isCollapsed: false,
			color:
				FOLDER_COLORS[providerFolderCount % FOLDER_COLORS.length] ??
				FOLDER_COLORS[0],
			createdAt: now,
			updatedAt: now,
		};
		setFolders((current) => {
			const next = [...current, nextFolder];
			writeFolders(next);
			return next;
		});
		setProviderCollapsed(provider, false);
	};

	const moveToFolder = (item: NativeAgentItem, folderId: string | null) => {
		setSessionFolders((current) => {
			const next = {
				...current,
				[sessionFolderKey(item.provider, item.id)]: folderId,
			};
			writeSessionFolders(next);
			return next;
		});
	};

	const deleteFolder = (folder: NativeAgentFolder) => {
		setFolders((current) => {
			const next = current.filter((item) => item.id !== folder.id);
			writeFolders(next);
			return next;
		});
		setSessionFolders((current) => {
			const next = { ...current };
			for (const [key, folderId] of Object.entries(next)) {
				if (folderId === folder.id) {
					next[key] = null;
				}
			}
			writeSessionFolders(next);
			return next;
		});
	};

	const renameFolder = (folderId: string, title: string) => {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;
		setFolders((current) => {
			const next = current.map((folder) =>
				folder.id === folderId
					? { ...folder, title: trimmedTitle, updatedAt: Date.now() }
					: folder,
			);
			writeFolders(next);
			return next;
		});
	};

	const setFolderColor = (folderId: string, color: string) => {
		setFolders((current) => {
			const next = current.map((folder) =>
				folder.id === folderId
					? { ...folder, color, updatedAt: Date.now() }
					: folder,
			);
			writeFolders(next);
			return next;
		});
	};

	const openFolderEditor = (folder: NativeAgentFolder) => {
		setEditingFolder(folder);
		setFolderTitleDraft(folder.title);
	};

	const toggleFolder = (folderId: string) => {
		setFolders((current) => {
			const next = current.map((folder) =>
				folder.id === folderId
					? {
							...folder,
							isCollapsed: !folder.isCollapsed,
							updatedAt: Date.now(),
						}
					: folder,
			);
			writeFolders(next);
			return next;
		});
	};

	const handleOpen = (item: NativeAgentItem) => {
		const latestTime = latestAgentMessageTime(item);
		if (latestTime != null) {
			setReadState((current) => {
				const next = {
					...current,
					[sessionFolderKey(item.provider, item.id)]: latestTime,
				};
				writeReadState(next);
				return next;
			});
		}
		if (item.provider === "capy") {
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
	};

	const handlePin = async (item: NativeAgentItem, pinned: boolean) => {
		try {
			await setPinned.mutateAsync({
				id: item.id,
				pinned,
				provider: item.provider,
				title: item.title,
			});
			await Promise.all([
				utils.nativeAgents.capy.listThreads.invalidate(),
				utils.nativeAgents.devin.listSessions.invalidate(),
			]);
			toast.success(pinned ? "Pinned to sidebar" : "Removed from sidebar");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleSidebarVisible = async (
		item: NativeAgentItem,
		visible: boolean,
	) => {
		try {
			await setSidebarVisible.mutateAsync({
				id: item.id,
				provider: item.provider,
				title: item.title,
				visible,
			});
			await Promise.all([
				utils.nativeAgents.capy.listThreads.invalidate(),
				utils.nativeAgents.devin.listSessions.invalidate(),
			]);
			toast.success(visible ? "Shown in sidebar" : "Moved to overview");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleCreated = async (item: {
		id: string;
		provider: NativeAgentProvider;
	}) => {
		await Promise.all([
			utils.nativeAgents.capy.listThreads.invalidate(),
			utils.nativeAgents.devin.listSessions.invalidate(),
		]);
		if (item.provider === "capy") {
			navigate({ to: "/native/capy/$threadId", params: { threadId: item.id } });
			return;
		}
		navigate({
			to: "/native/devin/$sessionId",
			params: { sessionId: item.id },
		});
	};

	const openProvider = (provider: NativeAgentProvider) => {
		if (provider === "capy") {
			navigate({ to: "/native/capy" });
			return;
		}
		navigate({ to: "/native/devin" });
	};

	const displayedItemsForProvider = (items: NativeAgentItem[]) => {
		const visibleItems = items.filter((item) => item.sidebarHidden !== true);
		const activeItem = visibleItems.find((item) => item.id === activeRoute.id);
		const pinnedItems = visibleItems.filter((item) => item.sidebarPinned);
		const unreadItems = visibleItems.filter((item) =>
			hasUnreadAgentResponse(item, readState),
		);
		const liveItems = visibleItems.filter(
			(item) => item.isProviderActive || isNativeAgentLiveStatus(item.status),
		);
		const nextItems = [...pinnedItems];
		for (const item of [...unreadItems, ...liveItems]) {
			if (nextItems.length >= 10) break;
			if (!nextItems.some((candidate) => candidate.id === item.id)) {
				nextItems.push(item);
			}
		}
		const recentFallbackLimit = nextItems.length === 0 ? 3 : 1;
		for (const item of visibleItems) {
			if (nextItems.length >= pinnedItems.length + recentFallbackLimit) break;
			if (!nextItems.some((candidate) => candidate.id === item.id)) {
				nextItems.push(item);
			}
		}
		if (activeItem && !nextItems.some((item) => item.id === activeItem.id)) {
			return [activeItem, ...nextItems].slice(0, 11);
		}
		return nextItems;
	};

	useEffect(() => {
		if (!activeRoute.provider || !activeRoute.id) return;
		const item = itemsByProvider[activeRoute.provider].find(
			(candidate) => candidate.id === activeRoute.id,
		);
		if (!item) return;
		const latestTime = latestAgentMessageTime(item);
		if (latestTime == null) return;
		setReadState((current) => {
			const key = sessionFolderKey(item.provider, item.id);
			if ((current[key] ?? 0) >= latestTime) return current;
			const next = { ...current, [key]: latestTime };
			writeReadState(next);
			return next;
		});
	}, [activeRoute.id, activeRoute.provider, itemsByProvider]);

	useEffect(() => {
		const handleCreate = (event: Event) => {
			const provider = (
				event as CustomEvent<{ provider?: NativeAgentProvider }>
			).detail?.provider;
			if (provider !== "capy" && provider !== "devin") return;
			setCreateProvider(provider);
		};

		window.addEventListener("dashboard-native-agent-create", handleCreate);
		return () => {
			window.removeEventListener("dashboard-native-agent-create", handleCreate);
		};
	}, []);

	useEffect(() => {
		const isEditableTarget = (target: EventTarget | null) =>
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			(target instanceof HTMLElement && target.isContentEditable);

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
			if (!activeRoute.provider || isEditableTarget(event.target)) return;

			const rows = Array.from(
				document.querySelectorAll<HTMLButtonElement>(
					"[data-native-agent-session-row-id]",
				),
			);
			if (rows.length === 0) return;

			const activeIndex = rows.findIndex(
				(row) => row.dataset.nativeAgentSessionRowId === activeRoute.id,
			);
			const focusedIndex =
				document.activeElement instanceof HTMLButtonElement
					? rows.indexOf(document.activeElement)
					: -1;
			const currentIndex = activeIndex >= 0 ? activeIndex : focusedIndex;
			const nextIndex =
				event.key === "ArrowDown"
					? Math.min(rows.length - 1, currentIndex + 1)
					: Math.max(0, currentIndex - 1);
			const row = rows[nextIndex];
			if (!row || nextIndex === currentIndex) return;

			event.preventDefault();
			event.stopPropagation();
			row.focus();
			row.click();
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, [activeRoute.id, activeRoute.provider]);

	return (
		<div
			className={cn(
				"flex flex-col",
				variant === "collapsed" ? "gap-2" : "gap-1",
			)}
		>
			{PROVIDERS.map((providerConfig) => {
				const items = itemsByProvider[providerConfig.id];
				const displayedItems = displayedItemsForProvider(items);
				const isCollapsed = collapsedProviderIds.has(providerConfig.id);
				const providerFolders = folders.filter(
					(folder) => folder.provider === providerConfig.id,
				);
				const unfolderedItems = displayedItems.filter(
					(item) => !sessionFolders[sessionFolderKey(item.provider, item.id)],
				);
				const isActive = activeRoute.provider === providerConfig.id;
				const providerShortcut =
					providerConfig.id === "capy" ? capyShortcut : devinShortcut;
				const providerShortcutLabel =
					providerShortcut === "Unassigned" ? null : providerShortcut;
				const shortcutLabelForItem = (item: NativeAgentItem) => {
					if (!providerShortcutLabel) return null;
					const index = displayedItems.findIndex(
						(candidate) => candidate.id === item.id,
					);
					if (index < 0 || index > 8) return null;
					return `${providerShortcutLabel}${index + 1}`;
				};

				if (variant === "collapsed") {
					return (
						<Tooltip key={providerConfig.id} delayDuration={300}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => openProvider(providerConfig.id)}
									className={cn(
										"flex size-8 items-center justify-center rounded-md transition-colors",
										isActive
											? "bg-accent text-foreground"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
									)}
								>
									<DashboardWebPageIcon
										src={providerConfig.iconUrl}
										fallbackLabel={providerConfig.title}
										className="size-4"
									/>
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">
								{providerConfig.title}
							</TooltipContent>
						</Tooltip>
					);
				}

				return (
					<div key={providerConfig.id} className="flex flex-col gap-1.5 py-1">
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => openProvider(providerConfig.id)}
								className={cn(
									"flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors",
									isActive
										? "bg-accent text-foreground shadow-sm"
										: "text-muted-foreground hover:bg-accent/35 hover:text-foreground",
								)}
							>
								<DashboardWebPageIcon
									src={providerConfig.iconUrl}
									fallbackLabel={providerConfig.title}
									className="size-4"
								/>
								<span className="min-w-0 flex-1 truncate text-left">
									{providerConfig.title}
								</span>
								{providerShortcutLabel && (
									<span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
										{providerShortcutLabel}
									</span>
								)}
							</button>
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<button
										type="button"
										aria-expanded={!isCollapsed}
										aria-label={`${isCollapsed ? "Show" : "Hide"} ${providerConfig.title} sidebar ${nativeAgentConversationLabel(providerConfig.id, { plural: true })}`}
										onClick={() =>
											setProviderCollapsed(providerConfig.id, !isCollapsed)
										}
										className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/60 px-1 font-mono text-[10px] tabular-nums text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
									>
										{items.length}
									</button>
								</TooltipTrigger>
								<TooltipContent side="right">
									{isCollapsed
										? `Show sidebar ${nativeAgentConversationLabel(providerConfig.id, { plural: true })}`
										: `Hide sidebar ${nativeAgentConversationLabel(providerConfig.id, { plural: true })}`}
								</TooltipContent>
							</Tooltip>
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<button
										type="button"
										aria-label={`New ${providerConfig.title}`}
										onClick={() => setCreateProvider(providerConfig.id)}
										className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
									>
										<LuPlus className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="right">
									New {nativeAgentConversationLabel(providerConfig.id)}
								</TooltipContent>
							</Tooltip>
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<button
										type="button"
										aria-label={`New ${providerConfig.title} folder`}
										onClick={() => createFolder(providerConfig.id)}
										className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
									>
										<LuFolderPlus className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="right">New folder</TooltipContent>
							</Tooltip>
						</div>

						{!isCollapsed && (
							<div className="ml-2 flex flex-col gap-1.5 border-l border-border/50 pl-2">
								{providerFolders.map((folder) => {
									const folderItems = displayedItems.filter(
										(item) =>
											sessionFolders[
												sessionFolderKey(item.provider, item.id)
											] === folder.id,
									);
									const folderHasUnread = folderItems.some((item) =>
										hasUnreadAgentResponse(item, readState),
									);
									return (
										<div
											key={folder.id}
											className={cn(
												"flex flex-col gap-1 rounded-md",
												folderItems.length > 0 && "pb-0.5",
											)}
										>
											<fieldset
												onDragOver={(event) => event.preventDefault()}
												onDrop={(event) => {
													event.preventDefault();
													const payload = event.dataTransfer.getData(
														"application/x-native-agent-session",
													);
													if (!payload) return;
													const parsed = JSON.parse(payload) as {
														id?: string;
														provider?: NativeAgentProvider;
													};
													const item = items.find(
														(candidate) =>
															candidate.id === parsed.id &&
															candidate.provider === parsed.provider,
													);
													if (item) moveToFolder(item, folder.id);
												}}
												className={cn(
													"group/folder flex h-7 min-w-0 items-center gap-2 rounded-md border px-2 text-xs font-medium transition-colors",
													folderHasUnread
														? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
														: "border-transparent text-muted-foreground hover:border-border/50 hover:bg-accent/25 hover:text-foreground",
												)}
											>
												<span
													className="size-2.5 shrink-0 rounded-full"
													style={{ backgroundColor: folder.color }}
												/>
												<LuFolder className="size-3 shrink-0 text-muted-foreground/70" />
												<button
													type="button"
													onClick={() => toggleFolder(folder.id)}
													onDoubleClick={(event) => {
														event.preventDefault();
														event.stopPropagation();
														openFolderEditor(folder);
													}}
													className="min-w-0 flex-1 truncate text-left font-medium"
												>
													{folder.title}
												</button>
												<span className="rounded-sm bg-muted-foreground/10 px-1 font-mono text-[10px]">
													{folderItems.length === 0
														? "empty"
														: folderItems.length}
												</span>
												<button
													type="button"
													aria-label={`Rename ${folder.title}`}
													onClick={(event) => {
														event.stopPropagation();
														openFolderEditor(folder);
													}}
													className="flex size-5 items-center justify-center rounded opacity-0 transition hover:bg-accent group-hover/folder:opacity-100 group-focus-within/folder:opacity-100"
												>
													<LuPencil className="size-3" />
												</button>
												<button
													type="button"
													aria-label={`Change ${folder.title} color`}
													onClick={(event) => {
														event.stopPropagation();
														const currentIndex = FOLDER_COLORS.indexOf(
															folder.color,
														);
														setFolderColor(
															folder.id,
															FOLDER_COLORS[
																(currentIndex + 1) % FOLDER_COLORS.length
															] ?? FOLDER_COLORS[0],
														);
													}}
													className="flex size-5 items-center justify-center rounded opacity-0 transition hover:bg-accent group-hover/folder:opacity-100 group-focus-within/folder:opacity-100"
												>
													<LuPalette className="size-3" />
												</button>
												<button
													type="button"
													aria-label={`Delete ${folder.title}`}
													onClick={(event) => {
														event.stopPropagation();
														setDeleteFolderTarget(folder);
													}}
													className="flex size-5 items-center justify-center rounded opacity-0 transition hover:bg-accent hover:text-red-300 group-hover/folder:opacity-100 group-focus-within/folder:opacity-100"
												>
													<LuFolderX className="size-3" />
												</button>
											</fieldset>
											{!folder.isCollapsed && folderItems.length > 0 && (
												<ul
													className="ml-3 flex flex-col gap-1 border-l py-0.5 pl-2"
													style={{ borderColor: `${folder.color}66` }}
												>
													{folderItems.map((item) => (
														<SessionRow
															key={item.id}
															activeId={activeRoute.id}
															item={item}
															onMoveToFolder={moveToFolder}
															onOpen={handleOpen}
															onPin={handlePin}
															onSidebarVisible={handleSidebarVisible}
															shortcutLabel={shortcutLabelForItem(item)}
															variant={variant}
														/>
													))}
												</ul>
											)}
										</div>
									);
								})}
								{unfolderedItems.map((item) => (
									<SessionRow
										key={item.id}
										activeId={activeRoute.id}
										item={item}
										onMoveToFolder={moveToFolder}
										onOpen={handleOpen}
										onPin={handlePin}
										onSidebarVisible={handleSidebarVisible}
										shortcutLabel={shortcutLabelForItem(item)}
										variant={variant}
									/>
								))}
								{items.length === 0 && (
									<div className="px-2 py-1 text-xs text-muted-foreground/70">
										No{" "}
										{nativeAgentConversationLabel(providerConfig.id, {
											plural: true,
										})}{" "}
										yet.
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
			<NativeCreateDialog
				open={createProvider != null}
				provider={createProvider}
				onCreated={handleCreated}
				onOpenChange={(open) => {
					if (!open) setCreateProvider(null);
				}}
			/>
			<Dialog
				open={editingFolder != null}
				onOpenChange={(open) => {
					if (!open) setEditingFolder(null);
				}}
			>
				<DialogContent className="max-w-[360px]">
					<DialogHeader>
						<DialogTitle>Folder settings</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<input
							value={folderTitleDraft}
							onChange={(event) => setFolderTitleDraft(event.target.value)}
							onKeyDown={(event) => {
								if (event.key !== "Enter" || !editingFolder) return;
								renameFolder(editingFolder.id, folderTitleDraft);
								setEditingFolder(null);
							}}
							placeholder="Folder name"
							className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
						/>
						<div className="grid grid-cols-6 gap-2">
							{FOLDER_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									aria-label={`Set folder color ${color}`}
									onClick={() => {
										if (!editingFolder) return;
										setFolderColor(editingFolder.id, color);
										setEditingFolder({ ...editingFolder, color });
									}}
									className={cn(
										"size-8 rounded-md border transition",
										editingFolder?.color === color
											? "border-foreground ring-2 ring-ring"
											: "border-border hover:border-foreground/40",
									)}
									style={{ backgroundColor: color }}
								/>
							))}
						</div>
						<label className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
							<span className="min-w-0 flex-1">Custom color</span>
							<input
								type="color"
								value={editingFolder?.color ?? FOLDER_COLORS[0]}
								onChange={(event) => {
									if (!editingFolder) return;
									const color = event.target.value;
									setFolderColor(editingFolder.id, color);
									setEditingFolder({ ...editingFolder, color });
								}}
								className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
							/>
						</label>
						<button
							type="button"
							onClick={() => {
								if (!editingFolder) return;
								renameFolder(editingFolder.id, folderTitleDraft);
								setEditingFolder(null);
							}}
							disabled={!folderTitleDraft.trim()}
							className="h-9 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity disabled:opacity-50"
						>
							Save folder
						</button>
					</div>
				</DialogContent>
			</Dialog>
			<AlertDialog
				open={deleteFolderTarget != null}
				onOpenChange={(open) => {
					if (!open) setDeleteFolderTarget(null);
				}}
			>
				<AlertDialogContent className="max-w-[360px]">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete folder?</AlertDialogTitle>
						<AlertDialogDescription>
							Sessions in {deleteFolderTarget?.title ?? "this folder"} will stay
							available and move back to the provider list.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteFolderTarget) deleteFolder(deleteFolderTarget);
								setDeleteFolderTarget(null);
							}}
							className="bg-red-500 text-white hover:bg-red-500/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
