import { describe, expect, test } from "bun:test";
import { createTimeoutFetch, type FetchImpl } from "./auth-fetch";

describe("createTimeoutFetch", () => {
	test("aborts a hung auth request", async () => {
		let observedSignal: AbortSignal | undefined;
		const fetchImpl = ((_input, init) => {
			observedSignal = init?.signal ?? undefined;
			return new Promise<Response>((_resolve, reject) => {
				observedSignal?.addEventListener("abort", () => {
					reject(observedSignal?.reason ?? new Error("aborted"));
				});
			});
		}) satisfies FetchImpl;

		const timeoutFetch = createTimeoutFetch({ timeoutMs: 1, fetchImpl });

		await expect(timeoutFetch("https://example.test")).rejects.toThrow(
			/Auth request timed out/,
		);
		expect(observedSignal?.aborted).toBe(true);
	});

	test("preserves caller aborts", async () => {
		const upstreamController = new AbortController();
		const upstreamReason = new Error("caller aborted");
		const fetchImpl = ((_input, init) => {
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					reject(init.signal?.reason ?? new Error("aborted"));
				});
			});
		}) satisfies FetchImpl;

		const timeoutFetch = createTimeoutFetch({ timeoutMs: 100, fetchImpl });
		const request = timeoutFetch("https://example.test", {
			signal: upstreamController.signal,
		});
		upstreamController.abort(upstreamReason);

		await expect(request).rejects.toBe(upstreamReason);
	});
});
