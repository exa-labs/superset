export class NativeAgentHttpError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(redactNativeAgentSecrets(message));
		this.name = "NativeAgentHttpError";
	}
}

const TOKEN_PATTERNS = [
	/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
	/capy_[A-Za-z0-9._~+/=-]+/g,
	/apk_user_[A-Za-z0-9._~+/=-]+/g,
	/apk_[A-Za-z0-9._~+/=-]+/g,
	/cog_[A-Za-z0-9._~+/=-]+/g,
];

export function redactNativeAgentSecrets(value: string): string {
	return TOKEN_PATTERNS.reduce(
		(current, pattern) => current.replace(pattern, "[redacted]"),
		value,
	);
}

interface NativeAgentFetchJsonOptions {
	baseUrl: string;
	path: string;
	token: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	query?: Record<
		string,
		| string
		| number
		| boolean
		| Array<string | number | boolean>
		| null
		| undefined
	>;
	body?: unknown;
	timeoutMs?: number;
}

function buildUrl({
	baseUrl,
	path,
	query,
}: Pick<NativeAgentFetchJsonOptions, "baseUrl" | "path" | "query">): URL {
	const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value == null || value === "") continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				url.searchParams.append(key, String(item));
			}
			continue;
		}
		url.searchParams.set(key, String(value));
	}
	return url;
}

export async function nativeAgentFetchJson<T>({
	baseUrl,
	body,
	method = "GET",
	path,
	query,
	timeoutMs = 20_000,
	token,
}: NativeAgentFetchJsonOptions): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, timeoutMs);

	try {
		const response = await fetch(buildUrl({ baseUrl, path, query }), {
			method,
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...(body == null ? {} : { "Content-Type": "application/json" }),
			},
			body: body == null ? undefined : JSON.stringify(body),
			signal: controller.signal,
		});
		const text = await response.text();
		const parsed = text ? JSON.parse(text) : null;

		if (!response.ok) {
			throw new NativeAgentHttpError(
				`Provider request failed (${response.status} ${response.statusText}): ${JSON.stringify(parsed)}`,
				response.status,
			);
		}

		return parsed as T;
	} catch (error) {
		if (error instanceof NativeAgentHttpError) throw error;
		if (error instanceof Error && error.name === "AbortError") {
			throw new NativeAgentHttpError("Provider request timed out");
		}
		throw new NativeAgentHttpError(
			error instanceof Error ? error.message : String(error),
		);
	} finally {
		clearTimeout(timeout);
	}
}
