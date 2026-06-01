import { afterEach, describe, expect, test } from "bun:test";
import { DevinClient } from "./devin-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function mockJsonResponse(body: unknown) {
	globalThis.fetch = (async () =>
		new Response(JSON.stringify(body), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		})) as unknown as typeof fetch;
}

describe("DevinClient", () => {
	test("normalizes v1 app session URLs by stripping Devin API id prefix", async () => {
		mockJsonResponse({
			sessions: [
				{
					session_id: "devin-c431e06a597941e094540708c5c661aa",
					title: "QES dashboard broken panels",
				},
			],
		});

		const client = new DevinClient({
			flavor: "v1",
			orgId: null,
			token: "test-token",
		});

		const result = await client.listSessions();

		expect(result.items[0]?.url).toBe(
			"https://app.devin.ai/sessions/c431e06a597941e094540708c5c661aa",
		);
	});

	test("normalizes v3 app session URLs returned by the API", async () => {
		mockJsonResponse({
			items: [
				{
					session_id: "devin-c431e06a597941e094540708c5c661aa",
					url: "https://app.devin.ai/sessions/devin-c431e06a597941e094540708c5c661aa",
				},
			],
		});

		const client = new DevinClient({
			flavor: "v3",
			orgId: "org-id",
			token: "test-token",
		});

		const result = await client.listSessions();

		expect(result.items[0]?.url).toBe(
			"https://app.devin.ai/sessions/c431e06a597941e094540708c5c661aa",
		);
	});
});
