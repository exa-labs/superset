import { describe, expect, test } from "bun:test";
import {
	getShellPreloadCollections,
	SHELL_PRELOAD_COLLECTION_NAMES,
} from "./preloadPolicy";

describe("collection preload policy", () => {
	test("preloads only shell-critical Electric collections", () => {
		expect(SHELL_PRELOAD_COLLECTION_NAMES).toEqual([
			"v2Hosts",
			"v2UsersHosts",
			"v2Projects",
			"v2Workspaces",
			"agentCommands",
		]);
	});

	test("returns collections in policy order", () => {
		const collections = Object.fromEntries(
			SHELL_PRELOAD_COLLECTION_NAMES.map((name) => [
				name,
				{ id: name, preload: () => undefined },
			]),
		) as unknown as Parameters<typeof getShellPreloadCollections>[0];
		const selected = getShellPreloadCollections(collections) as Array<{
			id: string;
		}>;

		expect(selected.map((item) => item.id)).toEqual([
			...SHELL_PRELOAD_COLLECTION_NAMES,
		]);
	});
});
