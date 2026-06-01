import fs from "node:fs/promises";
import { join } from "node:path";
import { decrypt, encrypt } from "lib/trpc/routers/auth/utils/crypto-storage";
import {
	ensureSupersetHomeDirExists,
	SUPERSET_HOME_DIR,
	SUPERSET_SENSITIVE_FILE_MODE,
} from "main/lib/app-environment";

export type NativeAgentProvider = "capy" | "devin";
export type DevinApiFlavor = "v1" | "v3";

interface StoredNativeAgentCredentials {
	capyApiKey?: string;
	devinApiKey?: string;
	devinApiFlavor?: DevinApiFlavor;
	devinOrgId?: string;
	devinUserEmail?: string;
	updatedAt?: string;
}

export interface EffectiveNativeAgentCredentials {
	capyApiKey: string | null;
	capySource: "stored" | "env" | null;
	devinApiKey: string | null;
	devinApiFlavor: DevinApiFlavor;
	devinOrgId: string | null;
	devinUserEmail: string | null;
	devinSource: "stored" | "env" | null;
}

const CREDENTIALS_FILE = join(
	SUPERSET_HOME_DIR,
	"native-agent-credentials.enc",
);

function normalizeCredential(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function normalizeFlavor(value: string | null | undefined): DevinApiFlavor {
	return value === "v3" ? "v3" : "v1";
}

async function readStoredCredentials(): Promise<StoredNativeAgentCredentials> {
	try {
		const parsed = JSON.parse(decrypt(await fs.readFile(CREDENTIALS_FILE)));
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		return parsed as StoredNativeAgentCredentials;
	} catch {
		return {};
	}
}

async function writeStoredCredentials(
	credentials: StoredNativeAgentCredentials,
): Promise<void> {
	ensureSupersetHomeDirExists();
	await fs.writeFile(CREDENTIALS_FILE, encrypt(JSON.stringify(credentials)), {
		mode: SUPERSET_SENSITIVE_FILE_MODE,
	});
	await fs
		.chmod(CREDENTIALS_FILE, SUPERSET_SENSITIVE_FILE_MODE)
		.catch(() => {});
}

export async function getEffectiveNativeAgentCredentials(): Promise<EffectiveNativeAgentCredentials> {
	const stored = await readStoredCredentials();
	const storedCapy = normalizeCredential(stored.capyApiKey);
	const envCapy = normalizeCredential(process.env.CLANKEE_CAPY_API_KEY);
	const storedDevin = normalizeCredential(stored.devinApiKey);
	const envDevin = normalizeCredential(process.env.CLANKEE_DEVIN_API_KEY);
	const storedOrg = normalizeCredential(stored.devinOrgId);
	const envOrg = normalizeCredential(process.env.CLANKEE_DEVIN_ORG_ID);
	const storedUserEmail = normalizeCredential(stored.devinUserEmail);
	const devinFlavor = normalizeFlavor(
		stored.devinApiFlavor ?? process.env.CLANKEE_DEVIN_API_FLAVOR,
	);

	return {
		capyApiKey: storedCapy ?? envCapy,
		capySource: storedCapy ? "stored" : envCapy ? "env" : null,
		devinApiKey: storedDevin ?? envDevin,
		devinApiFlavor: devinFlavor,
		devinOrgId: storedOrg ?? envOrg,
		devinUserEmail: storedUserEmail,
		devinSource: storedDevin ? "stored" : envDevin ? "env" : null,
	};
}

export async function getNativeAgentCredentialStatus() {
	const credentials = await getEffectiveNativeAgentCredentials();
	return {
		capy: {
			configured: credentials.capyApiKey != null,
			source: credentials.capySource,
		},
		devin: {
			configured: credentials.devinApiKey != null,
			source: credentials.devinSource,
			flavor: credentials.devinApiFlavor,
			orgConfigured: credentials.devinOrgId != null,
			userEmail: credentials.devinUserEmail,
		},
	};
}

export async function saveNativeAgentCredentials(input: {
	capyApiKey?: string | null;
	devinApiKey?: string | null;
	devinApiFlavor?: DevinApiFlavor;
	devinOrgId?: string | null;
	devinUserEmail?: string | null;
}): Promise<void> {
	const existing = await readStoredCredentials();
	const next: StoredNativeAgentCredentials = {
		...existing,
		updatedAt: new Date().toISOString(),
	};

	if (input.capyApiKey !== undefined) {
		const value = normalizeCredential(input.capyApiKey);
		if (value) next.capyApiKey = value;
	}
	if (input.devinApiKey !== undefined) {
		const value = normalizeCredential(input.devinApiKey);
		if (value) next.devinApiKey = value;
	}
	if (input.devinApiFlavor !== undefined) {
		next.devinApiFlavor = input.devinApiFlavor;
	}
	if (input.devinOrgId !== undefined) {
		const value = normalizeCredential(input.devinOrgId);
		if (value) {
			next.devinOrgId = value;
		} else {
			delete next.devinOrgId;
		}
	}
	if (input.devinUserEmail !== undefined) {
		const value = normalizeCredential(input.devinUserEmail);
		if (value) {
			next.devinUserEmail = value;
		} else {
			delete next.devinUserEmail;
		}
	}

	await writeStoredCredentials(next);
}

export async function deleteNativeAgentCredential(
	provider: NativeAgentProvider,
): Promise<void> {
	const existing = await readStoredCredentials();
	const next: StoredNativeAgentCredentials = {
		...existing,
		updatedAt: new Date().toISOString(),
	};
	if (provider === "capy") {
		delete next.capyApiKey;
	} else {
		delete next.devinApiKey;
		delete next.devinOrgId;
		delete next.devinUserEmail;
	}
	await writeStoredCredentials(next);
}
