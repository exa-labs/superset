import type { Collection } from "@tanstack/react-db";
import type { OrgCollections } from "./collections";

export const SHELL_PRELOAD_COLLECTION_NAMES = [
	"v2Hosts",
	"v2UsersHosts",
	"v2Projects",
	"v2Workspaces",
	"agentCommands",
] as const satisfies readonly (keyof OrgCollections)[];

type ShellPreloadCollectionName =
	(typeof SHELL_PRELOAD_COLLECTION_NAMES)[number];

type ShellPreloadCollections = Pick<OrgCollections, ShellPreloadCollectionName>;

export function getShellPreloadCollections(
	collections: ShellPreloadCollections,
): Collection<object>[] {
	return SHELL_PRELOAD_COLLECTION_NAMES.map(
		(name) => collections[name] as Collection<object>,
	);
}
