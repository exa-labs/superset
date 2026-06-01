import type { CommandContext, SectionId } from "./types";

const BASE: SectionId[] = ["web", "actions", "navigation"];

export const SECTION_LABELS: Record<SectionId, string> = {
	web: "Control plane",
	workspace: "Workspace actions",
	actions: "Actions",
	navigation: "Navigation",
};

export function resolveSectionOrder(context: CommandContext): SectionId[] {
	const isWorkspace = context.workspace !== null;
	return [...(isWorkspace ? (["workspace"] as SectionId[]) : []), ...BASE];
}
