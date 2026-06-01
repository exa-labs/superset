import fs from "node:fs/promises";
import { join } from "node:path";
import {
	ensureSupersetHomeDirExists,
	SUPERSET_HOME_DIR,
	SUPERSET_SENSITIVE_FILE_MODE,
} from "main/lib/app-environment";
import type { NativeAgentProvider } from "./credentials";

export interface NativeAgentSessionMetadata {
	provider: NativeAgentProvider;
	id: string;
	title?: string | null;
	createdLocally?: boolean;
	pinned?: boolean;
	hiddenFromSidebar?: boolean;
	archivedLocally?: boolean;
	folderId?: string | null;
	createdAt: string;
	updatedAt: string;
}

interface StoredNativeAgentState {
	sessions?: Record<string, NativeAgentSessionMetadata>;
}

const STATE_FILE = join(SUPERSET_HOME_DIR, "native-agent-state.json");

function sessionKey(provider: NativeAgentProvider, id: string): string {
	return `${provider}:${id}`;
}

async function readState(): Promise<StoredNativeAgentState> {
	try {
		const parsed = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		return parsed as StoredNativeAgentState;
	} catch {
		return {};
	}
}

async function writeState(state: StoredNativeAgentState): Promise<void> {
	ensureSupersetHomeDirExists();
	await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), {
		mode: SUPERSET_SENSITIVE_FILE_MODE,
	});
	await fs.chmod(STATE_FILE, SUPERSET_SENSITIVE_FILE_MODE).catch(() => {});
}

export async function getNativeAgentSessionMetadata(
	provider: NativeAgentProvider,
	id: string,
): Promise<NativeAgentSessionMetadata | null> {
	const state = await readState();
	return state.sessions?.[sessionKey(provider, id)] ?? null;
}

export async function listNativeAgentSessionMetadata(
	provider: NativeAgentProvider,
): Promise<Record<string, NativeAgentSessionMetadata>> {
	const sessions = (await readState()).sessions ?? {};
	return Object.fromEntries(
		Object.entries(sessions).filter(
			([, metadata]) => metadata.provider === provider,
		),
	);
}

export async function markNativeAgentSessionSeen(input: {
	provider: NativeAgentProvider;
	id: string;
	title?: string | null;
	createdLocally?: boolean;
	pinned?: boolean;
}): Promise<NativeAgentSessionMetadata> {
	const state = await readState();
	const sessions = state.sessions ?? {};
	const key = sessionKey(input.provider, input.id);
	const existing = sessions[key];
	const now = new Date().toISOString();
	const next: NativeAgentSessionMetadata = {
		provider: input.provider,
		id: input.id,
		title: input.title ?? existing?.title ?? null,
		createdLocally: existing?.createdLocally || input.createdLocally === true,
		pinned: input.pinned ?? existing?.pinned ?? false,
		hiddenFromSidebar:
			input.pinned === true ? false : (existing?.hiddenFromSidebar ?? false),
		archivedLocally: existing?.archivedLocally ?? false,
		folderId: existing?.folderId ?? null,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};
	await writeState({ ...state, sessions: { ...sessions, [key]: next } });
	return next;
}

export async function setNativeAgentSessionSidebarVisible(input: {
	provider: NativeAgentProvider;
	id: string;
	visible: boolean;
	title?: string | null;
}): Promise<NativeAgentSessionMetadata> {
	const existing =
		(await getNativeAgentSessionMetadata(input.provider, input.id)) ??
		(await markNativeAgentSessionSeen({
			id: input.id,
			provider: input.provider,
			title: input.title,
		}));
	const state = await readState();
	const sessions = state.sessions ?? {};
	const next: NativeAgentSessionMetadata = {
		...existing,
		title: input.title ?? existing.title,
		hiddenFromSidebar: !input.visible,
		pinned: input.visible,
		updatedAt: new Date().toISOString(),
	};
	await writeState({
		...state,
		sessions: { ...sessions, [sessionKey(input.provider, input.id)]: next },
	});
	return next;
}

export async function archiveNativeAgentSession(input: {
	provider: NativeAgentProvider;
	id: string;
	archived: boolean;
}): Promise<NativeAgentSessionMetadata> {
	const existing =
		(await getNativeAgentSessionMetadata(input.provider, input.id)) ??
		(await markNativeAgentSessionSeen({
			id: input.id,
			provider: input.provider,
			pinned: true,
		}));
	const state = await readState();
	const sessions = state.sessions ?? {};
	const next: NativeAgentSessionMetadata = {
		...existing,
		archivedLocally: input.archived,
		updatedAt: new Date().toISOString(),
	};
	await writeState({
		...state,
		sessions: { ...sessions, [sessionKey(input.provider, input.id)]: next },
	});
	return next;
}
