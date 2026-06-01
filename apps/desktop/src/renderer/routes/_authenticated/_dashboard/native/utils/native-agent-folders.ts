export type NativeAgentFolderProvider = "capy" | "devin";

export const NATIVE_AGENT_FOLDERS_STORAGE_KEY =
	"dashboard-native-agent-folders-v1";
export const NATIVE_AGENT_LAST_FOLDER_STORAGE_KEY =
	"dashboard-native-agent-last-folder-v1";
export const NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY =
	"dashboard-native-agent-recent-folder-colors-v1";
export const NATIVE_AGENT_SESSION_DRAG_MIME =
	"application/x-native-agent-session";
export const NATIVE_AGENT_RECENT_FOLDER_COLOR_LIMIT = 8;

export const NATIVE_AGENT_FOLDER_COLORS = [
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
] as const;

export interface NativeAgentFolder {
	id: string;
	provider: NativeAgentFolderProvider;
	title: string;
	isCollapsed: boolean;
	color: string;
	createdAt: number;
	updatedAt: number;
}

export type NativeAgentSessionFolders = Record<string, string | null>;
export type NativeAgentLastFolderIds = Partial<
	Record<NativeAgentFolderProvider, string>
>;

export interface NativeAgentSessionDragPayload {
	id: string;
	provider: NativeAgentFolderProvider;
}

export function normalizeNativeAgentFolderColor(
	value: unknown,
	fallback: string = NATIVE_AGENT_FOLDER_COLORS[0],
): string {
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return fallback;
	return trimmed.toLowerCase();
}

export function normalizeNativeAgentRecentFolderColors(
	value: unknown,
	limit = NATIVE_AGENT_RECENT_FOLDER_COLOR_LIMIT,
): string[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const colors: string[] = [];
	for (const item of value) {
		const normalized = normalizeNativeAgentFolderColor(item, "");
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		colors.push(normalized);
		if (colors.length >= limit) break;
	}
	return colors;
}

export function rememberNativeAgentRecentFolderColor(
	current: readonly string[],
	color: unknown,
	limit = NATIVE_AGENT_RECENT_FOLDER_COLOR_LIMIT,
): string[] {
	const normalized = normalizeNativeAgentFolderColor(color, "");
	if (!normalized) {
		return normalizeNativeAgentRecentFolderColors(current, limit);
	}
	return normalizeNativeAgentRecentFolderColors(
		[normalized, ...current],
		limit,
	);
}

export function readNativeAgentRecentFolderColorsFromLocalStorage(): string[] {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(
			NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY,
		);
		if (!raw) return [];
		return normalizeNativeAgentRecentFolderColors(JSON.parse(raw));
	} catch {
		return [];
	}
}

export function nativeAgentSessionFolderKey(
	provider: NativeAgentFolderProvider,
	id: string,
): string {
	return `${provider}:${id}`;
}

export function normalizeNativeAgentSessionFolders(
	value: unknown,
	folders: readonly Pick<NativeAgentFolder, "id" | "provider">[],
): NativeAgentSessionFolders {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const folderProviderById = new Map(
		folders.map((folder) => [folder.id, folder.provider]),
	);
	const next: NativeAgentSessionFolders = {};
	for (const [key, folderId] of Object.entries(
		value as Record<string, unknown>,
	)) {
		const [provider, sessionId] = key.split(":");
		if (
			(provider !== "capy" && provider !== "devin") ||
			!sessionId ||
			(folderId !== null && typeof folderId !== "string")
		) {
			continue;
		}
		if (folderId === null) {
			next[key] = null;
			continue;
		}
		if (folderProviderById.get(folderId) === provider) {
			next[key] = folderId;
		} else {
			next[key] = null;
		}
	}
	return next;
}

export function createNativeAgentSessionDragPayload(
	payload: NativeAgentSessionDragPayload,
): string {
	return JSON.stringify(payload);
}

export function parseNativeAgentSessionDragPayload(
	value: string,
): NativeAgentSessionDragPayload | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as Partial<NativeAgentSessionDragPayload>;
		if (
			(parsed.provider !== "capy" && parsed.provider !== "devin") ||
			typeof parsed.id !== "string" ||
			!parsed.id
		) {
			return null;
		}
		return { id: parsed.id, provider: parsed.provider };
	} catch {
		return null;
	}
}

export function normalizeNativeAgentFolders(
	value: unknown,
): NativeAgentFolder[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((folder): folder is NativeAgentFolder => {
			if (!folder || typeof folder !== "object") return false;
			const record = folder as Record<string, unknown>;
			return (
				(record.provider === "capy" || record.provider === "devin") &&
				typeof record.id === "string" &&
				typeof record.title === "string"
			);
		})
		.map((folder, index) => ({
			...folder,
			color: normalizeNativeAgentFolderColor(
				folder.color,
				NATIVE_AGENT_FOLDER_COLORS[index % NATIVE_AGENT_FOLDER_COLORS.length] ??
					NATIVE_AGENT_FOLDER_COLORS[0],
			),
			createdAt:
				typeof folder.createdAt === "number" &&
				Number.isFinite(folder.createdAt)
					? folder.createdAt
					: 0,
			isCollapsed: folder.isCollapsed === true,
			updatedAt:
				typeof folder.updatedAt === "number" &&
				Number.isFinite(folder.updatedAt)
					? folder.updatedAt
					: 0,
		}));
}

export function readNativeAgentFoldersFromLocalStorage(): NativeAgentFolder[] {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(NATIVE_AGENT_FOLDERS_STORAGE_KEY);
		if (!raw) return [];
		return normalizeNativeAgentFolders(JSON.parse(raw));
	} catch {
		return [];
	}
}

export function createNativeAgentFolder(input: {
	color: string;
	id: string;
	now: number;
	provider: NativeAgentFolderProvider;
	title?: string;
}): NativeAgentFolder {
	return {
		color: normalizeNativeAgentFolderColor(input.color),
		createdAt: input.now,
		id: input.id,
		isCollapsed: false,
		provider: input.provider,
		title: input.title?.trim() || "Folder",
		updatedAt: input.now,
	};
}

export function renameNativeAgentFolder(
	folders: readonly NativeAgentFolder[],
	input: { folderId: string; now: number; title: string },
): NativeAgentFolder[] {
	const title = input.title.trim();
	if (!title) return [...folders];
	return folders.map((folder) =>
		folder.id === input.folderId
			? { ...folder, title, updatedAt: input.now }
			: folder,
	);
}

export function setNativeAgentFolderColor(
	folders: readonly NativeAgentFolder[],
	input: { color: string; folderId: string; now: number },
): NativeAgentFolder[] {
	return folders.map((folder) =>
		folder.id === input.folderId
			? {
					...folder,
					color: normalizeNativeAgentFolderColor(input.color, folder.color),
					updatedAt: input.now,
				}
			: folder,
	);
}

export function toggleNativeAgentFolderCollapsed(
	folders: readonly NativeAgentFolder[],
	input: { folderId: string; now: number },
): NativeAgentFolder[] {
	return folders.map((folder) =>
		folder.id === input.folderId
			? { ...folder, isCollapsed: !folder.isCollapsed, updatedAt: input.now }
			: folder,
	);
}

export function setNativeAgentFolderCollapsed(
	folders: readonly NativeAgentFolder[],
	input: { folderId: string; isCollapsed: boolean; now: number },
): NativeAgentFolder[] {
	return folders.map((folder) =>
		folder.id === input.folderId
			? { ...folder, isCollapsed: input.isCollapsed, updatedAt: input.now }
			: folder,
	);
}

export function deleteNativeAgentFolder(
	folders: readonly NativeAgentFolder[],
	sessionFolders: NativeAgentSessionFolders,
	folderId: string,
): {
	folders: NativeAgentFolder[];
	sessionFolders: NativeAgentSessionFolders;
} {
	const nextSessionFolders = { ...sessionFolders };
	for (const [key, value] of Object.entries(nextSessionFolders)) {
		if (value === folderId) nextSessionFolders[key] = null;
	}
	return {
		folders: folders.filter((folder) => folder.id !== folderId),
		sessionFolders: nextSessionFolders,
	};
}

export function moveNativeAgentSessionToFolder(
	sessionFolders: NativeAgentSessionFolders,
	input: {
		folderId: string | null;
		provider: NativeAgentFolderProvider;
		sessionId: string;
	},
): NativeAgentSessionFolders {
	return {
		...sessionFolders,
		[nativeAgentSessionFolderKey(input.provider, input.sessionId)]:
			input.folderId,
	};
}

export function rememberNativeAgentLastFolderId(
	lastFolderIds: NativeAgentLastFolderIds,
	input: { folderId: string; provider: NativeAgentFolderProvider },
): NativeAgentLastFolderIds {
	return { ...lastFolderIds, [input.provider]: input.folderId };
}

export function forgetNativeAgentLastFolderId(
	lastFolderIds: NativeAgentLastFolderIds,
	folder: Pick<NativeAgentFolder, "id" | "provider">,
): NativeAgentLastFolderIds {
	if (lastFolderIds[folder.provider] !== folder.id) return { ...lastFolderIds };
	const next = { ...lastFolderIds };
	delete next[folder.provider];
	return next;
}
