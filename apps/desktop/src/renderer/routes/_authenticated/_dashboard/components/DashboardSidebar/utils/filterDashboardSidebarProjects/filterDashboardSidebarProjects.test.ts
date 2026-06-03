import { describe, expect, it } from "bun:test";
import type {
	DashboardSidebarProject,
	DashboardSidebarWorkspace,
} from "../../types";
import { filterDashboardSidebarProjects } from "./filterDashboardSidebarProjects";

function workspace(
	overrides: Partial<DashboardSidebarWorkspace> & {
		branch: string;
		id: string;
		name: string;
	},
): DashboardSidebarWorkspace {
	const { branch, id, name, ...rest } = overrides;
	return {
		accentColor: null,
		behindCount: null,
		branch,
		branchExistsOnRemote: true,
		createdAt: new Date(0),
		hostId: "host-1",
		hostIsOnline: true,
		hostType: "local-device",
		id,
		name,
		needsRebase: null,
		pendingTransaction: null,
		previewUrl: null,
		projectId: "project-1",
		pullRequest: null,
		repoUrl: null,
		taskId: null,
		type: "worktree",
		updatedAt: new Date(0),
		...rest,
	};
}

const projects: DashboardSidebarProject[] = [
	{
		children: [
			{
				type: "workspace",
				workspace: workspace({
					branch: "main",
					id: "workspace-main",
					name: "main",
				}),
			},
			{
				type: "section",
				section: {
					color: null,
					createdAt: new Date(0),
					id: "section-active",
					isCollapsed: true,
					name: "Active Threads",
					projectId: "project-1",
					tabOrder: 1,
					workspaces: [
						workspace({
							branch: "qes-dashboard",
							id: "workspace-qes",
							name: "QES dashboard panels",
							pullRequest: {
								checks: [],
								checksStatus: "none",
								number: 45452,
								requestedReviewers: [],
								reviewDecision: null,
								state: "open",
								title: "Fix QES panels",
								url: "https://github.com/exa-labs/monorepo/pull/45452",
							},
						}),
						workspace({
							branch: "latency",
							id: "workspace-latency",
							name: "Latency dashboard",
						}),
					],
				},
			},
		],
		createdAt: new Date(0),
		githubOwner: "exa-labs",
		githubRepoName: "monorepo",
		githubRepositoryId: "repo-1",
		iconUrl: null,
		id: "project-1",
		isCollapsed: true,
		name: "Monorepo",
		slug: "monorepo",
		updatedAt: new Date(0),
	},
];

describe("filterDashboardSidebarProjects", () => {
	it("returns original projects when the query is empty", () => {
		expect(filterDashboardSidebarProjects(projects, "   ")).toBe(projects);
	});

	it("keeps matching projects open with all children visible", () => {
		const result = filterDashboardSidebarProjects(projects, "monorepo");

		expect(result).toHaveLength(1);
		expect(result[0].isCollapsed).toBe(false);
		expect(result[0].children).toHaveLength(2);
		expect(
			result[0].children[1]?.type === "section"
				? result[0].children[1].section.isCollapsed
				: true,
		).toBe(false);
	});

	it("keeps only matching section workspaces and opens their parents", () => {
		const result = filterDashboardSidebarProjects(projects, "qes");

		expect(result).toHaveLength(1);
		expect(result[0].isCollapsed).toBe(false);
		expect(result[0].children).toHaveLength(1);
		const child = result[0].children[0];
		expect(child?.type).toBe("section");
		if (child?.type !== "section") return;
		expect(child.section.isCollapsed).toBe(false);
		expect(child.section.workspaces.map((item) => item.id)).toEqual([
			"workspace-qes",
		]);
	});

	it("matches pull request numbers and all query tokens", () => {
		const result = filterDashboardSidebarProjects(projects, "45452 panels");

		expect(result).toHaveLength(1);
		const child = result[0].children[0];
		expect(child?.type).toBe("section");
		if (child?.type !== "section") return;
		expect(child.section.workspaces.map((item) => item.id)).toEqual([
			"workspace-qes",
		]);
	});
});
