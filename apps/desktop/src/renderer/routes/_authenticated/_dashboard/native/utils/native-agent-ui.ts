export type NativeAgentProvider = "capy" | "devin";

export type NativeAgentRoleKind = "assistant" | "system" | "user";

export interface NativeAgentRoleView {
	isSystem: boolean;
	isUser: boolean;
	kind: NativeAgentRoleKind;
	label: string;
}

export interface NativeAgentMessageLike {
	createdAt: string | number | null | undefined;
	role?: string | null;
}

export interface NativeAgentProviderConfig {
	agentLabel: string;
	conversationLabel: string;
	conversationLabelPlural: string;
	iconUrl: string;
	id: NativeAgentProvider;
	title: string;
}

export interface NativeAgentKeyboardHint {
	key: string;
	title: string;
}

const NATIVE_AGENT_PROVIDER_CONFIGS = {
	capy: {
		agentLabel: "Capy",
		conversationLabel: "thread",
		conversationLabelPlural: "threads",
		iconUrl: "https://capy.ai/_marketing/favicon/favicon-96x96.png",
		id: "capy",
		title: "Capy",
	},
	devin: {
		agentLabel: "Devin",
		conversationLabel: "session",
		conversationLabelPlural: "sessions",
		iconUrl: "https://app.devin.ai/favicon.ico",
		id: "devin",
		title: "Devin",
	},
} satisfies Record<NativeAgentProvider, NativeAgentProviderConfig>;

const NATIVE_AGENT_OVERVIEW_CARD_KEYBOARD_HINTS = [
	{ key: "Enter", title: "Open" },
	{ key: "r or i", title: "Reply" },
	{ key: "o or b", title: "Open browser" },
	{ key: "p", title: "Pin or unpin" },
	{ key: "m", title: "Move to folder" },
	{ key: "F", title: "Remove from folder" },
	{ key: "e", title: "Rename" },
	{ key: "a or x", title: "Hide from sidebar" },
	{ key: "X", title: "Archive" },
] satisfies NativeAgentKeyboardHint[];

export function nativeAgentProviderConfig(
	provider: NativeAgentProvider,
): NativeAgentProviderConfig {
	return NATIVE_AGENT_PROVIDER_CONFIGS[provider];
}

export function nativeAgentOverviewCardKeyboardHints(): NativeAgentKeyboardHint[] {
	return [...NATIVE_AGENT_OVERVIEW_CARD_KEYBOARD_HINTS];
}

export function nativeAgentProviderTitle(
	provider: NativeAgentProvider,
): string {
	return nativeAgentProviderConfig(provider).title;
}

export function nativeAgentAgentLabel(provider: NativeAgentProvider): string {
	return nativeAgentProviderConfig(provider).agentLabel;
}

export function nativeAgentConversationLabel(
	provider: NativeAgentProvider,
	options: { plural?: boolean } = {},
): string {
	const config = nativeAgentProviderConfig(provider);
	return options.plural
		? config.conversationLabelPlural
		: config.conversationLabel;
}

export function nativeAgentConversationSetLabel(
	provider: NativeAgentProvider,
): string {
	return `${nativeAgentAgentLabel(provider)} ${nativeAgentConversationLabel(provider, { plural: true })}`;
}

export function normalizeNativeAgentRole(
	role: string | null | undefined,
	provider: NativeAgentProvider,
): NativeAgentRoleView {
	const normalized = role?.trim().toLowerCase() ?? "";
	if (
		normalized.includes("system") ||
		normalized === "tool" ||
		normalized === "event"
	) {
		return { isSystem: true, isUser: false, kind: "system", label: "System" };
	}
	if (
		normalized.includes("user") ||
		normalized.includes("human") ||
		normalized.includes("requester") ||
		normalized.includes("customer") ||
		normalized === "initial_user_message"
	) {
		return { isSystem: false, isUser: true, kind: "user", label: "You" };
	}
	return {
		isSystem: false,
		isUser: false,
		kind: "assistant",
		label: nativeAgentAgentLabel(provider),
	};
}

export function nativeAgentTimestampMs(
	value: string | number | null | undefined,
): number | null {
	if (value == null) return null;
	const date =
		typeof value === "number"
			? new Date(value > 10_000_000_000 ? value : value * 1000)
			: new Date(value);
	const time = date.getTime();
	return Number.isNaN(time) ? null : time;
}

export function formatNativeAgentTimestamp(
	value: string | number | null | undefined,
	options: Intl.DateTimeFormatOptions = {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	},
): string {
	const time = nativeAgentTimestampMs(value);
	if (time == null) return "";
	return new Intl.DateTimeFormat(undefined, options).format(new Date(time));
}

export function nativeAgentStatusTone(status: string | null): string {
	const normalized = status?.toLowerCase() ?? "";
	if (
		["running", "active", "working", "queued", "resuming", "claimed"].includes(
			normalized,
		)
	) {
		return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
	}
	if (["ready", "idle", "completed"].includes(normalized)) {
		return "border-cyan-400/35 bg-cyan-500/15 text-cyan-200";
	}
	if (["waiting", "blocked", "suspended"].includes(normalized)) {
		return "border-amber-400/35 bg-amber-500/15 text-amber-200";
	}
	if (["finished", "exit", "done"].includes(normalized)) {
		return "border-violet-400/35 bg-violet-500/15 text-violet-200";
	}
	if (["archived"].includes(normalized)) {
		return "border-border bg-muted/80 text-muted-foreground";
	}
	if (["error", "expired"].includes(normalized)) {
		return "border-red-400/35 bg-red-500/15 text-red-200";
	}
	return "border-border bg-background text-muted-foreground";
}

export function nativeAgentStatusBadgeLabel(status: string | null): string {
	const normalized = status?.trim().toLowerCase() ?? "";
	if (!normalized) return "";
	const labels: Record<string, string> = {
		active: "active",
		archived: "arch",
		blocked: "block",
		claimed: "live",
		completed: "done",
		done: "done",
		error: "error",
		exit: "done",
		expired: "error",
		finished: "done",
		idle: "idle",
		new: "new",
		queued: "queue",
		ready: "ready",
		resuming: "resume",
		running: "run",
		suspended: "suspend",
		waiting: "wait",
		working: "work",
	};
	return (
		labels[normalized] ?? normalized.replaceAll("_", " ").slice(0, 8).trim()
	);
}

export function nativeAgentStatusDotTone(status: string | null): string {
	const normalized = status?.toLowerCase() ?? "";
	if (
		["running", "active", "working", "queued", "resuming", "claimed"].includes(
			normalized,
		)
	) {
		return "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.75)]";
	}
	if (["ready", "idle", "completed"].includes(normalized)) {
		return "bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.65)]";
	}
	if (["waiting", "blocked", "suspended"].includes(normalized)) {
		return "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.7)]";
	}
	if (["finished", "exit", "done"].includes(normalized)) {
		return "bg-violet-300";
	}
	if (["error", "expired"].includes(normalized)) {
		return "bg-red-300 shadow-[0_0_8px_rgba(252,165,165,0.7)]";
	}
	return "bg-muted-foreground/50";
}

export function isNativeAgentLiveStatus(status: string | null): boolean {
	const normalized = status?.toLowerCase() ?? "";
	return [
		"active",
		"blocked",
		"claimed",
		"new",
		"queued",
		"resuming",
		"running",
		"suspended",
		"waiting",
		"working",
	].includes(normalized);
}

export function isFreshNativeAgentResponse(
	item: { latestMessage?: NativeAgentMessageLike | null },
	provider: NativeAgentProvider,
): boolean {
	const latestTime = nativeAgentTimestampMs(item.latestMessage?.createdAt);
	if (
		latestTime == null ||
		normalizeNativeAgentRole(item.latestMessage?.role, provider).isUser
	) {
		return false;
	}
	return Date.now() - latestTime < 10 * 60 * 1000;
}
