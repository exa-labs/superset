export const AUTH_FETCH_TIMEOUT_MS = 4_000;

export type FetchImpl = (
	input: Parameters<typeof fetch>[0],
	init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

type CreateTimeoutFetchOptions = {
	timeoutMs?: number;
	fetchImpl?: FetchImpl;
};

function createTimeoutReason(timeoutMs: number): Error | DOMException {
	const message = `Auth request timed out after ${timeoutMs}ms`;
	if (typeof DOMException === "undefined") {
		return new Error(message);
	}
	return new DOMException(message, "TimeoutError");
}

export function createTimeoutFetch({
	timeoutMs = AUTH_FETCH_TIMEOUT_MS,
	fetchImpl = fetch,
}: CreateTimeoutFetchOptions = {}): FetchImpl {
	return async (input, init) => {
		const controller = new AbortController();
		const upstreamSignal =
			init?.signal ?? (input instanceof Request ? input.signal : undefined);
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const abortFromUpstream = () => {
			if (!controller.signal.aborted) {
				controller.abort(upstreamSignal?.reason);
			}
		};

		if (upstreamSignal?.aborted) {
			abortFromUpstream();
		} else {
			upstreamSignal?.addEventListener("abort", abortFromUpstream, {
				once: true,
			});
		}

		timeoutId = setTimeout(() => {
			if (!controller.signal.aborted) {
				controller.abort(createTimeoutReason(timeoutMs));
			}
		}, timeoutMs);

		try {
			return await fetchImpl(input, { ...init, signal: controller.signal });
		} finally {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			upstreamSignal?.removeEventListener("abort", abortFromUpstream);
		}
	};
}

export const authFetchWithTimeout = createTimeoutFetch();
