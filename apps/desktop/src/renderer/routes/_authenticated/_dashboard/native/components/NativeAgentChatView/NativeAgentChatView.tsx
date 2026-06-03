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
import { useNavigate } from "@tanstack/react-router";
import type {
	ComponentProps,
	CSSProperties,
	KeyboardEvent as ReactKeyboardEvent,
	ReactNode,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	LuChevronDown,
	LuColumns2,
	LuExternalLink,
	LuFileText,
	LuGitPullRequest,
	LuGlobe,
	LuImage,
	LuInfo,
	LuKeyRound,
	LuMessageSquare,
	LuPin,
	LuRefreshCw,
	LuSend,
} from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { CommentCodeBlock } from "renderer/components/CommentMarkdown/components/CommentCodeBlock";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { DashboardWebView } from "renderer/routes/_authenticated/_dashboard/components/DashboardWebView";
import {
	formatNativeAgentDiagnosticsQuery,
	formatNativeAgentDiagnosticsQueryGroup,
	nativeAgentMineEvidenceSummary,
	nativeAgentMinePolicySummary,
	nativeAgentSidebarFlagSummary,
	summarizeNativeAgentDiagnosticsFreshness,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-diagnostics";
import {
	createNativeAgentSessionDragPayload,
	NATIVE_AGENT_SESSION_DRAG_MIME,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-folders";
import { handleDashboardGlobalKeyboardAction } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-global-keyboard-action";
import {
	dashboardVimKey,
	shouldHandleDashboardVimKey,
	useDashboardVimModeStore,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode";
import {
	nativeAgentChatScrollDeltaFromKey,
	nativeAgentOverviewCardVimActionFromKey,
	nativeAgentOverviewJumpFromKey,
	nativeAgentPlainNavigationKey,
	nativeAgentSearchEscapeResult,
	nativeAgentSelectedSessionVimActionFromKey,
	nativeAgentSplitPaneActionFromKey,
	nativeAgentUnreadVimActionFromKey,
	nextNativeAgentKeyboardViewMode,
	nextNativeAgentOverviewFocusIndex,
} from "../../utils/native-agent-keyboard";
import {
	applyNativeAgentOptimisticPinned,
	applyNativeAgentOptimisticSidebarVisible,
	applyNativeAgentOptimisticTitle,
	mergeActiveNativeAgentRows,
	type NativeAgentOptimisticMetadataMap,
	nativeAgentDisplayTitle,
	nativeAgentSidebarInclusionReasons,
	resolveNativeAgentSidebarState,
	restoreNativeAgentOptimisticSidebarState,
	restoreNativeAgentOptimisticTitle,
	selectNativeAgentProviderActiveRows,
} from "../../utils/native-agent-listing";
import {
	devinSessionAppUrl,
	formatNativeAgentFileSize,
	isNativeAgentImageAttachment,
	markdownWithNativeAgentLinks,
	type NativeAgentAttachment,
	nativeAgentAssetPreviewUrl,
	normalizeDevinAppUrl,
	orderNativeAgentMessagesOldestFirst,
	parseNativeAgentMessageParts,
	shouldProxyNativeAgentAsset,
} from "../../utils/native-agent-message-rendering";
import {
	compactNativeAgentReplyPreview,
	markNativeAgentReplyNotificationRead,
	NATIVE_AGENT_READ_STATE_CHANGE_EVENT,
	readLatestNativeAgentReplyNotification,
	readNativeAgentReadState,
	writeNativeAgentReadState,
} from "../../utils/native-agent-notifications";
import {
	mergeNativeAgentMessagesWithOptimistic,
	type NativeAgentOptimisticMessage,
	pruneConfirmedNativeAgentOptimisticMessages,
} from "../../utils/native-agent-optimistic-messages";
import {
	type NativeAgentOverviewFilter,
	nativeAgentOverviewHoverTitle,
	selectNativeAgentOverviewItems,
} from "../../utils/native-agent-overview";
import {
	formatNativeAgentTimestamp,
	isNativeAgentLiveStatus,
	type NativeAgentProvider,
	nativeAgentConversationLabel,
	nativeAgentConversationSetLabel,
	nativeAgentProviderTitle,
	nativeAgentStatusBadgeLabel,
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

type NativeItem = {
	id: string;
	title: string;
	status: string | null;
	url: string | null;
	updatedAt?: string | number | null;
	isProviderActive?: boolean;
	latestMessage?: NativeMessage | null;
	mineEvidence?: string;
	sidebarPinned?: boolean;
	sidebarHidden?: boolean;
	titleOverride?: string | null;
};

type NativeViewMode = "browser" | "native" | "split";
type NativeAgentSplitPlacement = "native-left" | "native-right";

type NativeAgentCurrentAction =
	| "close-split"
	| "equalize-split"
	| "focus-composer"
	| "hide"
	| "narrow-native-split"
	| "new"
	| "open-browser"
	| "open-external"
	| "pin"
	| "refresh"
	| "rename"
	| "show"
	| "sync-capy"
	| "swap-split"
	| "toggle-browser"
	| "toggle-diagnostics"
	| "toggle-split"
	| "unpin"
	| "widen-native-split";

interface NativeAgentHeaderShortcut {
	key: string;
	label: string;
	onSelect?: () => void;
	section: "session" | "split" | "utility" | "view";
}

type NativeBrowserTarget = {
	id: string;
	key: string;
	provider: NativeAgentProvider;
	title: string;
	url: string;
};

const CAPY_MONOREPO_PROJECT_ID = "a275b1f7-318b-49ed-b2c8-5bb31ca7cd97";
const CAPY_LOCAL_USER_EMAIL = "lakee@exa.ai";
const CAPY_MANUAL_SYNC_SCAN_PAGE_LIMIT = 25;
const NATIVE_AGENT_LIST_STALE_MS = 60_000;
const NATIVE_AGENT_DETAIL_STALE_MS = 30_000;
const NATIVE_AGENT_CACHE_MS = 2 * 60 * 60 * 1000;
const SPLIT_RATIO_STORAGE_KEY = "dashboard-native-agent-split-ratio-v1";
const SPLIT_PLACEMENT_STORAGE_KEY = "dashboard-native-agent-split-placement-v1";
const DEFAULT_NATIVE_AGENT_SPLIT_RATIO = 50;
const DEFAULT_NATIVE_AGENT_SPLIT_PLACEMENT: NativeAgentSplitPlacement =
	"native-left";
const MIN_NATIVE_AGENT_SPLIT_RATIO = 30;
const MAX_NATIVE_AGENT_SPLIT_RATIO = 70;
const NATIVE_AGENT_SPLIT_RATIO_STEP = 5;

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

function shortcutSequence(...keys: Array<string | null | undefined>): string {
	const seen = new Set<string>();
	return keys
		.filter((key): key is string => Boolean(key) && key !== "Unassigned")
		.filter((key) => {
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.join(" / ");
}

function NativeAgentHeaderViewSwitcher({
	nativeBrowserShortcut,
	nativeSplitShortcut,
	onSelectViewMode,
	viewMode,
}: {
	nativeBrowserShortcut: string;
	nativeSplitShortcut: string;
	onSelectViewMode: (mode: NativeViewMode) => void;
	viewMode: NativeViewMode;
}) {
	const options: Array<{
		icon: ReactNode;
		key: NativeViewMode;
		label: string;
		shortcut: string;
		title: string;
	}> = [
		{
			icon: <LuMessageSquare className="size-3.5 shrink-0" />,
			key: "native",
			label: "Native",
			shortcut: "",
			title: "Native chat",
		},
		{
			icon: <LuGlobe className="size-3.5 shrink-0" />,
			key: "browser",
			label: "Browser",
			shortcut: shortcutSequence(nativeBrowserShortcut, "b"),
			title: "Browser view",
		},
		{
			icon: <LuColumns2 className="size-3.5 shrink-0" />,
			key: "split",
			label: "Split",
			shortcut: shortcutSequence(nativeSplitShortcut, "s"),
			title: "Split native chat and browser",
		},
	];

	return (
		<div
			className="flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-border/70 bg-muted/20 p-0.5"
			data-dashboard-action-hint-exclude="true"
		>
			{options.map((option) => {
				const selected = option.key === viewMode;
				const shortcutSuffix = option.shortcut ? ` (${option.shortcut})` : "";
				return (
					<button
						key={option.key}
						type="button"
						aria-pressed={selected}
						onClick={() => onSelectViewMode(option.key)}
						title={`${option.title}${shortcutSuffix}`}
						className={cn(
							"flex h-7 min-w-7 items-center justify-center gap-1.5 rounded px-1.5 text-xs font-medium transition-colors xl:px-2",
							selected
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
						)}
					>
						{option.icon}
						<span className="hidden 2xl:inline">{option.label}</span>
					</button>
				);
			})}
		</div>
	);
}

const NATIVE_AGENT_HEADER_ACTION_SECTION_LABELS = {
	session: "Session",
	split: "Split",
	utility: "Utilities",
	view: "View",
} satisfies Record<NativeAgentHeaderShortcut["section"], string>;

function NativeAgentHeaderActionsMenu({
	isArchiving,
	isStopping,
	onArchive,
	onStop,
	provider,
	shortcuts,
}: {
	isArchiving: boolean;
	isStopping: boolean;
	onArchive: () => void;
	onStop: () => void;
	provider: NativeAgentProvider;
	shortcuts: NativeAgentHeaderShortcut[];
}) {
	const stopLabel = provider === "capy" ? "Stop" : "Terminate";
	const sectionOrder: NativeAgentHeaderShortcut["section"][] = [
		"session",
		"view",
		"split",
		"utility",
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Show native agent shortcuts and actions"
					title="Keyboard shortcuts and actions"
					data-dashboard-action-hint-exclude="true"
					className="flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					<LuKeyRound className="size-3.5" />
					<span className="hidden xl:inline">Keyboard</span>
					<LuChevronDown className="size-3.5 opacity-70" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-80"
				data-native-agent-header-menu="true"
			>
				<div className="px-2 py-1.5">
					<div className="text-xs font-medium text-foreground">
						Session controls
					</div>
					<div className="text-[11px] text-muted-foreground">
						Keyboard shortcuts live here; the header only keeps primary controls
						visible.
					</div>
				</div>
				{sectionOrder.map((section) => {
					const sectionShortcuts = shortcuts.filter(
						(shortcut) => shortcut.section === section,
					);
					if (sectionShortcuts.length === 0) return null;
					return (
						<div key={section}>
							<DropdownMenuSeparator />
							<div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
								{NATIVE_AGENT_HEADER_ACTION_SECTION_LABELS[section]}
							</div>
							{sectionShortcuts.map((shortcut) => (
								<DropdownMenuItem
									key={`${shortcut.section}-${shortcut.label}-${shortcut.key}`}
									onSelect={shortcut.onSelect}
									className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"
								>
									<span className="truncate">{shortcut.label}</span>
									<DropdownMenuShortcut className="ml-0">
										{shortcut.key}
									</DropdownMenuShortcut>
								</DropdownMenuItem>
							))}
						</div>
					);
				})}
				<DropdownMenuSeparator />
				<div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
					Danger
				</div>
				<DropdownMenuItem onSelect={onArchive} disabled={isArchiving}>
					Archive
				</DropdownMenuItem>
				<DropdownMenuItem
					variant="destructive"
					onSelect={onStop}
					disabled={isStopping}
				>
					{stopLabel}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function DiagnosticsRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="grid grid-cols-[130px_1fr] gap-2 border-border/60 border-t py-1.5 text-xs first:border-t-0">
			<span className="text-muted-foreground">{label}</span>
			<span className="min-w-0 break-words font-mono text-foreground/85">
				{value}
			</span>
		</div>
	);
}

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

function nativeAgentReadStateKey(provider: NativeAgentProvider, id: string) {
	return `${provider}:${id}`;
}

function clampNativeAgentSplitRatio(value: number): number {
	if (!Number.isFinite(value)) return DEFAULT_NATIVE_AGENT_SPLIT_RATIO;
	return Math.min(
		MAX_NATIVE_AGENT_SPLIT_RATIO,
		Math.max(MIN_NATIVE_AGENT_SPLIT_RATIO, value),
	);
}

function readNativeAgentSplitRatios(): Record<string, number> {
	const stored = readJson<Record<string, number>>(SPLIT_RATIO_STORAGE_KEY, {});
	return Object.fromEntries(
		Object.entries(stored).map(([key, value]) => [
			key,
			clampNativeAgentSplitRatio(value),
		]),
	);
}

function writeNativeAgentSplitRatios(ratios: Record<string, number>) {
	writeJson(SPLIT_RATIO_STORAGE_KEY, ratios);
}

function isNativeAgentSplitPlacement(
	value: unknown,
): value is NativeAgentSplitPlacement {
	return value === "native-left" || value === "native-right";
}

function readNativeAgentSplitPlacements(): Record<
	string,
	NativeAgentSplitPlacement
> {
	const stored = readJson<Record<string, unknown>>(
		SPLIT_PLACEMENT_STORAGE_KEY,
		{},
	);
	return Object.fromEntries(
		Object.entries(stored).filter(
			(entry): entry is [string, NativeAgentSplitPlacement] =>
				isNativeAgentSplitPlacement(entry[1]),
		),
	);
}

function writeNativeAgentSplitPlacements(
	placements: Record<string, NativeAgentSplitPlacement>,
) {
	writeJson(SPLIT_PLACEMENT_STORAGE_KEY, placements);
}

function nativeAgentSplitPaneStyle({
	pane,
	ratio,
	splitPlacement,
	viewMode,
}: {
	pane: "browser" | "native";
	ratio: number;
	splitPlacement: NativeAgentSplitPlacement;
	viewMode: NativeViewMode;
}): CSSProperties | undefined {
	if (viewMode !== "split") return undefined;
	const nativeIsLeft = splitPlacement === "native-left";
	if (pane === "native") {
		return nativeIsLeft
			? { right: `${100 - ratio}%` }
			: { left: `${100 - ratio}%` };
	}
	return nativeIsLeft ? { left: `${ratio}%` } : { right: `${ratio}%` };
}

function latestAgentMessageTime(item: NativeItem): number | null {
	if (!item.latestMessage) return null;
	return nativeAgentTimestampMs(item.latestMessage.createdAt);
}

function hasUnreadNativeAgentReply(
	item: NativeItem,
	readState: Record<string, number>,
	provider: NativeAgentProvider,
): boolean {
	if (!item.latestMessage) return false;
	if (normalizeNativeAgentRole(item.latestMessage.role, provider).isUser) {
		return false;
	}
	const latestTime = latestAgentMessageTime(item);
	if (latestTime == null) return false;
	return (
		latestTime > (readState[nativeAgentReadStateKey(provider, item.id)] ?? 0)
	);
}

function consumeNativeAgentKeyboardEvent(
	event: KeyboardEvent | ReactKeyboardEvent,
) {
	event.preventDefault();
	event.stopPropagation();
	if ("stopImmediatePropagation" in event) {
		event.stopImmediatePropagation();
		return;
	}
	event.nativeEvent.stopImmediatePropagation?.();
}

function activeDashboardNativeAgentSidebarRow() {
	if (typeof document === "undefined") return null;
	const active = document.activeElement;
	if (!(active instanceof HTMLElement)) return null;
	return active.closest(
		"[data-native-agent-session-row-id], [data-native-agent-folder-row-id]",
	);
}

function nativeAgentPlainKeyboardScopeAllowsEvent(
	event: KeyboardEvent,
	root: HTMLElement | null,
) {
	const active =
		typeof document === "undefined" ? null : document.activeElement;
	if (typeof document !== "undefined" && active === document.body) return true;
	if (active instanceof HTMLElement && root?.contains(active)) return true;
	if (event.target instanceof HTMLElement && root?.contains(event.target)) {
		return true;
	}
	return false;
}

function nativeAgentStatusIsFinished(status: string | null): boolean {
	const normalized = status?.toLowerCase() ?? "";
	return [
		"archived",
		"completed",
		"done",
		"error",
		"exit",
		"expired",
		"finished",
	].includes(normalized);
}

function NativeAttachmentImage({
	attachment,
}: {
	attachment: NativeAgentAttachment;
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

function AttachmentChip({ attachment }: { attachment: NativeAgentAttachment }) {
	const size = formatNativeAgentFileSize(attachment.fileSize);
	const isImage = isNativeAgentImageAttachment(attachment);

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
			{markdownWithNativeAgentLinks(body)}
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

function NativeMarkdown({ body }: { body: string }) {
	const parts = useMemo(() => parseNativeAgentMessageParts(body), [body]);

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
	const [overviewFilter, setOverviewFilter] =
		useState<NativeAgentOverviewFilter>("all");
	const [overviewSearch, setOverviewSearch] = useState("");
	const [optimisticMetadata, setOptimisticMetadata] =
		useState<NativeAgentOptimisticMetadataMap>({});
	const [optimisticMessages, setOptimisticMessages] = useState<
		NativeAgentOptimisticMessage[]
	>([]);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [renameDraft, setRenameDraft] = useState("");
	const [readState, setReadState] = useState(() => readNativeAgentReadState());
	const [splitRatios, setSplitRatios] = useState(() =>
		readNativeAgentSplitRatios(),
	);
	const [splitPlacements, setSplitPlacements] = useState(() =>
		readNativeAgentSplitPlacements(),
	);
	const [showDiagnostics, setShowDiagnostics] = useState(false);
	const isVimModeEnabled = useDashboardVimModeStore((state) => state.enabled);
	const nativeBrowserShortcut = useHotkeyDisplay(
		"TOGGLE_NATIVE_BROWSER_VIEW",
	).text;
	const nativeSplitShortcut = useHotkeyDisplay("TOGGLE_NATIVE_SPLIT_VIEW").text;
	const selectedViewKey = `${provider}:${selectedId ?? ""}`;
	const [viewState, setViewState] = useState<{
		key: string;
		mode: NativeViewMode;
	}>(() => ({ key: selectedViewKey, mode: "native" }));
	const viewMode =
		viewState.key === selectedViewKey ? viewState.mode : "native";
	const nativeSplitRatio =
		splitRatios[selectedViewKey] ?? DEFAULT_NATIVE_AGENT_SPLIT_RATIO;
	const nativeSplitPlacement =
		splitPlacements[selectedViewKey] ?? DEFAULT_NATIVE_AGENT_SPLIT_PLACEMENT;
	const nativePaneStyle = nativeAgentSplitPaneStyle({
		pane: "native",
		ratio: nativeSplitRatio,
		splitPlacement: nativeSplitPlacement,
		viewMode,
	});
	const browserPaneStyle = nativeAgentSplitPaneStyle({
		pane: "browser",
		ratio: nativeSplitRatio,
		splitPlacement: nativeSplitPlacement,
		viewMode,
	});
	const [openedBrowserTargets, setOpenedBrowserTargets] = useState<
		NativeBrowserTarget[]
	>([]);
	const [devinFlavor, setDevinFlavor] = useState<"v1" | "v3">("v1");
	const [devinOrgId, setDevinOrgId] = useState("");
	const [devinUserEmail, setDevinUserEmail] = useState(userEmail ?? "");
	const messageEndRef = useRef<HTMLDivElement | null>(null);
	const messageScrollRef = useRef<HTMLDivElement | null>(null);
	const composerRef = useRef<HTMLTextAreaElement | null>(null);
	const overviewSearchRef = useRef<HTMLInputElement | null>(null);
	const renameInputRef = useRef<HTMLInputElement | null>(null);
	const nativeAgentViewRootRef = useRef<HTMLDivElement | null>(null);
	const overviewLastGAtRef = useRef(0);

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
			limit: 50,
			mineOnly: true,
			projectId: CAPY_MONOREPO_PROJECT_ID,
			userEmail: CAPY_LOCAL_USER_EMAIL,
		},
		{
			enabled: provider === "capy" && isConfigured,
			gcTime: NATIVE_AGENT_CACHE_MS,
			refetchInterval: 60_000,
			staleTime: NATIVE_AGENT_LIST_STALE_MS,
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
				enabled: provider === "capy" && isConfigured,
				gcTime: NATIVE_AGENT_CACHE_MS,
				refetchInterval: 15_000,
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
				enabled: provider === "devin" && isConfigured,
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

	const workspaceItems: NativeItem[] = useMemo(() => {
		if (provider === "capy") {
			const capyFreshActiveThreads = selectNativeAgentProviderActiveRows(
				capyFreshThreadsQuery.data?.items ?? [],
				{
					getStatus: (thread) => thread.runState ?? thread.status,
					isLiveStatus: isNativeAgentLiveStatus,
				},
			);
			return mergeActiveNativeAgentRows(
				capyThreadsQuery.data?.items ?? [],
				capyFreshActiveThreads,
			).map((thread) => {
				const optimistic = optimisticMetadata[`capy:${thread.id}`];
				const sidebarState = resolveNativeAgentSidebarState({
					metadata: thread.nativeAgentMetadata,
					optimistic,
				});
				const status = thread.runState ?? thread.status ?? null;
				const metadata = thread.nativeAgentMetadata;
				const titleOverride =
					optimistic?.titleOverride ?? metadata?.titleOverride ?? null;
				return {
					id: thread.id,
					isProviderActive:
						thread.isProviderActive || isNativeAgentLiveStatus(status),
					latestMessage: thread.latestMessage
						? {
								body: thread.latestMessage.content,
								createdAt: thread.latestMessage.createdAt,
								id: `latest:${thread.id}`,
								role: thread.latestMessage.role,
							}
						: null,
					sidebarHidden: sidebarState.sidebarHidden,
					sidebarPinned: sidebarState.sidebarPinned,
					titleOverride,
					mineEvidence: nativeAgentMineEvidenceSummary({
						createdLocally: metadata?.createdLocally,
						ownershipVerified: metadata?.ownershipVerified,
						pinned: metadata?.pinned,
						provider: "capy",
						userEmail: CAPY_LOCAL_USER_EMAIL,
					}),
					status,
					title: nativeAgentDisplayTitle({
						fallbackTitle: `Untitled ${nativeAgentConversationLabel(provider)}`,
						metadata,
						optimistic,
						providerTitle: thread.title,
					}),
					updatedAt:
						thread.latestMessage?.createdAt ??
						thread.lastMessage?.createdAt ??
						thread.updatedAt ??
						thread.createdAt,
					url: `https://capy.ai/project/${thread.projectId}/thread/${thread.id}`,
				};
			});
		}
		return (devinSessionsQuery.data?.items ?? []).map((session) => {
			const optimistic = optimisticMetadata[`devin:${session.id}`];
			const sidebarState = resolveNativeAgentSidebarState({
				metadata: session.nativeAgentMetadata,
				optimistic,
			});
			const metadata = session.nativeAgentMetadata;
			const titleOverride =
				optimistic?.titleOverride ?? metadata?.titleOverride ?? null;
			return {
				id: session.id,
				latestMessage: session.latestMessage ?? null,
				mineEvidence: nativeAgentMineEvidenceSummary({
					createdLocally: metadata?.createdLocally,
					ownershipVerified: metadata?.ownershipVerified,
					pinned: metadata?.pinned,
					provider: "devin",
					requestingUserEmail: session.requestingUserEmail,
					userEmail: effectiveUserEmail,
				}),
				sidebarHidden: sidebarState.sidebarHidden,
				sidebarPinned: sidebarState.sidebarPinned,
				status: session.status,
				title: nativeAgentDisplayTitle({
					fallbackTitle: session.id,
					metadata,
					optimistic,
					providerTitle: session.title,
				}),
				titleOverride,
				updatedAt:
					session.latestMessage?.createdAt ??
					session.updatedAt ??
					session.createdAt,
				url: normalizeDevinAppUrl(session.url),
			};
		});
	}, [
		capyFreshThreadsQuery.data?.items,
		capyThreadsQuery.data?.items,
		devinSessionsQuery.data?.items,
		effectiveUserEmail,
		optimisticMetadata,
		provider,
	]);

	const selectedItem: NativeItem | null = useMemo(() => {
		if (!selectedId) return null;
		const optimistic = optimisticMetadata[`${provider}:${selectedId}`];
		const listFallback =
			workspaceItems.find((item) => item.id === selectedId) ?? null;
		if (provider === "capy") {
			const thread = capyThreadQuery.data;
			const metadata = thread?.nativeAgentMetadata;
			const sidebarState = resolveNativeAgentSidebarState({
				metadata,
				optimistic,
			});
			const titleOverride =
				optimistic?.titleOverride ??
				metadata?.titleOverride ??
				listFallback?.titleOverride ??
				null;
			const sidebarHidden =
				thread || !listFallback
					? sidebarState.sidebarHidden
					: listFallback.sidebarHidden;
			const sidebarPinned =
				thread || !listFallback
					? sidebarState.sidebarPinned
					: listFallback.sidebarPinned;
			return {
				id: selectedId,
				latestMessage: thread?.latestMessage
					? {
							body: thread.latestMessage.content,
							createdAt: thread.latestMessage.createdAt,
							id: `latest:${selectedId}`,
							role: thread.latestMessage.role,
						}
					: (listFallback?.latestMessage ?? null),
				mineEvidence:
					thread || !listFallback
						? nativeAgentMineEvidenceSummary({
								createdLocally: metadata?.createdLocally,
								ownershipVerified: metadata?.ownershipVerified,
								pinned: metadata?.pinned,
								provider: "capy",
								userEmail: CAPY_LOCAL_USER_EMAIL,
							})
						: listFallback.mineEvidence,
				sidebarHidden,
				sidebarPinned,
				status:
					thread?.runState ?? thread?.status ?? listFallback?.status ?? null,
				title: nativeAgentDisplayTitle({
					fallbackTitle:
						listFallback?.title ?? nativeAgentConversationLabel(provider),
					metadata,
					optimistic,
					providerTitle: thread?.title,
				}),
				titleOverride,
				updatedAt: listFallback?.updatedAt,
				url:
					thread?.projectId || !listFallback?.url
						? `https://capy.ai/project/${thread?.projectId ?? CAPY_MONOREPO_PROJECT_ID}/thread/${selectedId}`
						: listFallback.url,
			};
		}
		const session = devinSessionQuery.data?.session;
		const metadata = session?.nativeAgentMetadata;
		const sidebarState = resolveNativeAgentSidebarState({
			metadata,
			optimistic,
		});
		const titleOverride =
			optimistic?.titleOverride ??
			metadata?.titleOverride ??
			listFallback?.titleOverride ??
			null;
		const sidebarHidden =
			session || !listFallback
				? sidebarState.sidebarHidden
				: listFallback.sidebarHidden;
		const sidebarPinned =
			session || !listFallback
				? sidebarState.sidebarPinned
				: listFallback.sidebarPinned;
		return {
			id: selectedId,
			latestMessage:
				session?.latestMessage ?? listFallback?.latestMessage ?? null,
			mineEvidence:
				session || !listFallback
					? nativeAgentMineEvidenceSummary({
							createdLocally: metadata?.createdLocally,
							ownershipVerified: metadata?.ownershipVerified,
							pinned: metadata?.pinned,
							provider: "devin",
							requestingUserEmail: session?.requestingUserEmail,
							userEmail: effectiveUserEmail,
						})
					: listFallback.mineEvidence,
			sidebarHidden,
			sidebarPinned,
			status: session?.status ?? listFallback?.status ?? null,
			title: nativeAgentDisplayTitle({
				fallbackTitle:
					listFallback?.title ?? nativeAgentConversationLabel(provider),
				metadata,
				optimistic,
				providerTitle: session?.title,
			}),
			titleOverride,
			updatedAt: listFallback?.updatedAt,
			url:
				normalizeDevinAppUrl(session?.url) ??
				listFallback?.url ??
				devinSessionAppUrl(selectedId),
		};
	}, [
		capyThreadQuery.data,
		devinSessionQuery.data?.session,
		effectiveUserEmail,
		optimisticMetadata,
		provider,
		selectedId,
		workspaceItems,
	]);

	const filteredWorkspaceItems = useMemo(() => {
		return selectNativeAgentOverviewItems(workspaceItems, {
			filter: overviewFilter,
			isFinishedStatus: nativeAgentStatusIsFinished,
			isLiveStatus: isNativeAgentLiveStatus,
			isUnread: (item) => hasUnreadNativeAgentReply(item, readState, provider),
			search: overviewSearch,
		});
	}, [overviewFilter, overviewSearch, provider, readState, workspaceItems]);

	const activeWorkspaceItems = useMemo(
		() =>
			workspaceItems.filter(
				(item) => item.isProviderActive || isNativeAgentLiveStatus(item.status),
			),
		[workspaceItems],
	);
	const unreadWorkspaceItems = useMemo(
		() =>
			workspaceItems.filter((item) =>
				hasUnreadNativeAgentReply(item, readState, provider),
			),
		[provider, readState, workspaceItems],
	);
	const overviewHoverTitle = useCallback(
		(item: NativeItem) =>
			nativeAgentOverviewHoverTitle(item, {
				formatPreview: compactNativeAgentReplyPreview,
				isUnread: hasUnreadNativeAgentReply(item, readState, provider),
			}),
		[provider, readState],
	);
	const currentItemDiagnostics = useMemo(() => {
		if (!selectedItem) return [];
		return [
			...nativeAgentSidebarInclusionReasons(selectedItem, {
				activeId: selectedId,
				isLiveStatus: isNativeAgentLiveStatus,
				isUnread: (item) =>
					hasUnreadNativeAgentReply(item, readState, provider),
			}),
			provider === "capy" ? "mineOnly: api-filtered" : "mineOnly: user-email",
		];
	}, [provider, readState, selectedId, selectedItem]);
	const diagnosticsQueries = useMemo(
		() =>
			provider === "capy"
				? [
						capyThreadsQuery,
						capyFreshThreadsQuery,
						capyThreadQuery,
						capyMessagesQuery,
					]
				: [devinSessionsQuery, devinSessionQuery],
		[
			capyFreshThreadsQuery,
			capyMessagesQuery,
			capyThreadQuery,
			capyThreadsQuery,
			devinSessionQuery,
			devinSessionsQuery,
			provider,
		],
	);
	const diagnosticsFreshness = useMemo(
		() => summarizeNativeAgentDiagnosticsFreshness(diagnosticsQueries),
		[diagnosticsQueries],
	);

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
			return orderNativeAgentMessagesOldestFirst(confirmedMessages);
		}
		return mergeNativeAgentMessagesWithOptimistic({
			confirmedMessages,
			optimisticMessages,
			provider,
			targetId: selectedId,
		});
	}, [confirmedMessages, optimisticMessages, provider, selectedId]);
	const lastMessageId = messages.at(-1)?.id ?? null;

	useEffect(() => {
		if (!selectedId || !lastMessageId) return;
		messageEndRef.current?.scrollIntoView({ block: "end" });
	}, [lastMessageId, selectedId]);

	useEffect(() => {
		if (!selectedItem) return;
		const latestTime = latestAgentMessageTime(selectedItem);
		if (latestTime == null) return;
		setReadState((current) => {
			const key = nativeAgentReadStateKey(provider, selectedItem.id);
			if ((current[key] ?? 0) >= latestTime) return current;
			const next = { ...current, [key]: latestTime };
			writeNativeAgentReadState(next);
			return next;
		});
	}, [provider, selectedItem]);

	useEffect(() => {
		if (!selectedId || confirmedMessages.length === 0) return;
		setOptimisticMessages((current) => {
			const next = pruneConfirmedNativeAgentOptimisticMessages({
				confirmedMessages,
				optimisticMessages: current,
				provider,
				targetId: selectedId,
			});
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
	const setTitle = electronTrpc.nativeAgents.metadata.setTitle.useMutation();
	const syncCapyMine = electronTrpc.nativeAgents.capy.syncMine.useMutation();
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

	const invalidateProvider = useCallback(async () => {
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
	}, [provider, utils]);

	const syncCapyThreads = useCallback(async () => {
		if (provider !== "capy") return;
		try {
			const result = await syncCapyMine.mutateAsync({
				limit: 50,
				projectId: CAPY_MONOREPO_PROJECT_ID,
				scanPageLimit: CAPY_MANUAL_SYNC_SCAN_PAGE_LIMIT,
				userEmail: CAPY_LOCAL_USER_EMAIL,
			});
			await invalidateProvider();
			toast.success(
				result.discovered > 0
					? `Synced ${result.discovered} Capy threads`
					: `Scanned ${result.scanned} Capy threads`,
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	}, [invalidateProvider, provider, syncCapyMine]);

	const scheduleProviderRefresh = useCallback(() => {
		void invalidateProvider();
		window.setTimeout(() => void invalidateProvider(), 1_500);
		window.setTimeout(() => void invalidateProvider(), 5_000);
	}, [invalidateProvider]);

	const handleSetSidebarVisible = useCallback(
		async (item: NativeItem, visible: boolean) => {
			setOptimisticMetadata((current) =>
				applyNativeAgentOptimisticSidebarVisible(current, {
					id: item.id,
					provider,
					visible,
				}),
			);
			try {
				await setSidebarVisible.mutateAsync({
					id: item.id,
					provider,
					title: item.title,
					visible,
				});
				scheduleProviderRefresh();
				toast.success(visible ? "Shown in sidebar" : "Moved to overview");
			} catch (error) {
				setOptimisticMetadata((current) =>
					restoreNativeAgentOptimisticSidebarState(current, {
						id: item.id,
						provider,
						sidebarHidden: item.sidebarHidden,
						sidebarPinned: item.sidebarPinned,
					}),
				);
				toast.error(error instanceof Error ? error.message : String(error));
			}
		},
		[provider, scheduleProviderRefresh, setSidebarVisible],
	);

	const handleSetPinned = useCallback(
		async (item: NativeItem, pinned: boolean) => {
			setOptimisticMetadata((current) =>
				applyNativeAgentOptimisticPinned(current, {
					id: item.id,
					pinned,
					provider,
				}),
			);
			try {
				await setPinned.mutateAsync({
					id: item.id,
					pinned,
					provider,
					title: item.title,
				});
				scheduleProviderRefresh();
				toast.success(pinned ? "Pinned in sidebar" : "Unpinned");
			} catch (error) {
				setOptimisticMetadata((current) =>
					restoreNativeAgentOptimisticSidebarState(current, {
						id: item.id,
						provider,
						sidebarHidden: item.sidebarHidden,
						sidebarPinned: item.sidebarPinned,
					}),
				);
				toast.error(error instanceof Error ? error.message : String(error));
			}
		},
		[provider, scheduleProviderRefresh, setPinned],
	);

	const openRenameDialog = useCallback((item: NativeItem) => {
		setRenameDraft(item.title);
		setRenameDialogOpen(true);
		window.setTimeout(() => {
			renameInputRef.current?.focus();
			renameInputRef.current?.select();
		}, 0);
	}, []);

	const handleRenameSelectedItem = useCallback(async () => {
		if (!selectedItem) return;
		const title = renameDraft.trim();
		if (!title) {
			toast.error("Enter a session name first");
			return;
		}
		setRenameDialogOpen(false);
		setOptimisticMetadata((current) =>
			applyNativeAgentOptimisticTitle(current, {
				id: selectedItem.id,
				provider,
				titleOverride: title,
			}),
		);
		try {
			await setTitle.mutateAsync({
				id: selectedItem.id,
				provider,
				title,
			});
			scheduleProviderRefresh();
			toast.success("Session renamed");
		} catch (error) {
			setOptimisticMetadata((current) =>
				restoreNativeAgentOptimisticTitle(current, {
					id: selectedItem.id,
					provider,
					titleOverride: selectedItem.titleOverride,
				}),
			);
			toast.error(error instanceof Error ? error.message : String(error));
		}
	}, [provider, renameDraft, scheduleProviderRefresh, selectedItem, setTitle]);

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
		const optimisticMessage: NativeAgentOptimisticMessage = {
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

	const handleSelectViewMode = useCallback(
		(mode: NativeViewMode) => {
			setViewState({ key: selectedViewKey, mode });
			if (mode === "native" || !nativeBrowserKey || !selectedItem?.url) return;
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
		},
		[nativeBrowserKey, provider, selectedItem, selectedViewKey],
	);

	const resizeNativeSplitPane = useCallback(
		(delta: number) => {
			if (viewMode !== "split" || !selectedItem?.url) return;
			setSplitRatios((current) => ({
				...current,
				[selectedViewKey]: clampNativeAgentSplitRatio(
					(current[selectedViewKey] ?? DEFAULT_NATIVE_AGENT_SPLIT_RATIO) +
						delta,
				),
			}));
		},
		[selectedItem?.url, selectedViewKey, viewMode],
	);

	const equalizeNativeSplitPanes = useCallback(() => {
		if (viewMode !== "split" || !selectedItem?.url) return;
		setSplitRatios((current) => ({
			...current,
			[selectedViewKey]: DEFAULT_NATIVE_AGENT_SPLIT_RATIO,
		}));
	}, [selectedItem?.url, selectedViewKey, viewMode]);

	const swapNativeSplitPanes = useCallback(() => {
		if (viewMode !== "split" || !selectedItem?.url) return;
		setSplitPlacements((current) => {
			const currentPlacement =
				current[selectedViewKey] ?? DEFAULT_NATIVE_AGENT_SPLIT_PLACEMENT;
			return {
				...current,
				[selectedViewKey]:
					currentPlacement === "native-left" ? "native-right" : "native-left",
			};
		});
	}, [selectedItem?.url, selectedViewKey, viewMode]);

	useEffect(() => {
		writeNativeAgentSplitRatios(splitRatios);
	}, [splitRatios]);

	useEffect(() => {
		writeNativeAgentSplitPlacements(splitPlacements);
	}, [splitPlacements]);

	useEffect(() => {
		const openItem = (item: NativeItem) => {
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
		};

		const currentOverviewItem = () => {
			const rows = Array.from(
				document.querySelectorAll<HTMLButtonElement>(
					"[data-native-agent-overview-card-id]",
				),
			);
			const active = document.activeElement;
			const index =
				active instanceof HTMLButtonElement ? rows.indexOf(active) : -1;
			return { index, rows };
		};

		const overviewColumnCount = (rows: HTMLButtonElement[]) => {
			if (rows.length <= 1) return 1;
			const firstTop = rows[0]?.getBoundingClientRect().top;
			if (firstTop == null) return 1;
			const firstRowCount = rows.findIndex(
				(row) => Math.abs(row.getBoundingClientRect().top - firstTop) > 4,
			);
			return firstRowCount === -1 ? rows.length : Math.max(1, firstRowCount);
		};

		const moveOverviewFocusByKey = (key: string) => {
			const { index, rows } = currentOverviewItem();
			const nextIndex = nextNativeAgentOverviewFocusIndex({
				columnCount: overviewColumnCount(rows),
				currentIndex: index,
				itemCount: rows.length,
				key,
			});
			if (nextIndex == null) return;
			rows[nextIndex]?.focus();
		};

		const moveOverviewFocusToBoundary = (action: "bottom" | "top") => {
			const { rows } = currentOverviewItem();
			const nextRow = action === "top" ? rows[0] : rows[rows.length - 1];
			nextRow?.focus();
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (activeDashboardNativeAgentSidebarRow()) return;

			const vimKey = shouldHandleDashboardVimKey(event)
				? dashboardVimKey(event)
				: null;
			const key = vimKey ?? nativeAgentPlainNavigationKey(event);
			if (!key) return;
			if (
				!vimKey &&
				!nativeAgentPlainKeyboardScopeAllowsEvent(
					event,
					nativeAgentViewRootRef.current,
				)
			) {
				return;
			}

			if (key === "/") {
				consumeNativeAgentKeyboardEvent(event);
				if (selectedItem) {
					navigate({
						to: provider === "capy" ? "/native/capy" : "/native/devin",
					});
					window.setTimeout(() => overviewSearchRef.current?.focus(), 0);
					return;
				}
				overviewSearchRef.current?.focus();
				return;
			}

			if (key === "n") {
				consumeNativeAgentKeyboardEvent(event);
				window.dispatchEvent(
					new CustomEvent("dashboard-native-agent-create", {
						detail: { provider },
					}),
				);
				return;
			}

			const overviewJump = nativeAgentOverviewJumpFromKey({
				key,
				lastGAt: overviewLastGAtRef.current,
				now: Date.now(),
			});
			if (!selectedItem && overviewJump.handled) {
				consumeNativeAgentKeyboardEvent(event);
				overviewLastGAtRef.current = overviewJump.nextLastGAt;
				if (overviewJump.action !== "none") {
					moveOverviewFocusToBoundary(overviewJump.action);
				}
				return;
			}

			if (key === "R") {
				consumeNativeAgentKeyboardEvent(event);
				void invalidateProvider();
				return;
			}

			const unreadAction = nativeAgentUnreadVimActionFromKey(key);
			if (unreadAction === "mark-latest-read") {
				const latestReply = readLatestNativeAgentReplyNotification();
				if (!latestReply) return;
				consumeNativeAgentKeyboardEvent(event);
				markNativeAgentReplyNotificationRead(latestReply);
				return;
			}
			if (unreadAction === "open-unread") {
				const unreadItem = unreadWorkspaceItems[0];
				if (!unreadItem) return;
				consumeNativeAgentKeyboardEvent(event);
				openItem(unreadItem);
				return;
			}

			if (selectedItem) {
				if (
					(key === "j" || key === "k" || key === "J" || key === "K") &&
					(viewMode === "native" || viewMode === "split")
				) {
					const scrollNode = messageScrollRef.current;
					if (scrollNode) {
						consumeNativeAgentKeyboardEvent(event);
						scrollNode.scrollBy({
							behavior: "auto",
							top: nativeAgentChatScrollDeltaFromKey(
								key,
								scrollNode.clientHeight,
							),
						});
						return;
					}
				}
				const selectedSessionAction =
					nativeAgentSelectedSessionVimActionFromKey(key);
				if (selectedSessionAction !== "none") {
					consumeNativeAgentKeyboardEvent(event);
					if (selectedSessionAction === "focus-navigation-shell") {
						handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL");
						return;
					}
					if (selectedSessionAction === "focus-composer") {
						composerRef.current?.focus();
						return;
					}
					if (selectedSessionAction === "refresh") {
						void invalidateProvider();
						return;
					}
					if (selectedSessionAction === "show-action-hints") {
						handleDashboardGlobalKeyboardAction("SHOW_DASHBOARD_ACTION_HINTS");
						return;
					}
					if (selectedSessionAction === "open-browser") {
						if (selectedItem.url) handleSelectViewMode("browser");
						return;
					}
					if (selectedSessionAction === "open-external") {
						if (selectedItem.url) openExternal.mutate(selectedItem.url);
						return;
					}
					if (selectedSessionAction === "rename") {
						openRenameDialog(selectedItem);
						return;
					}
					if (selectedSessionAction === "pin") {
						void handleSetPinned(
							selectedItem,
							selectedItem.sidebarPinned !== true,
						);
						return;
					}
					if (selectedSessionAction === "archive") {
						void handleSetSidebarVisible(selectedItem, false);
						return;
					}
					window.dispatchEvent(
						new CustomEvent("dashboard-native-agent-folder-action", {
							detail: {
								action:
									selectedSessionAction === "remove-from-folder"
										? "remove-active"
										: "move-active",
								provider,
								sessionId: selectedItem.id,
							},
						}),
					);
					return;
				}
				const splitPaneAction = nativeAgentSplitPaneActionFromKey(key);
				if (
					splitPaneAction !== "none" &&
					viewMode === "split" &&
					selectedItem.url
				) {
					consumeNativeAgentKeyboardEvent(event);
					if (splitPaneAction === "close") {
						handleSelectViewMode("native");
						return;
					}
					if (splitPaneAction === "swap") {
						swapNativeSplitPanes();
						return;
					}
					if (splitPaneAction === "narrow-native") {
						resizeNativeSplitPane(-NATIVE_AGENT_SPLIT_RATIO_STEP);
						return;
					}
					if (splitPaneAction === "widen-native") {
						resizeNativeSplitPane(NATIVE_AGENT_SPLIT_RATIO_STEP);
						return;
					}
					equalizeNativeSplitPanes();
					return;
				}
				const nextViewMode = nextNativeAgentKeyboardViewMode({
					currentMode: viewMode,
					hasBrowserUrl: Boolean(selectedItem.url),
					key,
				});
				if (nextViewMode) {
					consumeNativeAgentKeyboardEvent(event);
					handleSelectViewMode(nextViewMode);
					return;
				}
				return;
			}

			if (key === "j" || key === "k") {
				consumeNativeAgentKeyboardEvent(event);
				moveOverviewFocusByKey(key);
				return;
			}
			if (key === "l" || key === "h") {
				consumeNativeAgentKeyboardEvent(event);
				moveOverviewFocusByKey(key);
				return;
			}
			if (key === "escape") {
				const active = document.activeElement;
				if (
					active instanceof HTMLElement &&
					active.matches("[data-native-agent-overview-card-id]")
				) {
					consumeNativeAgentKeyboardEvent(event);
					handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL");
				}
				return;
			}
			if (key === "enter" || key === "o") {
				const active = document.activeElement;
				if (!(active instanceof HTMLButtonElement)) return;
				const item = workspaceItems.find(
					(candidate) =>
						candidate.id === active.dataset.nativeAgentOverviewCardId,
				);
				if (!item) return;
				consumeNativeAgentKeyboardEvent(event);
				openItem(item);
				return;
			}
			const overviewCardAction = nativeAgentOverviewCardVimActionFromKey(key);
			if (overviewCardAction !== "none") {
				const active = document.activeElement;
				if (!(active instanceof HTMLButtonElement)) return;
				const item = workspaceItems.find(
					(candidate) =>
						candidate.id === active.dataset.nativeAgentOverviewCardId,
				);
				if (!item) return;
				consumeNativeAgentKeyboardEvent(event);
				if (overviewCardAction === "pin") {
					void handleSetPinned(item, item.sidebarPinned !== true);
					return;
				}
				if (overviewCardAction === "rename") {
					openRenameDialog(item);
					return;
				}
				if (overviewCardAction === "archive") {
					void handleSetSidebarVisible(item, false);
					return;
				}
				window.dispatchEvent(
					new CustomEvent("dashboard-native-agent-folder-action", {
						detail: {
							action:
								overviewCardAction === "remove-from-folder"
									? "remove-active"
									: "move-active",
							provider,
							sessionId: item.id,
						},
					}),
				);
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, [
		equalizeNativeSplitPanes,
		handleSelectViewMode,
		invalidateProvider,
		openExternal,
		provider,
		resizeNativeSplitPane,
		selectedItem,
		swapNativeSplitPanes,
		unreadWorkspaceItems,
		viewMode,
		workspaceItems,
		navigate,
		handleSetPinned,
		handleSetSidebarVisible,
		openRenameDialog,
	]);

	useEffect(() => {
		const handleAction = (event: Event) => {
			const detail = (
				event as CustomEvent<{
					action?: NativeAgentCurrentAction;
					provider?: NativeAgentProvider;
				}>
			).detail;
			if (detail?.provider && detail.provider !== provider) return;
			if (detail?.action === "new") {
				window.dispatchEvent(
					new CustomEvent("dashboard-native-agent-create", {
						detail: { provider },
					}),
				);
				return;
			}
			if (detail?.action === "refresh") {
				void invalidateProvider();
				return;
			}
			if (detail?.action === "sync-capy") {
				void syncCapyThreads();
				return;
			}
			if (detail?.action === "toggle-diagnostics") {
				setShowDiagnostics((current) => !current);
				return;
			}
			if (!selectedItem) return;
			if (detail?.action === "pin") {
				void handleSetPinned(selectedItem, true);
				return;
			}
			if (detail?.action === "unpin") {
				void handleSetPinned(selectedItem, false);
				return;
			}
			if (detail?.action === "rename") {
				openRenameDialog(selectedItem);
				return;
			}
			if (detail?.action === "hide") {
				void handleSetSidebarVisible(selectedItem, false);
				return;
			}
			if (detail?.action === "show") {
				void handleSetSidebarVisible(selectedItem, true);
				return;
			}
			if (detail?.action === "focus-composer") {
				composerRef.current?.focus();
				return;
			}
			if (detail?.action === "open-browser" && selectedItem.url) {
				handleSelectViewMode("browser");
				return;
			}
			if (detail?.action === "open-external" && selectedItem.url) {
				openExternal.mutate(selectedItem.url);
				return;
			}
			if (detail?.action === "toggle-browser" && selectedItem.url) {
				handleSelectViewMode(viewMode === "native" ? "browser" : "native");
				return;
			}
			if (detail?.action === "toggle-split" && selectedItem.url) {
				handleSelectViewMode(viewMode === "split" ? "native" : "split");
				return;
			}
			if (detail?.action === "swap-split" && selectedItem.url) {
				swapNativeSplitPanes();
				return;
			}
			if (detail?.action === "close-split" && selectedItem.url) {
				if (viewMode === "split") handleSelectViewMode("native");
				return;
			}
			if (detail?.action === "narrow-native-split" && selectedItem.url) {
				resizeNativeSplitPane(-NATIVE_AGENT_SPLIT_RATIO_STEP);
				return;
			}
			if (detail?.action === "widen-native-split" && selectedItem.url) {
				resizeNativeSplitPane(NATIVE_AGENT_SPLIT_RATIO_STEP);
				return;
			}
			if (detail?.action === "equalize-split" && selectedItem.url) {
				equalizeNativeSplitPanes();
				return;
			}
		};

		window.addEventListener(
			"dashboard-native-agent-current-action",
			handleAction,
		);
		return () => {
			window.removeEventListener(
				"dashboard-native-agent-current-action",
				handleAction,
			);
		};
	}, [
		handleSelectViewMode,
		equalizeNativeSplitPanes,
		invalidateProvider,
		provider,
		resizeNativeSplitPane,
		selectedItem,
		swapNativeSplitPanes,
		syncCapyThreads,
		viewMode,
		handleSetPinned,
		handleSetSidebarVisible,
		openRenameDialog,
		openExternal,
	]);

	useEffect(() => {
		const handleFilter = (event: Event) => {
			const detail = (
				event as CustomEvent<{
					filter?: NativeAgentOverviewFilter;
					provider?: NativeAgentProvider;
				}>
			).detail;
			if (detail?.provider && detail.provider !== provider) return;
			if (!detail?.filter) return;
			setOverviewFilter(detail.filter);
			setViewState({ key: selectedViewKey, mode: "native" });
			window.setTimeout(() => overviewSearchRef.current?.focus(), 0);
		};

		window.addEventListener(
			"dashboard-native-agent-overview-filter",
			handleFilter,
		);
		return () => {
			window.removeEventListener(
				"dashboard-native-agent-overview-filter",
				handleFilter,
			);
		};
	}, [provider, selectedViewKey]);

	const selectedHeaderShortcuts: NativeAgentHeaderShortcut[] = selectedItem
		? [
				{
					key: "r",
					label: "Reply",
					onSelect: () => composerRef.current?.focus(),
					section: "session",
				},
				{
					key: "i",
					label: "Insert reply",
					onSelect: () => composerRef.current?.focus(),
					section: "session",
				},
				{
					key: "R",
					label: "Refresh",
					onSelect: () => void invalidateProvider(),
					section: "utility",
				},
				{
					key: "p",
					label: selectedItem.sidebarPinned ? "Unpin" : "Pin",
					onSelect: () =>
						void handleSetPinned(
							selectedItem,
							selectedItem.sidebarPinned !== true,
						),
					section: "session",
				},
				{
					key: "e",
					label: "Rename",
					onSelect: () => openRenameDialog(selectedItem),
					section: "session",
				},
				{
					key: "m",
					label: "Move to folder",
					onSelect: () =>
						window.dispatchEvent(
							new CustomEvent("dashboard-native-agent-folder-action", {
								detail: {
									action: "move-active",
									provider,
									sessionId: selectedItem.id,
								},
							}),
						),
					section: "session",
				},
				{
					key: "F",
					label: "Remove from folder",
					onSelect: () =>
						window.dispatchEvent(
							new CustomEvent("dashboard-native-agent-folder-action", {
								detail: {
									action: "remove-active",
									provider,
									sessionId: selectedItem.id,
								},
							}),
						),
					section: "session",
				},
				{
					key: "x",
					label: "Move to overview",
					onSelect: () => void handleSetSidebarVisible(selectedItem, false),
					section: "session",
				},
				{
					key: "Esc",
					label: "Focus sidebar",
					onSelect: () =>
						handleDashboardGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL"),
					section: "utility",
				},
				...(selectedItem.url
					? [
							{
								key: shortcutSequence(nativeBrowserShortcut, "b"),
								label: "Toggle native/browser",
								onSelect: () =>
									handleSelectViewMode(
										viewMode === "native" ? "browser" : "native",
									),
								section: "view" as const,
							},
							{
								key: shortcutSequence(nativeSplitShortcut, "s"),
								label: "Toggle split",
								onSelect: () =>
									handleSelectViewMode(
										viewMode === "split" ? "native" : "split",
									),
								section: "view" as const,
							},
							{
								key: "o",
								label: "Open browser view",
								onSelect: () => handleSelectViewMode("browser"),
								section: "view" as const,
							},
							{
								key: "O",
								label: "Open externally",
								onSelect: () => openExternal.mutate(selectedItem.url ?? ""),
								section: "view" as const,
							},
							...(viewMode === "split"
								? [
										{
											key: "w",
											label: "Swap panes",
											onSelect: () => swapNativeSplitPanes(),
											section: "split" as const,
										},
										{
											key: "[",
											label: "Narrow native pane",
											onSelect: () =>
												resizeNativeSplitPane(-NATIVE_AGENT_SPLIT_RATIO_STEP),
											section: "split" as const,
										},
										{
											key: "]",
											label: "Widen native pane",
											onSelect: () =>
												resizeNativeSplitPane(NATIVE_AGENT_SPLIT_RATIO_STEP),
											section: "split" as const,
										},
										{
											key: "=",
											label: "Equalize panes",
											onSelect: () => equalizeNativeSplitPanes(),
											section: "split" as const,
										},
									]
								: []),
						]
					: []),
			]
		: [];

	return (
		<div
			ref={nativeAgentViewRootRef}
			data-native-agent-view-root=""
			className="flex h-full min-h-0 w-full flex-col bg-background text-foreground"
		>
			<Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
				<DialogContent className="max-w-[420px]">
					<DialogHeader>
						<DialogTitle>Rename session</DialogTitle>
					</DialogHeader>
					<form
						className="flex flex-col gap-3"
						onSubmit={(event) => {
							event.preventDefault();
							void handleRenameSelectedItem();
						}}
					>
						<input
							ref={renameInputRef}
							value={renameDraft}
							onChange={(event) => setRenameDraft(event.target.value)}
							placeholder="Session name"
							className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setRenameDialogOpen(false)}
								className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={setTitle.isPending || !renameDraft.trim()}
								className="h-8 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity disabled:opacity-50"
							>
								Rename
							</button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
			<header
				className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4"
				data-dashboard-action-hint-exclude="true"
				data-native-agent-header="true"
			>
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
					<NativeAgentHeaderViewSwitcher
						nativeBrowserShortcut={nativeBrowserShortcut}
						nativeSplitShortcut={nativeSplitShortcut}
						onSelectViewMode={handleSelectViewMode}
						viewMode={viewMode}
					/>
				)}
				<button
					type="button"
					onClick={() => void invalidateProvider()}
					disabled={!isConfigured}
					title="Refresh"
					data-dashboard-action-hint-exclude="true"
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
					aria-label="Refresh native agent data"
				>
					<LuRefreshCw className="size-4" />
				</button>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => setShowDiagnostics((current) => !current)}
							className={cn(
								"flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
								showDiagnostics && "bg-accent text-foreground",
							)}
							aria-label="Toggle native diagnostics"
							title="Diagnostics"
							data-dashboard-action-hint-exclude="true"
						>
							<LuInfo className="size-4" />
						</button>
					</TooltipTrigger>
					<TooltipContent>Diagnostics</TooltipContent>
				</Tooltip>
				{selectedItem && (
					<NativeAgentHeaderActionsMenu
						isArchiving={isArchiving}
						isStopping={isStopping}
						onArchive={handleArchive}
						onStop={handleStop}
						provider={provider}
						shortcuts={selectedHeaderShortcuts}
					/>
				)}
			</header>

			{showDiagnostics && (
				<section className="shrink-0 border-b border-border bg-muted/15 px-4 py-3">
					<div className="grid gap-4 lg:grid-cols-3">
						<div className="rounded-md border border-border bg-background/60 p-3">
							<div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
								Provider
							</div>
							<DiagnosticsRow label="provider" value={provider} />
							<DiagnosticsRow
								label="credentials"
								value={
									isConfigured
										? `stored (${sourceLabel ?? "unknown"})`
										: "missing"
								}
							/>
							<DiagnosticsRow
								label="mine filter"
								value={nativeAgentMinePolicySummary({
									projectId:
										provider === "capy" ? CAPY_MONOREPO_PROJECT_ID : undefined,
									provider,
									userEmail:
										provider === "capy"
											? CAPY_LOCAL_USER_EMAIL
											: effectiveUserEmail,
								})}
							/>
							<DiagnosticsRow
								label="mine evidence"
								value={selectedItem?.mineEvidence ?? "none selected"}
							/>
							<DiagnosticsRow
								label="vim"
								value={isVimModeEnabled ? "on" : "off"}
							/>
						</div>

						<div className="rounded-md border border-border bg-background/60 p-3">
							<div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
								Freshness
							</div>
							<DiagnosticsRow
								label="health"
								value={
									<span
										className={cn(
											diagnosticsFreshness.tone === "fresh" &&
												"text-emerald-300",
											diagnosticsFreshness.tone === "fetching" &&
												"text-sky-300",
											diagnosticsFreshness.tone === "stale" && "text-amber-300",
											diagnosticsFreshness.tone === "error" && "text-red-300",
										)}
									>
										{diagnosticsFreshness.label}
									</span>
								}
							/>
							<DiagnosticsRow
								label="last poll"
								value={formatNativeAgentDiagnosticsQueryGroup(
									diagnosticsQueries,
								)}
							/>
							<DiagnosticsRow
								label="primary list"
								value={
									provider === "capy"
										? formatNativeAgentDiagnosticsQuery(capyThreadsQuery)
										: formatNativeAgentDiagnosticsQuery(devinSessionsQuery)
								}
							/>
							{provider === "capy" && (
								<DiagnosticsRow
									label="fresh live list"
									value={formatNativeAgentDiagnosticsQuery(
										capyFreshThreadsQuery,
									)}
								/>
							)}
							<DiagnosticsRow
								label="detail"
								value={
									selectedId
										? provider === "capy"
											? formatNativeAgentDiagnosticsQuery(capyThreadQuery)
											: formatNativeAgentDiagnosticsQuery(devinSessionQuery)
										: "none selected"
								}
							/>
							<DiagnosticsRow
								label="messages"
								value={
									selectedId
										? provider === "capy"
											? formatNativeAgentDiagnosticsQuery(capyMessagesQuery)
											: formatNativeAgentDiagnosticsQuery(devinSessionQuery)
										: "none selected"
								}
							/>
						</div>

						<div className="rounded-md border border-border bg-background/60 p-3">
							<div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
								Inclusion
							</div>
							<DiagnosticsRow label="total" value={workspaceItems.length} />
							<DiagnosticsRow
								label="active"
								value={activeWorkspaceItems.length}
							/>
							<DiagnosticsRow
								label="unread"
								value={unreadWorkspaceItems.length}
							/>
							<DiagnosticsRow label="visible filter" value={overviewFilter} />
							<DiagnosticsRow
								label="current"
								value={selectedItem?.id ?? "overview"}
							/>
							<DiagnosticsRow
								label="status"
								value={selectedItem?.status ?? "none"}
							/>
							<DiagnosticsRow
								label="sidebar flags"
								value={
									selectedItem
										? nativeAgentSidebarFlagSummary(selectedItem)
										: "none"
								}
							/>
							<DiagnosticsRow
								label="reason"
								value={
									currentItemDiagnostics.length > 0
										? currentItemDiagnostics.join(", ")
										: "none"
								}
							/>
							{selectedItem?.url && (
								<DiagnosticsRow label="url" value={selectedItem.url} />
							)}
						</div>
					</div>
				</section>
			)}

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
						style={nativePaneStyle}
						className={cn(
							"absolute inset-0 flex min-h-0 flex-col",
							viewMode === "split" &&
								(nativeSplitPlacement === "native-left"
									? "border-r border-border"
									: "border-l border-border"),
							viewMode === "native" || viewMode === "split"
								? "pointer-events-auto opacity-100"
								: "pointer-events-none opacity-0",
						)}
					>
						<div
							ref={messageScrollRef}
							className="min-h-0 flex-1 overflow-y-auto p-4"
						>
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
									ref={composerRef}
									value={messageDraft}
									onChange={(event) => setMessageDraft(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Escape") {
											consumeNativeAgentKeyboardEvent(event);
											event.currentTarget.blur();
											return;
										}
										if (
											event.key === "Enter" &&
											(event.metaKey || event.ctrlKey)
										) {
											consumeNativeAgentKeyboardEvent(event);
											void handleSendMessage();
										}
									}}
									placeholder="Send a follow-up..."
									className="h-20 flex-1 resize-none rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-foreground/40"
								/>
								{isVimModeEnabled && (
									<span className="mt-1 flex h-6 min-w-6 shrink-0 items-center justify-center rounded border border-border/70 bg-background/70 px-1 font-mono text-[10px] text-muted-foreground">
										r
									</span>
								)}
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
							(viewMode === "browser" || viewMode === "split") &&
							nativeBrowserKey === target.key;
						return (
							<div
								key={target.key}
								style={browserPaneStyle}
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
						<div className="flex flex-wrap items-end justify-between gap-3">
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
							<div className="flex min-w-[260px] flex-1 items-center justify-end gap-2">
								<input
									ref={overviewSearchRef}
									value={overviewSearch}
									onChange={(event) => setOverviewSearch(event.target.value)}
									onKeyDown={(event) => {
										if (event.key !== "Escape") return;
										consumeNativeAgentKeyboardEvent(event);
										const result =
											nativeAgentSearchEscapeResult(overviewSearch);
										setOverviewSearch(result.nextSearch);
										if (result.shouldBlur) event.currentTarget.blur();
									}}
									placeholder="Search sessions..."
									className="h-8 min-w-0 max-w-sm flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-foreground/40"
								/>
								{isVimModeEnabled && (
									<span className="rounded border border-border px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
										vim
									</span>
								)}
							</div>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{(
								[
									"all",
									"active",
									"unread",
									"pinned",
									"hidden",
									"finished",
								] as const
							).map((filter) => (
								<button
									key={filter}
									type="button"
									onClick={() => setOverviewFilter(filter)}
									className={cn(
										"rounded-md border px-2 py-1 text-xs capitalize transition-colors",
										overviewFilter === filter
											? "border-foreground/40 bg-accent text-foreground"
											: "border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground",
									)}
								>
									{filter}
								</button>
							))}
						</div>
						{activeWorkspaceItems.length > 0 && (
							<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
								<div className="mb-2 text-xs font-medium text-emerald-200">
									Active now
								</div>
								<div className="flex gap-2 overflow-x-auto pb-1">
									{activeWorkspaceItems.slice(0, 8).map((item) => (
										<button
											key={item.id}
											type="button"
											title={overviewHoverTitle(item)}
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
											className="max-w-64 shrink-0 truncate rounded-md border border-emerald-500/25 bg-background/60 px-2 py-1 text-left text-xs text-emerald-100 hover:bg-emerald-500/10"
										>
											{item.title}
										</button>
									))}
								</div>
							</div>
						)}

						{(provider === "capy"
							? capyThreadsQuery.isLoading
							: devinSessionsQuery.isLoading) && workspaceItems.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
								Loading...
							</div>
						) : (
							<ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
								{filteredWorkspaceItems.map((item) => {
									const statusLabel = nativeAgentStatusBadgeLabel(item.status);
									return (
										<li
											key={item.id}
											draggable
											onDragStart={(event) => {
												event.dataTransfer.setData(
													NATIVE_AGENT_SESSION_DRAG_MIME,
													createNativeAgentSessionDragPayload({
														id: item.id,
														provider,
													}),
												);
												event.dataTransfer.effectAllowed = "move";
											}}
											title={overviewHoverTitle(item)}
											className={cn(
												"group flex min-h-24 flex-col rounded-lg border bg-muted/20 p-3 text-left transition-colors hover:bg-accent/40 hover:text-foreground",
												item.isProviderActive ||
													isNativeAgentLiveStatus(item.status)
													? "border-emerald-500/45 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
													: "border-border",
											)}
										>
											<button
												type="button"
												data-native-agent-overview-card-id={item.id}
												aria-keyshortcuts="Enter o"
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
												className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="flex items-start gap-2">
													<span className="min-w-0 flex-1 truncate text-sm font-medium">
														{item.title}
													</span>
													{item.status && statusLabel && (
														<span
															title={item.status}
															className={cn(
																"inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-[10px] font-medium",
																nativeAgentStatusTone(item.status),
															)}
														>
															{statusLabel}
														</span>
													)}
												</div>
												<div className="mt-2 line-clamp-2 break-all text-xs text-muted-foreground">
													{item.id}
												</div>
												<div
													aria-hidden="true"
													className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
												>
													<LuKeyRound className="size-3 shrink-0" />
													<span className="truncate">
														Enter opens, p pins, x hides
													</span>
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
													aria-keyshortcuts="x"
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
														aria-keyshortcuts="p"
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
										</li>
									);
								})}
								{filteredWorkspaceItems.length === 0 && (
									<li className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
										No matching{" "}
										{nativeAgentConversationLabel(provider, { plural: true })}{" "}
										yet.
									</li>
								)}
							</ul>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
