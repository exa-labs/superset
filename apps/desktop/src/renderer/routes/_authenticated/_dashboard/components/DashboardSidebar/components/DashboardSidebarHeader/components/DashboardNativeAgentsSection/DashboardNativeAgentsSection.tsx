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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { toast } from "@superset/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
	type DragEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import {
	LuArchive,
	LuEllipsis,
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
import { isDashboardSidebarSpaceKey } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useDashboardSidebarKeyboardNavigation/dashboard-sidebar-keyboard-actions";
import {
	createNativeAgentFolder,
	createNativeAgentSessionDragPayload,
	deleteNativeAgentFolder,
	forgetNativeAgentLastFolderId,
	moveNativeAgentSessionToFolder,
	NATIVE_AGENT_FOLDER_COLORS,
	NATIVE_AGENT_FOLDERS_STORAGE_KEY,
	NATIVE_AGENT_LAST_FOLDER_STORAGE_KEY,
	NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY,
	NATIVE_AGENT_SESSION_DRAG_MIME,
	type NativeAgentFolder,
	type NativeAgentLastFolderIds,
	nativeAgentSessionFolderKey,
	normalizeNativeAgentFolders,
	normalizeNativeAgentRecentFolderColors,
	normalizeNativeAgentSessionFolders,
	parseNativeAgentSessionDragPayload,
	rememberNativeAgentLastFolderId,
	rememberNativeAgentRecentFolderColor,
	renameNativeAgentFolder,
	setNativeAgentFolderCollapsed,
	setNativeAgentFolderColor,
	toggleNativeAgentFolderCollapsed,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-folders";
import {
	nativeAgentCreateVimActionFromKey,
	nativeAgentFolderVimActionFromKey,
	nativeAgentSidebarVimActionFromKey,
	nativeAgentUnreadVimActionFromKey,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-keyboard";
import {
	applyNativeAgentOptimisticPinned,
	applyNativeAgentOptimisticSidebarVisible,
	mergeActiveNativeAgentRows,
	type NativeAgentOptimisticMetadataMap,
	nativeAgentDisplayTitle,
	nativeAgentSidebarInclusionReasons,
	resolveNativeAgentSidebarState,
	restoreNativeAgentOptimisticSidebarState,
	selectNativeAgentProviderActiveRows,
	selectNativeAgentSidebarItems,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-listing";
import {
	getLatestUnreadNativeAgentReplyItem,
	getUnreadNativeAgentReplyNotifications,
	markNativeAgentReplyNotificationRead,
	NATIVE_AGENT_READ_STATE_CHANGE_EVENT,
	nativeAgentNotificationKey,
	readLatestNativeAgentReplyNotification,
	readNativeAgentReadState,
	writeLatestNativeAgentReplyNotification,
	writeNativeAgentReadState,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-notifications";
import {
	formatNativeAgentTimestamp,
	isFreshNativeAgentResponse,
	isNativeAgentLiveStatus,
	type NativeAgentProvider,
	nativeAgentConversationLabel,
	nativeAgentProviderConfig,
	nativeAgentStatusBadgeLabel,
	nativeAgentStatusDotTone,
	nativeAgentTimestampMs,
	normalizeNativeAgentRole,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-ui";
import {
	DASHBOARD_MARK_LATEST_NATIVE_REPLY_READ_EVENT,
	DASHBOARD_OPEN_UNREAD_NATIVE_REPLY_EVENT,
	handleDashboardGlobalKeyboardAction,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-global-keyboard-action";
import {
	dashboardVimKey,
	shouldHandleDashboardVimKey,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import {
	getDashboardHashPathname,
	subscribeDashboardHashPathname,
} from "renderer/routes/_authenticated/lib/dashboardHashPathname";
import { DashboardWebPageIcon } from "../DashboardWebPagesGrid/components/DashboardWebPageIcon";

interface DashboardNativeAgentsSectionProps {
	searchQuery?: string;
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
	titleOverride?: string | null;
	latestMessage?: {
		body: string;
		createdAt: string | number | null | undefined;
		role?: string | null;
	} | null;
};

type NativeAgentFolderCommandAction =
	| "color"
	| "create"
	| "delete"
	| "move-active"
	| "remove-active"
	| "rename";
type NativeAgentSidebarSessionAction =
	| "focus-composer"
	| "open-browser"
	| "rename"
	| "toggle-browser";

const CAPY_MONOREPO_PROJECT_ID = "a275b1f7-318b-49ed-b2c8-5bb31ca7cd97";
const CAPY_LOCAL_USER_EMAIL = "lakee@exa.ai";
const COLLAPSED_STORAGE_KEY = "dashboard-native-agent-collapsed-v1";
const FOLDERS_STORAGE_KEY = NATIVE_AGENT_FOLDERS_STORAGE_KEY;
const RECENT_FOLDER_COLORS_STORAGE_KEY =
	NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY;
const SESSION_FOLDERS_STORAGE_KEY = "dashboard-native-agent-session-folders-v1";
const NOTIFIED_STATE_STORAGE_KEY = "dashboard-native-agent-notified-replies-v1";
const LAST_FOLDER_STORAGE_KEY = NATIVE_AGENT_LAST_FOLDER_STORAGE_KEY;
const CAPY_BACKGROUND_SYNC_STORAGE_KEY = "dashboard-native-agent-capy-sync-v1";
const FOLDER_COLORS: string[] = [...NATIVE_AGENT_FOLDER_COLORS];
const NATIVE_AGENT_LIST_CACHE_MS = 2 * 60 * 60 * 1000;
const CAPY_BACKGROUND_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const CAPY_BACKGROUND_SYNC_SCAN_PAGE_LIMIT = 25;

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
	return normalizeNativeAgentFolders(parsed);
}

function readRecentFolderColors(): string[] {
	const parsed = readJson<string[]>(RECENT_FOLDER_COLORS_STORAGE_KEY, []);
	return normalizeNativeAgentRecentFolderColors(parsed);
}

function readSessionFolders(): Record<string, string | null> {
	return normalizeNativeAgentSessionFolders(
		readJson<Record<string, string | null>>(SESSION_FOLDERS_STORAGE_KEY, {}),
		readFolders(),
	);
}

function writeFolders(folders: NativeAgentFolder[]) {
	writeJson(FOLDERS_STORAGE_KEY, folders);
}

function writeRecentFolderColors(colors: string[]) {
	writeJson(RECENT_FOLDER_COLORS_STORAGE_KEY, colors);
}

function writeSessionFolders(sessionFolders: Record<string, string | null>) {
	writeJson(SESSION_FOLDERS_STORAGE_KEY, sessionFolders);
}

function readNotifiedState(): Record<string, number> {
	return readJson<Record<string, number>>(NOTIFIED_STATE_STORAGE_KEY, {});
}

function writeNotifiedState(notifiedState: Record<string, number>) {
	writeJson(NOTIFIED_STATE_STORAGE_KEY, notifiedState);
}

function readLastFolderIds(): NativeAgentLastFolderIds {
	return readJson<NativeAgentLastFolderIds>(LAST_FOLDER_STORAGE_KEY, {});
}

function writeLastFolderIds(lastFolderIds: NativeAgentLastFolderIds) {
	writeJson(LAST_FOLDER_STORAGE_KEY, lastFolderIds);
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
		latestTime >
		(readState[nativeAgentSessionFolderKey(item.provider, item.id)] ?? 0)
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

function dispatchNativeAgentCurrentAction(
	action: NativeAgentSidebarSessionAction,
	provider: NativeAgentProvider,
): void {
	window.dispatchEvent(
		new CustomEvent("dashboard-native-agent-current-action", {
			detail: { action, provider },
		}),
	);
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
	onCreate,
	onMoveToFolder,
	onOpen,
	onPin,
	onSessionAction,
	onSidebarVisible,
	readState,
	shortcutLabel,
	variant,
}: {
	activeId: string | null;
	item: NativeAgentItem;
	onCreate: (provider: NativeAgentProvider) => void;
	onMoveToFolder: (item: NativeAgentItem, folderId: string | null) => void;
	onOpen: (item: NativeAgentItem) => void;
	onPin: (item: NativeAgentItem, pinned: boolean) => void;
	onSessionAction: (
		item: NativeAgentItem,
		action: NativeAgentSidebarSessionAction,
	) => void;
	onSidebarVisible: (item: NativeAgentItem, visible: boolean) => void;
	readState: Record<string, number>;
	shortcutLabel: string | null;
	variant: "collapsed" | "expanded";
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	if (variant === "collapsed") return null;
	const isActive = activeId === item.id;
	const hasFreshAgentResponse = isFreshNativeAgentResponse(item, item.provider);
	const isProviderActive =
		item.isProviderActive || isNativeAgentLiveStatus(item.status);
	const statusLabel = nativeAgentStatusBadgeLabel(item.status);
	const latestPreview = item.latestMessage?.body.trim();
	const inclusionReasons = nativeAgentSidebarInclusionReasons(item, {
		activeId,
		isLiveStatus: isNativeAgentLiveStatus,
		isUnread: (candidate) => hasUnreadAgentResponse(candidate, readState),
	});
	const moveToLastFolder = () => {
		window.dispatchEvent(
			new CustomEvent("dashboard-native-agent-folder-action", {
				detail: {
					action: "move-active",
					provider: item.provider,
					sessionId: item.id,
				},
			}),
		);
	};

	return (
		<li
			data-dashboard-sidebar-action-scope
			draggable
			onDragStart={(event) => {
				event.dataTransfer.setData(
					NATIVE_AGENT_SESSION_DRAG_MIME,
					createNativeAgentSessionDragPayload({
						id: item.id,
						provider: item.provider,
					}),
				);
				event.dataTransfer.effectAllowed = "move";
			}}
			className={cn(
				"group relative flex min-h-10 w-full min-w-0 max-w-full items-start overflow-hidden rounded-md border border-transparent transition-colors",
				isActive
					? "border-border/80 bg-accent/70 text-foreground shadow-sm"
					: "text-muted-foreground hover:border-border/50 hover:bg-accent/30 hover:text-foreground",
				hasFreshAgentResponse &&
					!isActive &&
					"bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-500/25",
				isProviderActive &&
					!isActive &&
					"border-emerald-500/35 bg-emerald-500/5",
			)}
		>
			<button
				type="button"
				data-dashboard-sidebar-active={isActive ? "true" : undefined}
				data-dashboard-sidebar-typeahead-label={`${nativeAgentProviderConfig(item.provider).title} ${item.title} ${item.subtitle}`}
				data-native-agent-session-row-id={item.id}
				data-native-agent-session-row-provider={item.provider}
				onClick={() => onOpen(item)}
				title={`${item.title}\n${item.id}${item.status ? `\n${item.status}` : ""}\n${item.subtitle}\nShown: ${inclusionReasons.join(", ")}\nEnter opens. Press . for menu or f for action hints.`}
				className="flex min-w-0 flex-1 flex-col overflow-hidden py-1.5 pl-2 pr-16 text-left"
			>
				<span className="flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden">
					<span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
						{hasFreshAgentResponse && (
							<span className="size-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
						)}
						{item.status && statusLabel && (
							<span
								aria-label={statusLabel}
								role="img"
								title={item.status}
								className={cn(
									"size-2 shrink-0 rounded-full ring-1 ring-background/70",
									nativeAgentStatusDotTone(item.status),
								)}
							/>
						)}
						<span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-4">
							{item.title}
						</span>
					</span>
				</span>
				<span className="mt-0.5 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 text-[10px] leading-3 text-muted-foreground/70">
					<span className="min-w-0 truncate font-mono">
						{hasFreshAgentResponse && latestPreview
							? latestPreview
							: item.subtitle}
					</span>
					<span className="max-w-10 shrink-0 overflow-hidden truncate text-right tabular-nums">
						{formatNativeAgentTimestamp(item.updatedAt)}
					</span>
					{shortcutLabel && (
						<span className="max-w-8 shrink-0 overflow-hidden truncate text-right font-mono text-[10px] text-muted-foreground/60">
							{shortcutLabel}
						</span>
					)}
				</span>
			</button>
			<div
				className={cn(
					"absolute right-1 top-1 flex w-16 shrink-0 items-start justify-end gap-0.5 rounded-md bg-background/90 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
					(item.sidebarPinned || menuOpen) && "opacity-100",
				)}
			>
				<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							data-dashboard-sidebar-action="menu"
							aria-keyshortcuts="."
							aria-label={`Show actions for ${item.title}`}
							title="Show actions (.)"
							className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-70 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
						>
							<LuEllipsis className="size-3" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="right" align="start" className="w-56">
						<DropdownMenuItem onSelect={() => onOpen(item)}>
							Open
							<DropdownMenuShortcut>Enter</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => onSessionAction(item, "focus-composer")}
						>
							Reply
							<DropdownMenuShortcut>r</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={() => onSessionAction(item, "open-browser")}
						>
							Open browser view
							<DropdownMenuShortcut>o</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => onSessionAction(item, "toggle-browser")}
						>
							Toggle native/browser
							<DropdownMenuShortcut>b</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => onSessionAction(item, "rename")}>
							Rename
							<DropdownMenuShortcut>e</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={moveToLastFolder}>
							Move to last folder
							<DropdownMenuShortcut>m</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => onMoveToFolder(item, null)}>
							Remove from folder
							<DropdownMenuShortcut>F</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={() => onPin(item, item.sidebarPinned !== true)}
						>
							{item.sidebarPinned ? "Unpin" : "Pin"}
							<DropdownMenuShortcut>p</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => onSidebarVisible(item, false)}>
							Move to overview
							<DropdownMenuShortcut>a/x</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => onCreate(item.provider)}>
							Create new {nativeAgentConversationLabel(item.provider)}
							<DropdownMenuShortcut>n</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Tooltip delayDuration={250}>
					<TooltipTrigger asChild>
						<button
							type="button"
							data-dashboard-sidebar-action="pin"
							aria-keyshortcuts="p"
							aria-label={
								item.sidebarPinned
									? `Unpin ${item.title} from native sidebar`
									: `Pin ${item.title} to native sidebar`
							}
							title={
								item.sidebarPinned
									? "Unpin from sidebar (p)"
									: "Pin to sidebar (p)"
							}
							onClick={() => onPin(item, item.sidebarPinned !== true)}
							className={cn(
								"flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-medium leading-none transition hover:bg-accent hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100",
								item.sidebarPinned
									? "border border-border/70 bg-background/70 text-foreground opacity-100"
									: "text-muted-foreground/70 opacity-60",
							)}
						>
							<LuPin
								className={cn("size-3", item.sidebarPinned && "fill-current")}
							/>
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">
						{item.sidebarPinned ? "Unpin from sidebar" : "Pin to sidebar"}
					</TooltipContent>
				</Tooltip>
				<button
					type="button"
					data-dashboard-sidebar-action="archive"
					aria-keyshortcuts="a x"
					aria-label={`Move ${item.title} to overview`}
					onClick={() => onSidebarVisible(item, false)}
					title="Move to overview (a or x)"
					className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-60 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
				>
					<LuArchive className="size-3" />
				</button>
			</div>
			<button
				type="button"
				data-dashboard-sidebar-action="create"
				tabIndex={-1}
				aria-keyshortcuts="n"
				aria-label={`Create ${nativeAgentProviderConfig(item.provider).title} session`}
				title="Create session (n)"
				onClick={(event) => {
					event.stopPropagation();
					onCreate(item.provider);
				}}
				className="sr-only"
			/>
			<button
				type="button"
				data-dashboard-sidebar-action="reply"
				tabIndex={-1}
				aria-keyshortcuts="r"
				aria-label={`Reply to ${item.title}`}
				title="Reply (r)"
				onClick={() => onSessionAction(item, "focus-composer")}
				className="sr-only"
			/>
			<button
				type="button"
				data-dashboard-sidebar-action="rename"
				tabIndex={-1}
				aria-keyshortcuts="e"
				aria-label={`Rename ${item.title}`}
				title="Rename session (e)"
				onClick={() => onSessionAction(item, "rename")}
				className="sr-only"
			/>
			<button
				type="button"
				data-dashboard-sidebar-action="open-browser"
				tabIndex={-1}
				aria-keyshortcuts="o"
				aria-label={`Open ${item.title} in browser mode`}
				title="Open browser version (o)"
				onClick={() => onSessionAction(item, "open-browser")}
				className="sr-only"
			/>
			<button
				type="button"
				data-dashboard-sidebar-action="toggle-browser"
				tabIndex={-1}
				aria-keyshortcuts="b"
				aria-label={`Toggle ${item.title} native and browser mode`}
				title="Toggle native/browser (b)"
				onClick={() => onSessionAction(item, "toggle-browser")}
				className="sr-only"
			/>
			<button
				type="button"
				data-dashboard-sidebar-action="move"
				tabIndex={-1}
				aria-keyshortcuts="m"
				aria-label={`Move ${item.title} to last native folder`}
				title="Move to last folder (m)"
				onClick={moveToLastFolder}
				className="sr-only"
			/>
			<button
				type="button"
				data-dashboard-sidebar-action="remove-from-folder"
				tabIndex={-1}
				aria-keyshortcuts="F"
				aria-label={`Move ${item.title} out of folder`}
				title="Remove from folder (F)"
				onClick={() => onMoveToFolder(item, null)}
				className="sr-only"
			/>
		</li>
	);
}

export function DashboardNativeAgentsSection({
	searchQuery = "",
	variant,
}: DashboardNativeAgentsSectionProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: session } = authClient.useSession();
	const utils = electronTrpc.useUtils();
	const hashPathname = useSyncExternalStore(
		subscribeDashboardHashPathname,
		getDashboardHashPathname,
		getDashboardHashPathname,
	);
	const activePathname = hashPathname ?? location.pathname;
	const activeRoute = activeNativeRoute(activePathname);
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
	const [recentFolderColors, setRecentFolderColors] = useState(() =>
		readRecentFolderColors(),
	);
	const [sessionFolders, setSessionFolders] = useState(() =>
		readSessionFolders(),
	);
	const [optimisticMetadata, setOptimisticMetadata] =
		useState<NativeAgentOptimisticMetadataMap>({});
	const [readState, setReadState] = useState(() => readNativeAgentReadState());
	const [notifiedState, setNotifiedState] = useState(() => readNotifiedState());
	const hasInitializedReplyNotificationsRef = useRef(false);
	const hasStartedCapyBackgroundSyncRef = useRef(false);
	const [lastFolderIds, setLastFolderIds] = useState(() => readLastFolderIds());
	const [createProvider, setCreateProvider] =
		useState<NativeAgentProvider | null>(null);
	const [editingFolder, setEditingFolder] = useState<NativeAgentFolder | null>(
		null,
	);
	const [deleteFolderTarget, setDeleteFolderTarget] =
		useState<NativeAgentFolder | null>(null);
	const [folderTitleDraft, setFolderTitleDraft] = useState("");

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleReadStateChange = () => {
			setReadState(readNativeAgentReadState());
		};
		window.addEventListener(
			NATIVE_AGENT_READ_STATE_CHANGE_EVENT,
			handleReadStateChange,
		);
		return () => {
			window.removeEventListener(
				NATIVE_AGENT_READ_STATE_CHANGE_EVENT,
				handleReadStateChange,
			);
		};
	}, []);

	useEffect(() => {
		setSessionFolders((current) => {
			const next = normalizeNativeAgentSessionFolders(current, folders);
			if (JSON.stringify(next) === JSON.stringify(current)) return current;
			writeSessionFolders(next);
			return next;
		});
	}, [folders]);

	const capyThreadsQuery = electronTrpc.nativeAgents.capy.listThreads.useQuery(
		{
			limit: 50,
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
	const capyFreshThreadsQuery =
		electronTrpc.nativeAgents.capy.listThreads.useQuery(
			{
				limit: 20,
				mineOnly: true,
				projectId: CAPY_MONOREPO_PROJECT_ID,
				userEmail: CAPY_LOCAL_USER_EMAIL,
			},
			{
				gcTime: NATIVE_AGENT_LIST_CACHE_MS,
				refetchInterval: 15_000,
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
	const syncCapyMine = electronTrpc.nativeAgents.capy.syncMine.useMutation();
	const scheduleNativeAgentListRefresh = useCallback(() => {
		void Promise.all([
			utils.nativeAgents.capy.listThreads.invalidate(),
			utils.nativeAgents.devin.listSessions.invalidate(),
		]);
	}, [utils]);

	const itemsByProvider = useMemo(() => {
		const capyFreshActiveThreads = selectNativeAgentProviderActiveRows(
			capyFreshThreadsQuery.data?.items ?? [],
			{
				getStatus: (thread) => thread.runState ?? thread.status,
				isLiveStatus: isNativeAgentLiveStatus,
			},
		);
		const capyItems: NativeAgentItem[] = mergeActiveNativeAgentRows(
			capyThreadsQuery.data?.items ?? [],
			capyFreshActiveThreads,
		).map((thread) => {
			const latestMessage = thread.latestMessage ?? thread.lastMessage ?? null;
			const optimistic = optimisticMetadata[`capy:${thread.id}`];
			const metadata = thread.nativeAgentMetadata;
			const sidebarState = resolveNativeAgentSidebarState({
				metadata,
				optimistic,
			});
			const status = thread.runState ?? thread.status ?? null;
			return {
				id: thread.id,
				isProviderActive:
					thread.isProviderActive || isNativeAgentLiveStatus(status),
				latestMessage: latestMessage
					? {
							body: latestMessage.content,
							createdAt: latestMessage.createdAt,
							role: latestMessage.role,
						}
					: null,
				provider: "capy" as const,
				sidebarHidden: sidebarState.sidebarHidden,
				sidebarPinned: sidebarState.sidebarPinned,
				status,
				subtitle:
					thread.tasks?.[0]?.identifier ??
					thread.pullRequests?.[0]?.repoFullName ??
					thread.projectId,
				title: nativeAgentDisplayTitle({
					fallbackTitle: "Untitled thread",
					metadata,
					optimistic,
					providerTitle: thread.title,
				}),
				titleOverride:
					optimistic?.titleOverride ?? metadata?.titleOverride ?? null,
				updatedAt:
					latestMessage?.createdAt ?? thread.updatedAt ?? thread.createdAt,
			};
		});
		const devinItems: NativeAgentItem[] = (
			devinSessionsQuery.data?.items ?? []
		).map((session) => {
			const optimistic = optimisticMetadata[`devin:${session.id}`];
			const metadata = session.nativeAgentMetadata;
			const sidebarState = resolveNativeAgentSidebarState({
				metadata,
				optimistic,
			});
			return {
				id: session.id,
				latestMessage: session.latestMessage ?? null,
				provider: "devin" as const,
				sidebarHidden: sidebarState.sidebarHidden,
				sidebarPinned: sidebarState.sidebarPinned,
				status: session.status,
				subtitle: session.pullRequestUrl ?? session.id,
				title: nativeAgentDisplayTitle({
					fallbackTitle: session.id,
					metadata,
					optimistic,
					providerTitle: session.title,
				}),
				titleOverride:
					optimistic?.titleOverride ?? metadata?.titleOverride ?? null,
				updatedAt: session.updatedAt ?? session.createdAt,
			};
		});
		return {
			capy: capyItems,
			devin: devinItems,
		};
	}, [
		capyFreshThreadsQuery.data?.items,
		capyThreadsQuery.data?.items,
		devinSessionsQuery.data?.items,
		optimisticMetadata,
	]);

	const setProviderCollapsed = useCallback(
		(provider: NativeAgentProvider, isCollapsed: boolean) => {
			setCollapsedProviderIds((current) => {
				const next = new Set(current);
				if (isCollapsed) next.add(provider);
				else next.delete(provider);
				writeJson(COLLAPSED_STORAGE_KEY, [...next]);
				return next;
			});
		},
		[],
	);

	const createFolder = useCallback(
		(provider: NativeAgentProvider) => {
			const now = Date.now();
			const providerFolderCount = folders.filter(
				(folder) => folder.provider === provider,
			).length;
			const nextFolder = createNativeAgentFolder({
				color:
					FOLDER_COLORS[providerFolderCount % FOLDER_COLORS.length] ??
					FOLDER_COLORS[0],
				id: makeFolderId(provider),
				now,
				provider,
				title: "Folder",
			});
			setFolders((current) => {
				const next = [...current, nextFolder];
				writeFolders(next);
				return next;
			});
			setLastFolderIds((current) => {
				const next = rememberNativeAgentLastFolderId(current, {
					folderId: nextFolder.id,
					provider,
				});
				writeLastFolderIds(next);
				return next;
			});
			setProviderCollapsed(provider, false);
		},
		[folders, setProviderCollapsed],
	);

	const moveToFolder = useCallback(
		(item: NativeAgentItem, folderId: string | null) => {
			setSessionFolders((current) => {
				const next = moveNativeAgentSessionToFolder(current, {
					folderId,
					provider: item.provider,
					sessionId: item.id,
				});
				writeSessionFolders(next);
				return next;
			});
			if (folderId) {
				setProviderCollapsed(item.provider, false);
				setFolders((current) => {
					const next = setNativeAgentFolderCollapsed(current, {
						folderId,
						isCollapsed: false,
						now: Date.now(),
					});
					writeFolders(next);
					return next;
				});
				setLastFolderIds((current) => {
					const next = rememberNativeAgentLastFolderId(current, {
						folderId,
						provider: item.provider,
					});
					writeLastFolderIds(next);
					return next;
				});
			}
		},
		[setProviderCollapsed],
	);

	const navigateToNativeProvider = useCallback(
		(provider: NativeAgentProvider) => {
			if (provider === "capy") {
				navigate({ to: "/native/capy" });
			} else {
				navigate({ to: "/native/devin" });
			}
		},
		[navigate],
	);

	const navigateToNativeSession = useCallback(
		(item: { id: string; provider: NativeAgentProvider }) => {
			if (item.provider === "capy") {
				navigate({
					to: "/native/capy/$threadId",
					params: { threadId: item.id },
				});
			} else {
				navigate({
					to: "/native/devin/$sessionId",
					params: { sessionId: item.id },
				});
			}
		},
		[navigate],
	);

	const moveDraggedSessionToFolder = useCallback(
		(event: DragEvent, items: NativeAgentItem[], folderId: string | null) => {
			event.preventDefault();
			const parsed = parseNativeAgentSessionDragPayload(
				event.dataTransfer.getData(NATIVE_AGENT_SESSION_DRAG_MIME),
			);
			if (!parsed) return;
			const item = items.find(
				(candidate) =>
					candidate.id === parsed.id && candidate.provider === parsed.provider,
			);
			if (item) moveToFolder(item, folderId);
		},
		[moveToFolder],
	);

	const deleteFolder = (folder: NativeAgentFolder) => {
		let nextFolders: NativeAgentFolder[] | null = null;
		setSessionFolders((current) => {
			const next = deleteNativeAgentFolder(folders, current, folder.id);
			nextFolders = next.folders;
			writeSessionFolders(next.sessionFolders);
			return next.sessionFolders;
		});
		if (nextFolders) {
			setFolders(nextFolders);
			writeFolders(nextFolders);
		}
		setLastFolderIds((current) => {
			const next = forgetNativeAgentLastFolderId(current, folder);
			writeLastFolderIds(next);
			return next;
		});
	};

	const renameFolder = (folderId: string, title: string) => {
		setFolders((current) => {
			const next = renameNativeAgentFolder(current, {
				folderId,
				now: Date.now(),
				title,
			});
			writeFolders(next);
			return next;
		});
	};

	const setFolderColor = useCallback((folderId: string, color: string) => {
		setFolders((current) => {
			const next = setNativeAgentFolderColor(current, {
				color,
				folderId,
				now: Date.now(),
			});
			writeFolders(next);
			return next;
		});
		setRecentFolderColors((current) => {
			const next = rememberNativeAgentRecentFolderColor(current, color);
			writeRecentFolderColors(next);
			return next;
		});
	}, []);

	const openFolderEditor = useCallback((folder: NativeAgentFolder) => {
		setLastFolderIds((current) => {
			const next = rememberNativeAgentLastFolderId(current, {
				folderId: folder.id,
				provider: folder.provider,
			});
			writeLastFolderIds(next);
			return next;
		});
		setEditingFolder(folder);
		setFolderTitleDraft(folder.title);
	}, []);

	const rememberFolder = useCallback((folder: NativeAgentFolder) => {
		setLastFolderIds((current) => {
			const next = rememberNativeAgentLastFolderId(current, {
				folderId: folder.id,
				provider: folder.provider,
			});
			writeLastFolderIds(next);
			return next;
		});
	}, []);

	const toggleFolder = useCallback((folderId: string) => {
		setFolders((current) => {
			const next = toggleNativeAgentFolderCollapsed(current, {
				folderId,
				now: Date.now(),
			});
			writeFolders(next);
			return next;
		});
	}, []);

	const setFolderCollapsed = useCallback(
		(folderId: string, isCollapsed: boolean) => {
			setFolders((current) => {
				const next = setNativeAgentFolderCollapsed(current, {
					folderId,
					isCollapsed,
					now: Date.now(),
				});
				writeFolders(next);
				return next;
			});
		},
		[],
	);
	const recentFolderColorChoices = useMemo(() => {
		const colors = normalizeNativeAgentRecentFolderColors([
			editingFolder?.color,
			...recentFolderColors,
		]);
		const defaultColors = new Set(FOLDER_COLORS);
		return colors.filter((color) => !defaultColors.has(color));
	}, [editingFolder?.color, recentFolderColors]);

	const handleOpen = useCallback(
		(item: NativeAgentItem) => {
			const latestTime = latestAgentMessageTime(item);
			if (latestTime != null) {
				setReadState((current) => {
					const next = {
						...current,
						[nativeAgentSessionFolderKey(item.provider, item.id)]: latestTime,
					};
					writeNativeAgentReadState(next);
					return next;
				});
			}
			navigateToNativeSession(item);
		},
		[navigateToNativeSession],
	);

	const handleSessionAction = useCallback(
		(item: NativeAgentItem, action: NativeAgentSidebarSessionAction) => {
			handleOpen(item);
			for (const delay of [0, 150, 500]) {
				window.setTimeout(
					() => dispatchNativeAgentCurrentAction(action, item.provider),
					delay,
				);
			}
		},
		[handleOpen],
	);

	const handlePin = useCallback(
		async (item: NativeAgentItem, pinned: boolean) => {
			setOptimisticMetadata((current) =>
				applyNativeAgentOptimisticPinned(current, {
					id: item.id,
					pinned,
					provider: item.provider,
				}),
			);
			try {
				await setPinned.mutateAsync({
					id: item.id,
					pinned,
					provider: item.provider,
					title: item.title,
				});
				scheduleNativeAgentListRefresh();
				toast.success(pinned ? "Pinned to sidebar" : "Removed from sidebar");
			} catch (error) {
				setOptimisticMetadata((current) =>
					restoreNativeAgentOptimisticSidebarState(current, {
						id: item.id,
						provider: item.provider,
						sidebarHidden: item.sidebarHidden,
						sidebarPinned: item.sidebarPinned,
					}),
				);
				toast.error(error instanceof Error ? error.message : String(error));
			}
		},
		[scheduleNativeAgentListRefresh, setPinned],
	);

	const handleSidebarVisible = useCallback(
		async (item: NativeAgentItem, visible: boolean) => {
			setOptimisticMetadata((current) =>
				applyNativeAgentOptimisticSidebarVisible(current, {
					id: item.id,
					provider: item.provider,
					visible,
				}),
			);
			try {
				await setSidebarVisible.mutateAsync({
					id: item.id,
					provider: item.provider,
					title: item.title,
					visible,
				});
				scheduleNativeAgentListRefresh();
				toast.success(visible ? "Shown in sidebar" : "Moved to overview");
			} catch (error) {
				setOptimisticMetadata((current) =>
					restoreNativeAgentOptimisticSidebarState(current, {
						id: item.id,
						provider: item.provider,
						sidebarHidden: item.sidebarHidden,
						sidebarPinned: item.sidebarPinned,
					}),
				);
				toast.error(error instanceof Error ? error.message : String(error));
			}
		},
		[scheduleNativeAgentListRefresh, setSidebarVisible],
	);

	const handleCreated = async (item: {
		id: string;
		provider: NativeAgentProvider;
	}) => {
		navigateToNativeSession(item);
		void Promise.all([
			utils.nativeAgents.capy.listThreads.invalidate(),
			utils.nativeAgents.devin.listSessions.invalidate(),
		]);
	};

	const openProvider = (provider: NativeAgentProvider) => {
		navigateToNativeProvider(provider);
	};

	const isNativeSidebarSearchActive = searchQuery.trim().length > 0;
	const displayedItemsForProvider = (items: NativeAgentItem[]) => {
		return selectNativeAgentSidebarItems(items, {
			activeId: activeRoute.id,
			isLiveStatus: isNativeAgentLiveStatus,
			isUnread: (item) => hasUnreadAgentResponse(item, readState),
			searchQuery,
		});
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
			const key = nativeAgentSessionFolderKey(item.provider, item.id);
			if ((current[key] ?? 0) >= latestTime) return current;
			const next = { ...current, [key]: latestTime };
			writeNativeAgentReadState(next);
			return next;
		});
	}, [activeRoute.id, activeRoute.provider, itemsByProvider]);

	useEffect(() => {
		if (credentialStatus.data?.capy.configured !== true) return;
		if (hasStartedCapyBackgroundSyncRef.current) return;
		const lastSync = readJson<number>(CAPY_BACKGROUND_SYNC_STORAGE_KEY, 0);
		if (Date.now() - lastSync < CAPY_BACKGROUND_SYNC_INTERVAL_MS) return;
		hasStartedCapyBackgroundSyncRef.current = true;
		writeJson(CAPY_BACKGROUND_SYNC_STORAGE_KEY, Date.now());
		syncCapyMine.mutate(
			{
				limit: 50,
				projectId: CAPY_MONOREPO_PROJECT_ID,
				scanPageLimit: CAPY_BACKGROUND_SYNC_SCAN_PAGE_LIMIT,
				userEmail: CAPY_LOCAL_USER_EMAIL,
			},
			{
				onSuccess: (result) => {
					if (result.discovered > 0) {
						void utils.nativeAgents.capy.listThreads.invalidate();
					}
				},
			},
		);
	}, [
		credentialStatus.data?.capy.configured,
		syncCapyMine,
		utils.nativeAgents.capy.listThreads,
	]);

	useEffect(() => {
		const capyHasLoaded = capyThreadsQuery.data != null;
		const devinHasLoaded = devinSessionsQuery.data != null;
		if (!capyHasLoaded && !devinHasLoaded) return;

		const notifications = getUnreadNativeAgentReplyNotifications({
			activeIdByProvider: {
				capy: activeRoute.provider === "capy" ? activeRoute.id : null,
				devin: activeRoute.provider === "devin" ? activeRoute.id : null,
			},
			itemsByProvider,
			notifiedState,
			readState,
		});

		if (!hasInitializedReplyNotificationsRef.current) {
			hasInitializedReplyNotificationsRef.current = true;
			if (notifications.length === 0) return;
			setNotifiedState((current) => {
				const next = { ...current };
				for (const notification of notifications) {
					next[notification.key] = Math.max(
						next[notification.key] ?? 0,
						notification.latestTime,
					);
				}
				writeNotifiedState(next);
				return next;
			});
			return;
		}

		if (notifications.length === 0) return;
		setNotifiedState((current) => {
			const next = { ...current };
			for (const notification of notifications) {
				next[notification.key] = Math.max(
					next[notification.key] ?? 0,
					notification.latestTime,
				);
				writeLatestNativeAgentReplyNotification(notification);
				toast.message(
					`${nativeAgentProviderConfig(notification.provider).title} replied`,
					{
						action: {
							label: "Open",
							onClick: () => navigateToNativeSession(notification),
						},
						description: `${notification.title}: ${notification.preview}`,
						id: `native-agent-reply:${notification.key}:${notification.latestTime}`,
					},
				);
			}
			writeNotifiedState(next);
			return next;
		});
	}, [
		activeRoute.id,
		activeRoute.provider,
		capyThreadsQuery.data,
		devinSessionsQuery.data,
		itemsByProvider,
		navigateToNativeSession,
		notifiedState,
		readState,
	]);

	useEffect(() => {
		const handleOpenUnreadNativeReply = (event: Event) => {
			const unreadItem = getLatestUnreadNativeAgentReplyItem({
				itemsByProvider,
				readState,
			});
			if (!unreadItem) {
				toast.message("No unread Capy or Devin replies");
				return;
			}
			event.preventDefault();
			handleOpen(unreadItem);
		};

		window.addEventListener(
			DASHBOARD_OPEN_UNREAD_NATIVE_REPLY_EVENT,
			handleOpenUnreadNativeReply,
		);
		return () => {
			window.removeEventListener(
				DASHBOARD_OPEN_UNREAD_NATIVE_REPLY_EVENT,
				handleOpenUnreadNativeReply,
			);
		};
	}, [handleOpen, itemsByProvider, readState]);

	const markLatestUnreadNativeReplyRead = useCallback((): boolean => {
		const unreadItem = getLatestUnreadNativeAgentReplyItem({
			itemsByProvider,
			readState,
		});
		const latestMessage = unreadItem?.latestMessage;
		if (!unreadItem || !latestMessage) {
			toast.message("No unread Capy or Devin replies");
			return false;
		}

		const latestTime = nativeAgentTimestampMs(latestMessage.createdAt);
		if (latestTime == null) {
			toast.message("No unread Capy or Devin replies");
			return false;
		}

		markNativeAgentReplyNotificationRead({
			key: nativeAgentNotificationKey(unreadItem.provider, unreadItem.id),
			latestTime,
		});
		toast.message(
			`Marked ${nativeAgentProviderConfig(unreadItem.provider).title} reply read`,
			{ description: unreadItem.title },
		);
		return true;
	}, [itemsByProvider, readState]);

	useEffect(() => {
		const handleMarkLatestNativeReplyRead = (event: Event) => {
			if (!markLatestUnreadNativeReplyRead()) return;
			event.preventDefault();
		};

		window.addEventListener(
			DASHBOARD_MARK_LATEST_NATIVE_REPLY_READ_EVENT,
			handleMarkLatestNativeReplyRead,
		);
		return () => {
			window.removeEventListener(
				DASHBOARD_MARK_LATEST_NATIVE_REPLY_READ_EVENT,
				handleMarkLatestNativeReplyRead,
			);
		};
	}, [markLatestUnreadNativeReplyRead]);

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
		const folderForProvider = (
			provider: NativeAgentProvider,
		): NativeAgentFolder | null => {
			const persistedFolders = readFolders();
			const folderById = new Map<string, NativeAgentFolder>();
			for (const folder of [...persistedFolders, ...folders]) {
				folderById.set(folder.id, folder);
			}
			const providerFolders = [...folderById.values()].filter(
				(folder) => folder.provider === provider,
			);
			const persistedLastFolderIds = readLastFolderIds();
			const lastFolderId =
				lastFolderIds[provider] ?? persistedLastFolderIds[provider];
			return (
				providerFolders.find((folder) => folder.id === lastFolderId) ??
				providerFolders[0] ??
				null
			);
		};

		const handleFolderAction = (event: Event) => {
			const detail = (
				event as CustomEvent<{
					action?: NativeAgentFolderCommandAction;
					color?: string;
					folderId?: string;
					provider?: NativeAgentProvider;
					sessionId?: string;
				}>
			).detail;
			const provider = detail?.provider ?? activeRoute.provider;
			if (provider !== "capy" && provider !== "devin") return;
			const action = detail?.action;
			if (action === "create") {
				createFolder(provider);
				return;
			}
			if (action === "remove-active") {
				const sessionId = detail?.sessionId ?? activeRoute.id;
				if (!sessionId) return;
				const item = itemsByProvider[provider].find(
					(candidate) => candidate.id === sessionId,
				);
				if (item) moveToFolder(item, null);
				return;
			}
			const folder =
				(detail?.folderId
					? folders.find(
							(candidate) =>
								candidate.id === detail.folderId &&
								candidate.provider === provider,
						)
					: null) ?? folderForProvider(provider);
			if (!folder) {
				toast.error(
					`Create a ${nativeAgentProviderConfig(provider).title} folder first`,
				);
				return;
			}
			if (action === "rename") {
				openFolderEditor(folder);
				return;
			}
			if (action === "delete") {
				setDeleteFolderTarget(folder);
				return;
			}
			if (action === "color") {
				if (detail?.color) {
					setFolderColor(folder.id, detail.color);
					return;
				}
				const currentIndex = FOLDER_COLORS.indexOf(folder.color);
				setFolderColor(
					folder.id,
					FOLDER_COLORS[(currentIndex + 1) % FOLDER_COLORS.length] ??
						FOLDER_COLORS[0],
				);
				return;
			}
			if (action === "move-active") {
				const sessionId = detail?.sessionId ?? activeRoute.id;
				if (!sessionId) return;
				const item = itemsByProvider[provider].find(
					(candidate) => candidate.id === sessionId,
				);
				if (item) moveToFolder(item, folder.id);
				return;
			}
		};

		window.addEventListener(
			"dashboard-native-agent-folder-action",
			handleFolderAction,
		);
		return () => {
			window.removeEventListener(
				"dashboard-native-agent-folder-action",
				handleFolderAction,
			);
		};
	}, [
		activeRoute.id,
		activeRoute.provider,
		createFolder,
		folders,
		itemsByProvider,
		lastFolderIds,
		moveToFolder,
		openFolderEditor,
		setFolderColor,
	]);

	useEffect(() => {
		const isEditableTarget = (target: EventTarget | null) =>
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			(target instanceof HTMLElement && target.isContentEditable);

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			const vimKey = shouldHandleDashboardVimKey(event)
				? dashboardVimKey(event)
				: null;
			if (
				event.key !== "ArrowDown" &&
				event.key !== "ArrowUp" &&
				vimKey !== " " &&
				vimKey !== "G" &&
				vimKey !== "g" &&
				vimKey !== "h" &&
				vimKey !== "i" &&
				vimKey !== "j" &&
				vimKey !== "k" &&
				vimKey !== "l" &&
				vimKey !== "a" &&
				vimKey !== "c" &&
				vimKey !== "d" &&
				vimKey !== "e" &&
				vimKey !== "enter" &&
				vimKey !== "f" &&
				vimKey !== "m" &&
				vimKey !== "n" &&
				vimKey !== "N" &&
				vimKey !== "o" &&
				vimKey !== "p" &&
				vimKey !== "u" &&
				vimKey !== "U" &&
				vimKey !== "x" &&
				vimKey !== "F"
			) {
				return;
			}
			if (!activeRoute.provider || isEditableTarget(event.target)) return;
			if (
				document.activeElement instanceof HTMLElement &&
				document.activeElement.closest("[data-native-agent-overview-card-id]")
			) {
				return;
			}

			const rows = Array.from(
				document.querySelectorAll<HTMLButtonElement>(
					"[data-native-agent-session-row-id], [data-native-agent-folder-row-id]",
				),
			);
			if (rows.length === 0) return;

			const focusedIndex =
				document.activeElement instanceof HTMLButtonElement
					? rows.indexOf(document.activeElement)
					: -1;
			if (focusedIndex < 0) return;
			const currentIndex = focusedIndex;
			const currentRow = rows[currentIndex];
			const rowProvider =
				currentRow?.dataset.nativeAgentSessionRowProvider === "capy" ||
				currentRow?.dataset.nativeAgentSessionRowProvider === "devin"
					? currentRow.dataset.nativeAgentSessionRowProvider
					: currentRow?.dataset.nativeAgentFolderRowProvider === "capy" ||
							currentRow?.dataset.nativeAgentFolderRowProvider === "devin"
						? currentRow.dataset.nativeAgentFolderRowProvider
						: activeRoute.provider;
			const rowFolder = currentRow?.dataset.nativeAgentFolderRowId
				? folders.find(
						(folder) =>
							folder.id === currentRow.dataset.nativeAgentFolderRowId &&
							folder.provider === rowProvider,
					)
				: null;
			const rowItem = currentRow
				? itemsByProvider[rowProvider].find(
						(item) => item.id === currentRow.dataset.nativeAgentSessionRowId,
					)
				: null;
			const createAction = nativeAgentCreateVimActionFromKey(vimKey);
			if (createAction === "create-session") {
				event.preventDefault();
				event.stopPropagation();
				setCreateProvider(rowProvider);
				return;
			}
			if (createAction === "create-folder") {
				event.preventDefault();
				event.stopPropagation();
				createFolder(rowProvider);
				return;
			}
			const unreadAction = nativeAgentUnreadVimActionFromKey(vimKey);
			if (unreadAction === "mark-latest-read") {
				const latestReply = readLatestNativeAgentReplyNotification();
				if (!latestReply) return;
				event.preventDefault();
				event.stopPropagation();
				markNativeAgentReplyNotificationRead(latestReply);
				return;
			}
			if (unreadAction === "open-unread") {
				const unreadItem = itemsByProvider[rowProvider].find((item) =>
					hasUnreadAgentResponse(item, readState),
				);
				if (!unreadItem) return;
				event.preventDefault();
				event.stopPropagation();
				navigateToNativeSession(unreadItem);
				return;
			}
			const folderAction = rowFolder
				? nativeAgentFolderVimActionFromKey(vimKey)
				: "none";
			if (rowFolder && folderAction !== "none") {
				event.preventDefault();
				event.stopPropagation();
				rememberFolder(rowFolder);
				if (folderAction === "toggle") {
					toggleFolder(rowFolder.id);
					return;
				}
				if (folderAction === "collapse" || folderAction === "expand") {
					setFolderCollapsed(rowFolder.id, folderAction === "collapse");
					currentRow?.focus();
					return;
				}
				if (folderAction === "rename") {
					openFolderEditor(rowFolder);
					return;
				}
				if (folderAction === "color") {
					const currentIndex = FOLDER_COLORS.indexOf(rowFolder.color);
					setFolderColor(
						rowFolder.id,
						FOLDER_COLORS[(currentIndex + 1) % FOLDER_COLORS.length] ??
							FOLDER_COLORS[0],
					);
					currentRow?.focus();
					return;
				}
				if (folderAction === "move-active") {
					const activeItem =
						activeRoute.provider === rowFolder.provider && activeRoute.id
							? itemsByProvider[rowFolder.provider].find(
									(item) => item.id === activeRoute.id,
								)
							: null;
					if (activeItem) {
						moveToFolder(activeItem, rowFolder.id);
						currentRow?.focus();
					}
					return;
				}
				setDeleteFolderTarget(rowFolder);
				return;
			}
			const sidebarAction = nativeAgentSidebarVimActionFromKey(vimKey);
			if (sidebarAction !== "none") {
				const row = rows[currentIndex];
				if (!row) return;
				event.preventDefault();
				event.stopPropagation();
				if (rowFolder) return;
				if (sidebarAction === "open") {
					row.click();
					return;
				}
				if (sidebarAction === "show-action-hints") {
					handleDashboardGlobalKeyboardAction("SHOW_DASHBOARD_ACTION_HINTS");
					return;
				}
				if (!rowItem) return;
				if (sidebarAction === "focus-composer") {
					handleSessionAction(rowItem, "focus-composer");
					return;
				}
				if (sidebarAction === "open-browser") {
					handleSessionAction(rowItem, "open-browser");
					return;
				}
				if (sidebarAction === "toggle-browser") {
					handleSessionAction(rowItem, "toggle-browser");
					return;
				}
				if (sidebarAction === "rename") {
					handleSessionAction(rowItem, "rename");
					return;
				}
				if (sidebarAction === "pin") {
					void handlePin(rowItem, rowItem.sidebarPinned !== true);
					return;
				}
				if (sidebarAction === "archive") {
					void handleSidebarVisible(rowItem, false);
					return;
				}
				if (sidebarAction === "remove-from-folder") {
					moveToFolder(rowItem, null);
					return;
				}
				window.dispatchEvent(
					new CustomEvent("dashboard-native-agent-folder-action", {
						detail: {
							action: "move-active",
							provider: rowItem.provider,
							sessionId: rowItem.id,
						},
					}),
				);
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, [
		activeRoute.id,
		activeRoute.provider,
		createFolder,
		folders,
		handlePin,
		handleSessionAction,
		handleSidebarVisible,
		itemsByProvider,
		moveToFolder,
		navigateToNativeSession,
		openFolderEditor,
		readState,
		rememberFolder,
		setFolderCollapsed,
		toggleFolder,
		setFolderColor,
	]);

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
				const displayedItemCount = displayedItems.length;
				const isCollapsed =
					!isNativeSidebarSearchActive &&
					collapsedProviderIds.has(providerConfig.id);
				const providerFolders = folders.filter(
					(folder) => folder.provider === providerConfig.id,
				);
				const unfolderedItems = displayedItems.filter(
					(item) =>
						!sessionFolders[
							nativeAgentSessionFolderKey(item.provider, item.id)
						],
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
									data-dashboard-native-provider-trigger={providerConfig.id}
									data-dashboard-sidebar-typeahead-label={providerConfig.title}
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
						<div
							data-dashboard-sidebar-action-scope
							className="flex items-center gap-1"
						>
							<button
								type="button"
								data-dashboard-sidebar-active={isActive ? "true" : undefined}
								data-dashboard-native-provider-trigger={providerConfig.id}
								data-dashboard-sidebar-typeahead-label={providerConfig.title}
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
									className="size-4 shrink-0"
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
										title={`${displayedItemCount} shown in sidebar, ${items.length} total`}
										onClick={() =>
											setProviderCollapsed(providerConfig.id, !isCollapsed)
										}
										onKeyDown={(event) => {
											if (!isDashboardSidebarSpaceKey(event.key)) return;
											event.preventDefault();
											setProviderCollapsed(providerConfig.id, !isCollapsed);
										}}
										className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/60 px-1 font-mono text-[10px] tabular-nums text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
									>
										{displayedItemCount}
									</button>
								</TooltipTrigger>
								<TooltipContent side="right">
									{isCollapsed
										? `Show ${displayedItemCount} sidebar ${nativeAgentConversationLabel(providerConfig.id, { plural: true })}`
										: `Hide ${displayedItemCount} sidebar ${nativeAgentConversationLabel(providerConfig.id, { plural: true })}`}
								</TooltipContent>
							</Tooltip>
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<button
										type="button"
										data-dashboard-sidebar-action="create"
										aria-keyshortcuts="n"
										aria-label={`New ${providerConfig.title}`}
										title={`New ${nativeAgentConversationLabel(providerConfig.id)} (n)`}
										onClick={() => setCreateProvider(providerConfig.id)}
										className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
									>
										<LuPlus className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="right">
									New {nativeAgentConversationLabel(providerConfig.id)} (n)
								</TooltipContent>
							</Tooltip>
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<button
										type="button"
										data-dashboard-sidebar-action="create-folder"
										aria-keyshortcuts="N"
										aria-label={`New ${providerConfig.title} folder`}
										title="New folder (N)"
										onClick={() => createFolder(providerConfig.id)}
										className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
									>
										<LuFolderPlus className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="right">New folder (N)</TooltipContent>
							</Tooltip>
						</div>

						{!isCollapsed && (
							<fieldset
								className="ml-1.5 flex min-w-0 max-w-full flex-col gap-1.5 overflow-visible border-l border-border/50 pl-1.5"
								onDragOver={(event) => event.preventDefault()}
								onDrop={(event) =>
									moveDraggedSessionToFolder(event, items, null)
								}
							>
								{providerFolders.map((folder) => {
									const folderItems = items
										.filter(
											(item) =>
												sessionFolders[
													nativeAgentSessionFolderKey(item.provider, item.id)
												] === folder.id,
										)
										.sort((a, b) => {
											const aActive =
												a.isProviderActive || isNativeAgentLiveStatus(a.status);
											const bActive =
												b.isProviderActive || isNativeAgentLiveStatus(b.status);
											if (aActive !== bActive) return aActive ? -1 : 1;
											return (
												(nativeAgentTimestampMs(b.updatedAt) ?? 0) -
												(nativeAgentTimestampMs(a.updatedAt) ?? 0)
											);
										});
									const folderHasUnread = folderItems.some((item) =>
										hasUnreadAgentResponse(item, readState),
									);
									const cycleFolderColor = () => {
										const currentIndex = FOLDER_COLORS.indexOf(folder.color);
										setFolderColor(
											folder.id,
											FOLDER_COLORS[
												(currentIndex + 1) % FOLDER_COLORS.length
											] ?? FOLDER_COLORS[0],
										);
									};
									return (
										<div
											key={folder.id}
											className={cn(
												"flex min-w-0 max-w-full flex-col gap-1 overflow-visible rounded-md",
												folderItems.length > 0 && "pb-0.5",
											)}
										>
											<fieldset
												data-dashboard-sidebar-action-scope
												onDragOver={(event) => event.preventDefault()}
												onDrop={(event) => {
													event.stopPropagation();
													moveDraggedSessionToFolder(event, items, folder.id);
												}}
												className={cn(
													"group/folder relative flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md border px-1.5 text-xs font-medium transition-colors",
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
													data-dashboard-sidebar-typeahead-label={`${nativeAgentProviderConfig(folder.provider).title} folder ${folder.title}`}
													data-native-agent-folder-row-id={folder.id}
													data-native-agent-folder-row-provider={
														folder.provider
													}
													aria-expanded={!folder.isCollapsed}
													onClick={() => toggleFolder(folder.id)}
													onDoubleClick={(event) => {
														event.preventDefault();
														event.stopPropagation();
														openFolderEditor(folder);
													}}
													onFocus={() => rememberFolder(folder)}
													className="min-w-0 flex-1 truncate rounded-sm text-left font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring"
												>
													{folder.title}
												</button>
												<span
													className="min-w-4 shrink-0 rounded-sm bg-muted-foreground/10 px-1 text-center font-mono text-[10px] tabular-nums"
													title={`${folderItems.length} ${nativeAgentConversationLabel(providerConfig.id, { plural: true })}`}
												>
													{folderItems.length}
												</span>
												<span className="pointer-events-none absolute right-1 flex items-center rounded-md bg-background/90 opacity-0 shadow-sm transition group-hover/folder:pointer-events-auto group-hover/folder:opacity-100 group-focus-within/folder:pointer-events-auto group-focus-within/folder:opacity-100">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<button
																type="button"
																data-dashboard-sidebar-action="menu"
																aria-keyshortcuts="."
																aria-label={`Show actions for ${folder.title}`}
																title="Show folder actions (.)"
																onClick={(event) => event.stopPropagation()}
																className="flex size-5 items-center justify-center rounded transition hover:bg-accent"
															>
																<LuEllipsis className="size-3 shrink-0" />
															</button>
														</DropdownMenuTrigger>
														<DropdownMenuContent
															side="right"
															align="start"
															className="w-56"
														>
															<DropdownMenuItem
																onSelect={() => toggleFolder(folder.id)}
															>
																{folder.isCollapsed ? "Expand" : "Collapse"}
																<DropdownMenuShortcut>
																	{folder.isCollapsed ? "l" : "h"}
																</DropdownMenuShortcut>
															</DropdownMenuItem>
															<DropdownMenuItem
																onSelect={() => openFolderEditor(folder)}
															>
																Rename
																<DropdownMenuShortcut>e</DropdownMenuShortcut>
															</DropdownMenuItem>
															<DropdownMenuItem onSelect={cycleFolderColor}>
																Cycle color
																<DropdownMenuShortcut>c</DropdownMenuShortcut>
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onSelect={() =>
																	setCreateProvider(providerConfig.id)
																}
															>
																Create new{" "}
																{nativeAgentConversationLabel(
																	providerConfig.id,
																)}
																<DropdownMenuShortcut>n</DropdownMenuShortcut>
															</DropdownMenuItem>
															<DropdownMenuItem
																onSelect={() => createFolder(providerConfig.id)}
															>
																Create folder
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																variant="destructive"
																onSelect={() => setDeleteFolderTarget(folder)}
															>
																Delete folder
																<DropdownMenuShortcut>d</DropdownMenuShortcut>
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
													<button
														type="button"
														data-dashboard-sidebar-action="create"
														tabIndex={-1}
														aria-keyshortcuts="n"
														aria-label={`New ${providerConfig.title} ${nativeAgentConversationLabel(providerConfig.id)}`}
														title="Create session (n)"
														onClick={(event) => {
															event.stopPropagation();
															setCreateProvider(providerConfig.id);
														}}
														className="sr-only"
													/>
													<button
														type="button"
														data-dashboard-sidebar-action="rename"
														aria-keyshortcuts="e"
														aria-label={`Rename ${folder.title}`}
														title="Rename folder (e)"
														onClick={(event) => {
															event.stopPropagation();
															openFolderEditor(folder);
														}}
														className="flex size-5 items-center justify-center rounded transition hover:bg-accent"
													>
														<LuPencil className="size-3 shrink-0" />
													</button>
													<button
														type="button"
														data-dashboard-sidebar-action="color"
														aria-keyshortcuts="c"
														aria-label={`Change ${folder.title} color`}
														title="Cycle folder color (c)"
														onClick={(event) => {
															event.stopPropagation();
															cycleFolderColor();
														}}
														className="flex size-5 items-center justify-center rounded transition hover:bg-accent"
													>
														<LuPalette className="size-3 shrink-0" />
													</button>
													<button
														type="button"
														data-dashboard-sidebar-action="delete"
														aria-keyshortcuts="d"
														aria-label={`Delete ${folder.title}`}
														title="Delete folder (d)"
														onClick={(event) => {
															event.stopPropagation();
															setDeleteFolderTarget(folder);
														}}
														className="flex size-5 items-center justify-center rounded transition hover:bg-accent hover:text-red-300"
													>
														<LuFolderX className="size-3 shrink-0" />
													</button>
												</span>
											</fieldset>
											{(!folder.isCollapsed || isNativeSidebarSearchActive) &&
												folderItems.length > 0 && (
													<ul
														className="ml-2 flex min-w-0 max-w-full flex-col gap-1 overflow-visible border-l py-0.5 pl-1.5"
														style={{ borderColor: `${folder.color}66` }}
													>
														{folderItems.map((item) => (
															<SessionRow
																key={item.id}
																activeId={activeRoute.id}
																item={item}
																onCreate={setCreateProvider}
																onMoveToFolder={moveToFolder}
																onOpen={handleOpen}
																onPin={handlePin}
																onSessionAction={handleSessionAction}
																onSidebarVisible={handleSidebarVisible}
																readState={readState}
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
										onCreate={setCreateProvider}
										onMoveToFolder={moveToFolder}
										onOpen={handleOpen}
										onPin={handlePin}
										onSessionAction={handleSessionAction}
										onSidebarVisible={handleSidebarVisible}
										readState={readState}
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
							</fieldset>
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
						{recentFolderColorChoices.length > 0 && (
							<div className="flex flex-col gap-2">
								<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
									Recent custom
								</div>
								<div className="grid grid-cols-6 gap-2">
									{recentFolderColorChoices.map((color) => (
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
							</div>
						)}
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
