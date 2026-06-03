import { describe, expect, it } from "bun:test";
import {
	applyNativeAgentOptimisticPinned,
	applyNativeAgentOptimisticSidebarVisible,
	applyNativeAgentOptimisticTitle,
	mergeActiveNativeAgentRows,
	type NativeAgentSidebarListRow,
	nativeAgentDisplayTitle,
	nativeAgentMetadataKey,
	nativeAgentSidebarInclusionReasons,
	resolveNativeAgentSidebarState,
	restoreNativeAgentOptimisticSidebarState,
	restoreNativeAgentOptimisticTitle,
	selectNativeAgentProviderActiveRows,
	selectNativeAgentSidebarItems,
} from "./native-agent-listing";

describe("nativeAgentMetadataKey", () => {
	it("uses the same provider:id shape as persisted native metadata", () => {
		expect(nativeAgentMetadataKey("capy", "thread-1")).toBe("capy:thread-1");
	});
});

describe("native agent optimistic metadata", () => {
	it("pins immediately and forces the row visible", () => {
		expect(
			applyNativeAgentOptimisticPinned(
				{ "capy:thread-1": { hidden: true } },
				{ id: "thread-1", pinned: true, provider: "capy" },
			),
		).toEqual({ "capy:thread-1": { hidden: false, pinned: true } });
	});

	it("unpins without hiding the row", () => {
		expect(
			applyNativeAgentOptimisticPinned(
				{ "devin:session-1": { hidden: false, pinned: true } },
				{ id: "session-1", pinned: false, provider: "devin" },
			),
		).toEqual({ "devin:session-1": { hidden: false, pinned: false } });
	});

	it("hide/show updates both hidden and pinned so sidebar membership changes instantly", () => {
		expect(
			applyNativeAgentOptimisticSidebarVisible(
				{ "capy:thread-1": { hidden: false, pinned: true } },
				{ id: "thread-1", provider: "capy", visible: false },
			),
		).toEqual({ "capy:thread-1": { hidden: true, pinned: false } });
		expect(
			applyNativeAgentOptimisticSidebarVisible(
				{ "capy:thread-1": { hidden: true, pinned: false } },
				{ id: "thread-1", provider: "capy", visible: true },
			),
		).toEqual({ "capy:thread-1": { hidden: false, pinned: true } });
	});

	it("restores the previous sidebar state after a failed mutation", () => {
		expect(
			restoreNativeAgentOptimisticSidebarState(
				{ "devin:session-1": { hidden: false, pinned: true } },
				{
					id: "session-1",
					provider: "devin",
					sidebarHidden: true,
					sidebarPinned: false,
				},
			),
		).toEqual({ "devin:session-1": { hidden: true, pinned: false } });
	});

	it("renames immediately with a local optimistic title override", () => {
		expect(
			applyNativeAgentOptimisticTitle(
				{ "devin:session-1": { pinned: true } },
				{
					id: "session-1",
					provider: "devin",
					titleOverride: "QES follow-up",
				},
			),
		).toEqual({
			"devin:session-1": {
				pinned: true,
				titleOverride: "QES follow-up",
			},
		});
	});

	it("restores the previous title override after a failed rename", () => {
		expect(
			restoreNativeAgentOptimisticTitle(
				{ "capy:thread-1": { titleOverride: "New title" } },
				{
					id: "thread-1",
					provider: "capy",
					titleOverride: "Old title",
				},
			),
		).toEqual({ "capy:thread-1": { titleOverride: "Old title" } });
	});
});

describe("nativeAgentDisplayTitle", () => {
	it("prefers optimistic and persisted local title overrides", () => {
		expect(
			nativeAgentDisplayTitle({
				fallbackTitle: "fallback",
				metadata: { titleOverride: "persisted", title: "last seen" },
				optimistic: { titleOverride: "optimistic" },
				providerTitle: "provider",
			}),
		).toBe("optimistic");
		expect(
			nativeAgentDisplayTitle({
				fallbackTitle: "fallback",
				metadata: { titleOverride: "persisted", title: "last seen" },
				providerTitle: "provider",
			}),
		).toBe("persisted");
	});

	it("falls through provider, metadata, and fallback titles", () => {
		expect(
			nativeAgentDisplayTitle({
				fallbackTitle: "fallback",
				metadata: { title: "last seen" },
				providerTitle: "provider",
			}),
		).toBe("provider");
		expect(
			nativeAgentDisplayTitle({
				fallbackTitle: "fallback",
				metadata: { title: "last seen" },
				providerTitle: "",
			}),
		).toBe("last seen");
		expect(nativeAgentDisplayTitle({ fallbackTitle: "fallback" })).toBe(
			"fallback",
		);
	});
});

describe("mergeActiveNativeAgentRows", () => {
	it("lets active rows win over stale base rows", () => {
		const merged = mergeActiveNativeAgentRows(
			[
				{
					id: "thread-1",
					runState: "ready",
					title: "Stale title",
				},
			],
			[
				{
					id: "thread-1",
					runState: "running",
					title: "Fresh title",
				},
			],
		);

		expect(merged).toEqual([
			{
				id: "thread-1",
				isProviderActive: true,
				runState: "running",
				title: "Fresh title",
			},
		]);
	});

	it("keeps non-active rows while marking only active rows", () => {
		const merged = mergeActiveNativeAgentRows(
			[
				{ id: "thread-1", title: "Base" },
				{ id: "thread-2", title: "Inactive" },
			],
			[{ id: "thread-1", title: "Active" }],
		);

		expect(merged).toEqual([
			{ id: "thread-1", isProviderActive: true, title: "Active" },
			{ id: "thread-2", isProviderActive: false, title: "Inactive" },
		]);
	});
});

describe("selectNativeAgentProviderActiveRows", () => {
	it("keeps only rows with live provider status before active-row merging", () => {
		expect(
			selectNativeAgentProviderActiveRows(
				[
					{ id: "running", runState: "running", status: "active" },
					{ id: "waiting", runState: "waiting", status: "idle" },
					{ id: "ready", runState: "ready", status: "idle" },
					{ id: "blocked", runState: "blocked", status: "idle" },
				],
				{
					getStatus: (row) => row.runState ?? row.status,
					isLiveStatus: (status) =>
						status === "active" ||
						status === "running" ||
						status === "waiting" ||
						status === "blocked",
				},
			).map((row) => row.id),
		).toEqual(["running", "waiting", "blocked"]);
	});
});

describe("resolveNativeAgentSidebarState", () => {
	it("uses persisted metadata when there is no optimistic override", () => {
		expect(
			resolveNativeAgentSidebarState({
				metadata: { hiddenFromSidebar: true, pinned: false },
			}),
		).toEqual({ sidebarHidden: true, sidebarPinned: false });
	});

	it("lets optimistic updates win immediately", () => {
		expect(
			resolveNativeAgentSidebarState({
				metadata: { hiddenFromSidebar: true, pinned: false },
				optimistic: { hidden: false, pinned: true },
			}),
		).toEqual({ sidebarHidden: false, sidebarPinned: true });
	});

	it("defaults missing metadata to visible and unpinned", () => {
		expect(resolveNativeAgentSidebarState({})).toEqual({
			sidebarHidden: false,
			sidebarPinned: false,
		});
	});
});

describe("selectNativeAgentSidebarItems", () => {
	type TestSidebarRow = NativeAgentSidebarListRow & { unread?: boolean };
	const isLiveStatus = (status: string | null | undefined) =>
		status === "running" || status === "working";
	const isUnread = (item: TestSidebarRow) => item.unread === true;

	it("shows only a tiny recent fallback instead of flooding ready rows", () => {
		const items: TestSidebarRow[] = Array.from({ length: 20 }, (_, index) => ({
			id: `ready-${index}`,
			status: "ready",
			updatedAt: 1000 - index,
		}));

		expect(
			selectNativeAgentSidebarItems(items, { isLiveStatus, isUnread }).map(
				(item) => item.id,
			),
		).toEqual(["ready-0"]);
	});

	it("orders pinned, unread, and live rows before the recent fallback", () => {
		const items: TestSidebarRow[] = [
			{ id: "recent", status: "ready", updatedAt: 40 },
			{ id: "live", status: "running", updatedAt: 10 },
			{ id: "unread", status: "ready", unread: true, updatedAt: 20 },
			{ id: "pinned", status: "ready", sidebarPinned: true, updatedAt: 1 },
			{ id: "older", status: "ready", updatedAt: 30 },
		];

		expect(
			selectNativeAgentSidebarItems(items, { isLiveStatus, isUnread }).map(
				(item) => item.id,
			),
		).toEqual(["pinned", "unread", "live", "recent"]);
	});

	it("keeps the active route visible even when it would not be selected", () => {
		const items: TestSidebarRow[] = Array.from({ length: 8 }, (_, index) => ({
			id: `ready-${index}`,
			status: "ready",
			updatedAt: 1000 - index,
		}));

		expect(
			selectNativeAgentSidebarItems(items, {
				activeId: "ready-7",
				isLiveStatus,
				isUnread,
			}).map((item) => item.id),
		).toEqual(["ready-7", "ready-0"]);
	});

	it("never shows hidden rows", () => {
		const items: TestSidebarRow[] = [
			{ id: "hidden-pinned", sidebarHidden: true, sidebarPinned: true },
			{ id: "visible", updatedAt: 1 },
		];

		expect(
			selectNativeAgentSidebarItems(items, {
				activeId: "hidden-pinned",
				isLiveStatus,
				isUnread,
			}).map((item) => item.id),
		).toEqual(["visible"]);
	});

	it("explains why a row is included in the sidebar", () => {
		const item: TestSidebarRow = {
			id: "thread-1",
			isProviderActive: true,
			sidebarPinned: true,
			status: "running",
			unread: true,
		};

		expect(
			nativeAgentSidebarInclusionReasons(item, {
				activeId: "thread-1",
				isLiveStatus,
				isUnread,
			}),
		).toEqual([
			"active-route",
			"pinned",
			"unread-agent-reply",
			"active-api-row",
			"status-live",
		]);
	});

	it("labels ordinary visible rows as the recent fallback", () => {
		expect(
			nativeAgentSidebarInclusionReasons(
				{ id: "thread-1", status: "ready" },
				{ isLiveStatus, isUnread },
			),
		).toEqual(["recent-fallback"]);
	});
});
