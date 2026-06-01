export type NativeAgentOverviewFilter =
	| "active"
	| "all"
	| "finished"
	| "hidden"
	| "pinned"
	| "unread";

export interface NativeAgentOverviewRow {
	id: string;
	isProviderActive?: boolean;
	latestMessage?: {
		body: string;
		createdAt?: number | string | null;
		role?: string | null;
	} | null;
	sidebarHidden?: boolean;
	sidebarPinned?: boolean;
	status?: string | null;
	title: string;
	updatedAt?: number | string | null;
	url?: string | null;
}

function timestampMs(value: number | string | null | undefined): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return 0;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function matchesNativeAgentOverviewSearch(
	item: NativeAgentOverviewRow,
	search: string,
): boolean {
	if (!search) return true;
	return (
		item.title.toLowerCase().includes(search) ||
		item.id.toLowerCase().includes(search) ||
		item.status?.toLowerCase().includes(search) === true
	);
}

export function selectNativeAgentOverviewItems<
	T extends NativeAgentOverviewRow,
>(
	items: readonly T[],
	input: {
		filter: NativeAgentOverviewFilter;
		isFinishedStatus: (status: string | null) => boolean;
		isLiveStatus: (status: string | null) => boolean;
		isUnread: (item: T) => boolean;
		search?: string;
	},
): T[] {
	const search = input.search?.trim().toLowerCase() ?? "";
	const filtered = items.filter((item) => {
		if (!matchesNativeAgentOverviewSearch(item, search)) return false;
		if (input.filter === "all") return true;
		if (input.filter === "active") {
			return item.isProviderActive || input.isLiveStatus(item.status ?? null);
		}
		if (input.filter === "unread") return input.isUnread(item);
		if (input.filter === "pinned") return item.sidebarPinned === true;
		if (input.filter === "hidden") return item.sidebarHidden === true;
		return input.isFinishedStatus(item.status ?? null);
	});

	return filtered.toSorted((a, b) => {
		const aActive = a.isProviderActive || input.isLiveStatus(a.status ?? null);
		const bActive = b.isProviderActive || input.isLiveStatus(b.status ?? null);
		if (aActive !== bActive) return aActive ? -1 : 1;
		const aUnread = input.isUnread(a);
		const bUnread = input.isUnread(b);
		if (aUnread !== bUnread) return aUnread ? -1 : 1;
		if (a.sidebarPinned !== b.sidebarPinned) return a.sidebarPinned ? -1 : 1;
		const timeDelta = timestampMs(b.updatedAt) - timestampMs(a.updatedAt);
		if (timeDelta !== 0) return timeDelta;
		return a.title.localeCompare(b.title);
	});
}

export function nativeAgentOverviewHoverTitle(
	item: NativeAgentOverviewRow,
	input: {
		formatPreview: (body: string, maxLength?: number) => string;
		isUnread?: boolean;
	},
): string {
	const lines = [item.title, item.id];
	if (item.status) lines.push(item.status);
	if (item.url) lines.push(item.url);
	if (input.isUnread) lines.push("unread agent reply");
	if (item.sidebarPinned) lines.push("pinned in sidebar");
	if (item.sidebarHidden) lines.push("hidden from sidebar");
	const preview = item.latestMessage?.body
		? input.formatPreview(item.latestMessage.body, 180)
		: null;
	if (preview) lines.push(`latest: ${preview}`);
	return lines.join("\n");
}
