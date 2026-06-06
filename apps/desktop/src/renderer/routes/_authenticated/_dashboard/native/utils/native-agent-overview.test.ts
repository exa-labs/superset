import { describe, expect, it } from "bun:test";
import {
	type NativeAgentOverviewRow,
	nativeAgentOverviewFilterLabel,
	nativeAgentOverviewHoverTitle,
	selectNativeAgentOverviewItems,
} from "./native-agent-overview";

describe("selectNativeAgentOverviewItems", () => {
	type TestRow = NativeAgentOverviewRow & { unread?: boolean };
	const isLiveStatus = (status: string | null) =>
		status === "running" || status === "waiting";
	const isFinishedStatus = (status: string | null) =>
		status === "finished" || status === "done";
	const isUnread = (item: TestRow) => item.unread === true;

	const select = (
		items: TestRow[],
		input: {
			filter?: Parameters<
				typeof selectNativeAgentOverviewItems<TestRow>
			>[1]["filter"];
			search?: string;
		} = {},
	) =>
		selectNativeAgentOverviewItems(items, {
			filter: input.filter ?? "all",
			isFinishedStatus,
			isLiveStatus,
			isUnread,
			search: input.search,
		}).map((item) => item.id);

	it("sorts unread, active, pinned, and recent rows before stale rows", () => {
		expect(
			select([
				{ id: "old", status: "ready", title: "Old", updatedAt: 1 },
				{
					id: "pinned",
					sidebarPinned: true,
					status: "ready",
					title: "Pinned",
					updatedAt: 2,
				},
				{
					id: "unread",
					status: "ready",
					title: "Unread",
					unread: true,
					updatedAt: 3,
				},
				{
					id: "active",
					status: "running",
					title: "Active",
					updatedAt: 0,
				},
				{ id: "recent", status: "ready", title: "Recent", updatedAt: 10 },
			]),
		).toEqual(["unread", "active", "pinned", "recent", "old"]);
	});

	it("keeps unread replies ahead of active sessions until acknowledged", () => {
		expect(
			select([
				{
					id: "active",
					status: "running",
					title: "Still running",
					updatedAt: 100,
				},
				{
					id: "reply",
					status: "ready",
					title: "Needs attention",
					unread: true,
					updatedAt: 1,
				},
			]),
		).toEqual(["reply", "active"]);
	});

	it("filters by active, unread, pinned, hidden, finished, and all", () => {
		const items: TestRow[] = [
			{ id: "active", status: "running", title: "Active" },
			{ id: "unread", status: "ready", title: "Unread", unread: true },
			{ id: "pinned", sidebarPinned: true, status: "ready", title: "Pinned" },
			{ id: "hidden", sidebarHidden: true, status: "ready", title: "Hidden" },
			{ id: "finished", status: "finished", title: "Finished" },
		];

		expect(select(items, { filter: "active" })).toEqual(["active"]);
		expect(select(items, { filter: "unread" })).toEqual(["unread"]);
		expect(select(items, { filter: "pinned" })).toEqual(["pinned"]);
		expect(select(items, { filter: "hidden" })).toEqual(["hidden"]);
		expect(select(items, { filter: "finished" })).toEqual(["finished"]);
		expect(select(items, { filter: "all" })).toEqual([
			"unread",
			"active",
			"pinned",
			"finished",
			"hidden",
		]);
	});

	it("labels hidden sidebar items as archived for users", () => {
		expect(nativeAgentOverviewFilterLabel("hidden")).toBe("archived");
		expect(nativeAgentOverviewFilterLabel("active")).toBe("active");
		expect(nativeAgentOverviewFilterLabel("unread")).toBe("unread");
	});

	it("searches title, id, and status case-insensitively", () => {
		const items: TestRow[] = [
			{ id: "devin-123", status: "ready", title: "QES panels" },
			{ id: "capy-456", status: "blocked", title: "Latency work" },
		];

		expect(select(items, { search: "qes" })).toEqual(["devin-123"]);
		expect(select(items, { search: "CAPY" })).toEqual(["capy-456"]);
		expect(select(items, { search: "BLOCKED" })).toEqual(["capy-456"]);
	});

	it("builds dense hover details for overview cards", () => {
		expect(
			nativeAgentOverviewHoverTitle(
				{
					id: "devin-123",
					latestMessage: {
						body: 'Done\n\nATTACHMENT:{"url":"https://app.devin.ai/file.png","fileSize":1}',
					},
					sidebarHidden: true,
					sidebarPinned: true,
					status: "working",
					title: "QES panels",
					url: "https://app.devin.ai/sessions/123",
				},
				{
					formatPreview: (body) =>
						body.replace(/ATTACHMENT:\s*\{[^{}]*\}/g, "[attachment]"),
					isUnread: true,
				},
			),
		).toBe(
			[
				"QES panels",
				"devin-123",
				"working",
				"https://app.devin.ai/sessions/123",
				"unread agent reply",
				"pinned in sidebar",
				"archived from sidebar",
				"latest: Done\n\n[attachment]",
			].join("\n"),
		);
	});
});
