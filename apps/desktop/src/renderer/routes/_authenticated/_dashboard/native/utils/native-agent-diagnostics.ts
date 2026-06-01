export interface NativeAgentDiagnosticsQuery {
	dataUpdatedAt: number;
	error?: unknown;
	isFetching: boolean;
}

export type NativeAgentDiagnosticsFreshnessTone =
	| "error"
	| "fetching"
	| "fresh"
	| "stale"
	| "unknown";

export interface NativeAgentDiagnosticsFreshnessSummary {
	errorCount: number;
	fetchingCount: number;
	label: string;
	latestUpdatedAt: number;
	tone: NativeAgentDiagnosticsFreshnessTone;
}

export function summarizeNativeAgentDiagnosticsFreshness(
	queries: NativeAgentDiagnosticsQuery[],
	{
		now = Date.now(),
		staleAfterMs = 2 * 60_000,
	}: { now?: number; staleAfterMs?: number } = {},
): NativeAgentDiagnosticsFreshnessSummary {
	const latestUpdatedAt = Math.max(
		0,
		...queries.map((query) => query.dataUpdatedAt || 0),
	);
	const fetchingCount = queries.filter((query) => query.isFetching).length;
	const errorCount = queries.filter((query) =>
		errorMessage(query.error),
	).length;
	let tone: NativeAgentDiagnosticsFreshnessTone = "unknown";
	if (errorCount > 0) {
		tone = "error";
	} else if (latestUpdatedAt === 0) {
		tone = fetchingCount > 0 ? "fetching" : "unknown";
	} else if (fetchingCount > 0) {
		tone = "fetching";
	} else if (now - latestUpdatedAt > staleAfterMs) {
		tone = "stale";
	} else {
		tone = "fresh";
	}

	const label =
		tone === "fresh"
			? "fresh"
			: tone === "stale"
				? `stale (${formatNativeAgentDiagnosticsTime(latestUpdatedAt, now)})`
				: tone === "fetching"
					? latestUpdatedAt
						? `fetching (${formatNativeAgentDiagnosticsTime(latestUpdatedAt, now)})`
						: "fetching"
					: tone === "error"
						? `${errorCount} error${errorCount === 1 ? "" : "s"}`
						: "unknown";

	return {
		errorCount,
		fetchingCount,
		label,
		latestUpdatedAt,
		tone,
	};
}

export function formatNativeAgentDiagnosticsTime(
	timestamp: number,
	now = Date.now(),
): string {
	if (!timestamp) return "never";
	const ageMs = Math.max(0, now - timestamp);
	if (ageMs < 1_000) return "now";
	if (ageMs < 60_000) return `${Math.round(ageMs / 1_000)}s ago`;
	if (ageMs < 60 * 60_000) return `${Math.round(ageMs / 60_000)}m ago`;
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(timestamp));
}

export function formatNativeAgentDiagnosticsTimestamp(
	timestamp: number,
): string {
	if (!timestamp) return "never";
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		hour12: false,
		minute: "2-digit",
		second: "2-digit",
	}).format(new Date(timestamp));
}

function errorMessage(error: unknown): string | null {
	if (!error) return null;
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	if (typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string") return message;
	}
	return "error";
}

export function formatNativeAgentDiagnosticsQuery(
	query: NativeAgentDiagnosticsQuery,
	now = Date.now(),
): string {
	const age = formatNativeAgentDiagnosticsTime(query.dataUpdatedAt, now);
	const exact = formatNativeAgentDiagnosticsTimestamp(query.dataUpdatedAt);
	const parts = [exact === "never" ? age : `${age} @ ${exact}`];
	if (query.isFetching) parts.push("fetching");
	const message = errorMessage(query.error);
	if (message) parts.push(`error: ${message}`);
	return parts.join(" / ");
}

export function formatNativeAgentDiagnosticsQueryGroup(
	queries: NativeAgentDiagnosticsQuery[],
	now = Date.now(),
): string {
	if (queries.length === 0) return "never";
	const latestUpdatedAt = Math.max(
		0,
		...queries.map((query) => query.dataUpdatedAt || 0),
	);
	const parts =
		latestUpdatedAt > 0
			? [
					`last ${formatNativeAgentDiagnosticsTime(latestUpdatedAt, now)} @ ${formatNativeAgentDiagnosticsTimestamp(latestUpdatedAt)}`,
				]
			: ["never"];
	const fetchingCount = queries.filter((query) => query.isFetching).length;
	if (fetchingCount > 0) parts.push(`${fetchingCount} fetching`);
	const errorCount = queries.filter((query) =>
		errorMessage(query.error),
	).length;
	if (errorCount > 0)
		parts.push(`${errorCount} error${errorCount === 1 ? "" : "s"}`);
	return parts.join(" / ");
}

export function nativeAgentSidebarFlagSummary(input: {
	sidebarHidden?: boolean;
	sidebarPinned?: boolean;
}): string {
	const flags: string[] = [];
	if (input.sidebarPinned) flags.push("pinned");
	if (input.sidebarHidden) flags.push("hidden");
	return flags.length > 0 ? flags.join(", ") : "auto";
}

export function nativeAgentMinePolicySummary(input: {
	projectId?: string | null;
	provider: "capy" | "devin";
	userEmail?: string | null;
}): string {
	if (input.provider === "capy") {
		const project = input.projectId?.trim() || "project unset";
		const email = input.userEmail?.trim() || "email unset";
		return `${email} creator-only in ${project}`;
	}
	return input.userEmail?.trim()
		? `${input.userEmail.trim()} requesting-user`
		: "requesting-user email unset";
}

export function nativeAgentMineEvidenceSummary(input: {
	createdLocally?: boolean | null;
	ownershipVerified?: boolean | null;
	pinned?: boolean | null;
	provider: "capy" | "devin";
	requestingUserEmail?: string | null;
	userEmail?: string | null;
}): string {
	if (input.createdLocally) return "created locally";
	if (input.ownershipVerified) return "ownership verified";
	if (input.pinned) return "pinned locally";

	if (input.provider === "devin") {
		const expectedEmail = input.userEmail?.trim().toLowerCase();
		const requestingEmail = input.requestingUserEmail?.trim().toLowerCase();
		if (!expectedEmail) return "requesting-user email unset";
		if (!requestingEmail) return "requesting-user missing";
		return requestingEmail === expectedEmail
			? `requesting-user ${requestingEmail}`
			: `requesting-user mismatch ${requestingEmail}`;
	}

	return "Capy creator-only API filter";
}
