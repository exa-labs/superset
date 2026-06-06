import { describe, expect, it } from "bun:test";
import { resolveDashboardViewMruRegistryLabel } from "./dashboard-view-mru-labels";

describe("dashboard view MRU registry labels", () => {
	it("labels pinned web pages from the web page registry", () => {
		expect(resolveDashboardViewMruRegistryLabel("/web/overseer")).toEqual({
			subtitle: "https://overseer.hephaestus.exa.ai/?q=lakee#clusters",
			title: "Overseer",
		});
	});

	it("labels Chrome tabs from browser metadata", () => {
		expect(
			resolveDashboardViewMruRegistryLabel("/web-tabs/tab-1", {
				getWebTab: () => ({
					appId: "chrome",
					browserTitle: "Design VQL node shadowing architecture",
					createdAt: 1,
					faviconUrl: null,
					folderId: "folder-1",
					id: "tab-1",
					isPinned: false,
					isTitleCustomized: false,
					title: "Chrome",
					updatedAt: 2,
					url: "https://capy.ai/project/a275/thread/abc",
				}),
				getWebTabFolder: () => ({
					appId: "chrome",
					createdAt: 1,
					id: "folder-1",
					isCollapsed: false,
					title: "Agents",
					updatedAt: 2,
				}),
			}),
		).toEqual({
			subtitle: "Chrome · Agents · https://capy.ai/project/a275/thread/abc",
			title: "Design VQL node shadowing architecture",
		});
	});

	it("labels visible native sessions from the sidebar row title", () => {
		expect(
			resolveDashboardViewMruRegistryLabel("/native/devin/devin-123", {
				getNativeSessionSidebarTitle: (provider, id) =>
					provider === "devin" && id === "devin-123"
						? "QES dashboard broken panels"
						: null,
			}),
		).toEqual({
			subtitle: "devin-123",
			title: "QES dashboard broken panels",
		});
	});

	it("falls back to provider labels for native sessions without cached titles", () => {
		expect(
			resolveDashboardViewMruRegistryLabel("/native/capy/thread-1"),
		).toEqual({
			subtitle: "thread-1",
			title: "Capy thread",
		});
		expect(resolveDashboardViewMruRegistryLabel("/native/devin")).toEqual({
			subtitle: "Devin sessions",
			title: "Devin",
		});
	});

	it("labels the workspace overview route", () => {
		expect(resolveDashboardViewMruRegistryLabel("/v2-workspaces")).toEqual({
			subtitle: "Dashboard",
			title: "Workspaces",
		});
	});

	it("labels workspace, tasks, automations, and settings routes", () => {
		expect(resolveDashboardViewMruRegistryLabel("/v2-workspace/ws-1")).toEqual({
			subtitle: "ws-1",
			title: "Workspace",
		});
		expect(resolveDashboardViewMruRegistryLabel("/tasks")).toEqual({
			subtitle: "Dashboard",
			title: "Tasks & PRs",
		});
		expect(resolveDashboardViewMruRegistryLabel("/tasks/task-1")).toEqual({
			subtitle: "Task task-1",
			title: "Tasks & PRs",
		});
		expect(resolveDashboardViewMruRegistryLabel("/automations")).toEqual({
			subtitle: "Dashboard",
			title: "Automations",
		});
		expect(resolveDashboardViewMruRegistryLabel("/automations/auto-1")).toEqual(
			{
				subtitle: "Automation auto-1",
				title: "Automations",
			},
		);
		expect(resolveDashboardViewMruRegistryLabel("/settings/keyboard")).toEqual({
			subtitle: "Settings",
			title: "Keyboard settings",
		});
	});

	it("labels quick root terminals by target", () => {
		expect(resolveDashboardViewMruRegistryLabel("/root-terminal/heph")).toEqual(
			{
				subtitle: "Root terminal",
				title: "heph kr9",
			},
		);
	});
});
