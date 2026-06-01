import { describe, expect, test } from "bun:test";
import {
	isFakeIntegrationValue,
	resolveIntegrationPublicApiUrl,
} from "./integration-config";

describe("integration config", () => {
	test("detects local fake credentials", () => {
		expect(isFakeIntegrationValue(undefined)).toBe(true);
		expect(isFakeIntegrationValue("")).toBe(true);
		expect(isFakeIntegrationValue("000000")).toBe(true);
		expect(isFakeIntegrationValue("fake-linear-client-id")).toBe(true);
		expect(isFakeIntegrationValue("real-client-id")).toBe(false);
	});

	test("uses explicit public integration URL when present", () => {
		expect(
			resolveIntegrationPublicApiUrl({
				integrationsPublicApiUrl: "https://callback.example.com",
				nextPublicApiUrl: "http://localhost:3021",
			}),
		).toBe("https://callback.example.com");
	});

	test("falls back to the normal API URL", () => {
		expect(
			resolveIntegrationPublicApiUrl({
				integrationsPublicApiUrl: undefined,
				nextPublicApiUrl: "http://localhost:3021",
			}),
		).toBe("http://localhost:3021");
	});
});
