export interface NativeAgentListRow {
	id: string;
}

export type MergedNativeAgentListRow<T extends NativeAgentListRow> = T & {
	isProviderActive: boolean;
};

export interface NativeAgentMetadataLike {
	hiddenFromSidebar?: boolean | null;
	pinned?: boolean | null;
	title?: string | null;
	titleOverride?: string | null;
}

export interface NativeAgentOptimisticMetadata {
	hidden?: boolean;
	pinned?: boolean;
	titleOverride?: string | null;
}

export type NativeAgentOptimisticMetadataMap = Record<
	string,
	NativeAgentOptimisticMetadata
>;

export type NativeAgentOptimisticProvider = "capy" | "devin";

export interface NativeAgentSidebarListRow {
	id: string;
	isProviderActive?: boolean;
	latestMessage?: {
		body?: string | null;
	} | null;
	sidebarHidden?: boolean;
	sidebarPinned?: boolean;
	status?: string | null;
	subtitle?: string | null;
	title?: string | null;
	updatedAt?: number | string | null;
}

export interface SelectNativeAgentSidebarItemsInput<
	T extends NativeAgentSidebarListRow,
> {
	activeId?: string | null;
	isLiveStatus: (status: string | null) => boolean;
	isUnread: (item: T) => boolean;
	maxPriorityItems?: number;
	recentFallbackWhenEmpty?: number;
	recentFallbackWhenPriorityExists?: number;
	searchQuery?: string;
}

export function nativeAgentMetadataKey(
	provider: NativeAgentOptimisticProvider,
	id: string,
): string {
	return `${provider}:${id}`;
}

export function applyNativeAgentOptimisticPinned(
	current: NativeAgentOptimisticMetadataMap,
	input: {
		id: string;
		pinned: boolean;
		provider: NativeAgentOptimisticProvider;
	},
): NativeAgentOptimisticMetadataMap {
	const key = nativeAgentMetadataKey(input.provider, input.id);
	return {
		...current,
		[key]: { ...current[key], hidden: false, pinned: input.pinned },
	};
}

export function applyNativeAgentOptimisticSidebarVisible(
	current: NativeAgentOptimisticMetadataMap,
	input: {
		id: string;
		provider: NativeAgentOptimisticProvider;
		visible: boolean;
	},
): NativeAgentOptimisticMetadataMap {
	const key = nativeAgentMetadataKey(input.provider, input.id);
	return {
		...current,
		[key]: {
			...current[key],
			hidden: !input.visible,
			pinned: input.visible,
		},
	};
}

export function restoreNativeAgentOptimisticSidebarState(
	current: NativeAgentOptimisticMetadataMap,
	input: {
		id: string;
		provider: NativeAgentOptimisticProvider;
		sidebarHidden?: boolean;
		sidebarPinned?: boolean;
	},
): NativeAgentOptimisticMetadataMap {
	const key = nativeAgentMetadataKey(input.provider, input.id);
	return {
		...current,
		[key]: {
			...current[key],
			hidden: input.sidebarHidden,
			pinned: input.sidebarPinned,
		},
	};
}

export function applyNativeAgentOptimisticTitle(
	current: NativeAgentOptimisticMetadataMap,
	input: {
		id: string;
		provider: NativeAgentOptimisticProvider;
		titleOverride: string | null;
	},
): NativeAgentOptimisticMetadataMap {
	const key = nativeAgentMetadataKey(input.provider, input.id);
	return {
		...current,
		[key]: { ...current[key], titleOverride: input.titleOverride },
	};
}

export function restoreNativeAgentOptimisticTitle(
	current: NativeAgentOptimisticMetadataMap,
	input: {
		id: string;
		provider: NativeAgentOptimisticProvider;
		titleOverride?: string | null;
	},
): NativeAgentOptimisticMetadataMap {
	const key = nativeAgentMetadataKey(input.provider, input.id);
	return {
		...current,
		[key]: { ...current[key], titleOverride: input.titleOverride },
	};
}

export function nativeAgentDisplayTitle(input: {
	fallbackTitle: string;
	metadata?: NativeAgentMetadataLike | null;
	optimistic?: NativeAgentOptimisticMetadata | null;
	providerTitle?: string | null;
}): string {
	const optimisticTitle = input.optimistic?.titleOverride?.trim();
	if (optimisticTitle) return optimisticTitle;
	const metadataOverride = input.metadata?.titleOverride?.trim();
	if (metadataOverride) return metadataOverride;
	const providerTitle = input.providerTitle?.trim();
	if (providerTitle) return providerTitle;
	const metadataTitle = input.metadata?.title?.trim();
	if (metadataTitle) return metadataTitle;
	return input.fallbackTitle;
}

export function mergeActiveNativeAgentRows<T extends NativeAgentListRow>(
	rows: readonly T[],
	activeRows: readonly T[],
): MergedNativeAgentListRow<T>[] {
	const merged = new Map<string, MergedNativeAgentListRow<T>>();

	for (const row of rows) {
		merged.set(row.id, { ...row, isProviderActive: false });
	}
	for (const row of activeRows) {
		merged.set(row.id, { ...row, isProviderActive: true });
	}

	return [...merged.values()];
}

export function selectNativeAgentProviderActiveRows<T>(
	rows: readonly T[],
	input: {
		getStatus: (row: T) => string | null | undefined;
		isLiveStatus: (status: string | null) => boolean;
	},
): T[] {
	return rows.filter((row) => input.isLiveStatus(input.getStatus(row) ?? null));
}

export function resolveNativeAgentSidebarState(input: {
	metadata?: NativeAgentMetadataLike | null;
	optimistic?: NativeAgentOptimisticMetadata;
}): { sidebarHidden: boolean; sidebarPinned: boolean } {
	return {
		sidebarHidden:
			input.optimistic?.hidden ?? input.metadata?.hiddenFromSidebar === true,
		sidebarPinned: input.optimistic?.pinned ?? input.metadata?.pinned === true,
	};
}

function timestampMs(value: number | string | null | undefined): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return 0;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function nativeAgentSidebarSearchTokens(query: string | undefined): string[] {
	return query?.toLowerCase().trim().split(/\s+/).filter(Boolean) ?? [];
}

function nativeAgentSidebarSearchText(item: NativeAgentSidebarListRow): string {
	return [
		item.id,
		item.title,
		item.subtitle,
		item.status,
		item.latestMessage?.body,
	]
		.filter((value): value is string => value != null && value.length > 0)
		.join(" ")
		.toLowerCase();
}

function nativeAgentSidebarItemMatchesSearch(
	item: NativeAgentSidebarListRow,
	tokens: string[],
): boolean {
	if (tokens.length === 0) return true;
	const text = nativeAgentSidebarSearchText(item);
	return tokens.every((token) => text.includes(token));
}

export function selectNativeAgentSidebarItems<
	T extends NativeAgentSidebarListRow,
>(items: readonly T[], input: SelectNativeAgentSidebarItemsInput<T>): T[] {
	const maxPriorityItems = input.maxPriorityItems ?? 10;
	const recentFallbackWhenEmpty = input.recentFallbackWhenEmpty ?? 1;
	const recentFallbackWhenPriorityExists =
		input.recentFallbackWhenPriorityExists ?? 1;
	const searchTokens = nativeAgentSidebarSearchTokens(input.searchQuery);
	const visibleItems = items
		.filter((item) => item.sidebarHidden !== true)
		.toSorted((a, b) => {
			const aUnread = input.isUnread(a);
			const bUnread = input.isUnread(b);
			if (aUnread !== bUnread) return aUnread ? -1 : 1;
			const aPinned = a.sidebarPinned === true;
			const bPinned = b.sidebarPinned === true;
			if (aPinned !== bPinned) return aPinned ? -1 : 1;
			const aLive = a.isProviderActive || input.isLiveStatus(a.status ?? null);
			const bLive = b.isProviderActive || input.isLiveStatus(b.status ?? null);
			if (aLive !== bLive) return aLive ? -1 : 1;
			return timestampMs(b.updatedAt) - timestampMs(a.updatedAt);
		});

	if (searchTokens.length > 0) {
		return visibleItems.filter((item) =>
			nativeAgentSidebarItemMatchesSearch(item, searchTokens),
		);
	}

	const activeItem = visibleItems.find((item) => item.id === input.activeId);
	const pinnedItems = visibleItems.filter(
		(item) => item.sidebarPinned === true,
	);
	const unreadItems = visibleItems.filter(input.isUnread);
	const liveItems = visibleItems.filter(
		(item) => item.isProviderActive || input.isLiveStatus(item.status ?? null),
	);
	const selectedItems: T[] = [];
	for (const item of [...unreadItems, ...pinnedItems, ...liveItems]) {
		if (selectedItems.length >= maxPriorityItems) break;
		if (!selectedItems.some((candidate) => candidate.id === item.id)) {
			selectedItems.push(item);
		}
	}
	if (activeItem && !selectedItems.some((item) => item.id === activeItem.id)) {
		selectedItems.push(activeItem);
	}

	const recentFallbackLimit =
		selectedItems.length === 0
			? recentFallbackWhenEmpty
			: recentFallbackWhenPriorityExists;
	let fallbackCount = 0;
	for (const item of visibleItems) {
		if (fallbackCount >= recentFallbackLimit) break;
		if (!selectedItems.some((candidate) => candidate.id === item.id)) {
			selectedItems.push(item);
			fallbackCount += 1;
		}
	}

	return selectedItems;
}

export function selectNativeAgentIndexedShortcutItem<
	T extends NativeAgentSidebarListRow,
>(
	items: readonly T[],
	input: SelectNativeAgentSidebarItemsInput<T> & {
		index: number;
	},
): T | null {
	if (!Number.isInteger(input.index) || input.index < 0) return null;
	const selectedItems = selectNativeAgentSidebarItems(items, input);
	return selectedItems[input.index] ?? null;
}

export function nativeAgentSidebarInclusionReasons<
	T extends NativeAgentSidebarListRow,
>(
	item: T,
	input: {
		activeId?: string | null;
		isLiveStatus: (status: string | null) => boolean;
		isUnread: (item: T) => boolean;
	},
): string[] {
	const reasons: string[] = [];
	if (item.sidebarHidden === true) reasons.push("hidden-from-sidebar");
	if (item.id === input.activeId) reasons.push("active-route");
	if (item.sidebarPinned === true) reasons.push("pinned");
	if (input.isUnread(item)) reasons.push("unread-agent-reply");
	if (item.isProviderActive) reasons.push("active-api-row");
	if (input.isLiveStatus(item.status ?? null)) reasons.push("status-live");
	if (reasons.length === 0) reasons.push("recent-fallback");
	return reasons;
}
