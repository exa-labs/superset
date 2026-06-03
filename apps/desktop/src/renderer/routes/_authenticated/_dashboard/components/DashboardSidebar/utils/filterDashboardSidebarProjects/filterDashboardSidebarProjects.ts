import type {
	DashboardSidebarProject,
	DashboardSidebarProjectChild,
	DashboardSidebarSection,
	DashboardSidebarWorkspace,
} from "../../types";

function normalizedTokens(query: string): string[] {
	return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function matchesTokens(
	tokens: string[],
	values: Array<string | null>,
): boolean {
	if (tokens.length === 0) return true;
	const haystack = values
		.filter((value): value is string => value != null && value.length > 0)
		.join(" ")
		.toLowerCase();
	return tokens.every((token) => haystack.includes(token));
}

function workspaceMatchesSearch(
	workspace: DashboardSidebarWorkspace,
	tokens: string[],
): boolean {
	return matchesTokens(tokens, [
		workspace.name,
		workspace.branch,
		workspace.id,
		workspace.repoUrl,
		workspace.previewUrl,
		workspace.taskId,
		workspace.pullRequest?.title ?? null,
		workspace.pullRequest ? String(workspace.pullRequest.number) : null,
	]);
}

function sectionMatchesSearch(
	section: DashboardSidebarSection,
	tokens: string[],
): boolean {
	return matchesTokens(tokens, [section.name, section.id]);
}

function projectMatchesSearch(
	project: DashboardSidebarProject,
	tokens: string[],
): boolean {
	return matchesTokens(tokens, [
		project.name,
		project.slug,
		project.githubOwner,
		project.githubRepoName,
		project.id,
	]);
}

function forceSectionOpen(
	section: DashboardSidebarSection,
): DashboardSidebarSection {
	return { ...section, isCollapsed: false };
}

function forceProjectOpen(
	project: DashboardSidebarProject,
): DashboardSidebarProject {
	return {
		...project,
		isCollapsed: false,
		children: project.children.map((child) =>
			child.type === "section"
				? { type: "section", section: forceSectionOpen(child.section) }
				: child,
		),
	};
}

function filterProjectChild(
	child: DashboardSidebarProjectChild,
	tokens: string[],
): DashboardSidebarProjectChild | null {
	if (child.type === "workspace") {
		return workspaceMatchesSearch(child.workspace, tokens) ? child : null;
	}

	const { section } = child;
	if (sectionMatchesSearch(section, tokens)) {
		return { type: "section", section: forceSectionOpen(section) };
	}

	const workspaces = section.workspaces.filter((workspace) =>
		workspaceMatchesSearch(workspace, tokens),
	);
	if (workspaces.length === 0) return null;

	return {
		type: "section",
		section: forceSectionOpen({ ...section, workspaces }),
	};
}

export function filterDashboardSidebarProjects(
	projects: DashboardSidebarProject[],
	query: string,
): DashboardSidebarProject[] {
	const tokens = normalizedTokens(query);
	if (tokens.length === 0) return projects;

	return projects.flatMap((project) => {
		if (projectMatchesSearch(project, tokens))
			return [forceProjectOpen(project)];

		const children = project.children
			.map((child) => filterProjectChild(child, tokens))
			.filter((child): child is DashboardSidebarProjectChild => child != null);

		return children.length > 0
			? [{ ...project, isCollapsed: false, children }]
			: [];
	});
}
