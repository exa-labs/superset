import { describe, expect, it } from "bun:test";
import {
	createNativeAgentFolder,
	createNativeAgentSessionDragPayload,
	deleteNativeAgentFolder,
	forgetNativeAgentLastFolderId,
	moveNativeAgentSessionToFolder,
	NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY,
	type NativeAgentFolder,
	type NativeAgentLastFolderIds,
	nativeAgentSessionFolderKey,
	normalizeNativeAgentFolderColor,
	normalizeNativeAgentFolders,
	normalizeNativeAgentRecentFolderColors,
	normalizeNativeAgentSessionFolders,
	parseNativeAgentSessionDragPayload,
	readNativeAgentRecentFolderColorsFromLocalStorage,
	rememberNativeAgentLastFolderId,
	rememberNativeAgentRecentFolderColor,
	renameNativeAgentFolder,
	setNativeAgentFolderCollapsed,
	setNativeAgentFolderColor,
	toggleNativeAgentFolderCollapsed,
} from "./native-agent-folders";

describe("native agent folders", () => {
	const baseFolder: NativeAgentFolder = {
		color: "#38bdf8",
		createdAt: 1,
		id: "folder-1",
		isCollapsed: false,
		provider: "capy",
		title: "Inbox",
		updatedAt: 1,
	};

	it("uses provider:id keys for session folder assignments", () => {
		expect(nativeAgentSessionFolderKey("devin", "session-1")).toBe(
			"devin:session-1",
		);
	});

	it("serializes and parses native session drag payloads", () => {
		const payload = createNativeAgentSessionDragPayload({
			id: "thread-1",
			provider: "capy",
		});

		expect(parseNativeAgentSessionDragPayload(payload)).toEqual({
			id: "thread-1",
			provider: "capy",
		});
		expect(parseNativeAgentSessionDragPayload("")).toBeNull();
		expect(parseNativeAgentSessionDragPayload("{bad json")).toBeNull();
		expect(
			parseNativeAgentSessionDragPayload(
				JSON.stringify({ id: "thread-1", provider: "slack" }),
			),
		).toBeNull();
	});

	it("creates a persisted folder shape with a default title", () => {
		expect(
			createNativeAgentFolder({
				color: "#F59E0B",
				id: "folder-2",
				now: 10,
				provider: "devin",
				title: "  ",
			}),
		).toEqual({
			color: "#f59e0b",
			createdAt: 10,
			id: "folder-2",
			isCollapsed: false,
			provider: "devin",
			title: "Folder",
			updatedAt: 10,
		});
	});

	it("normalizes folder colors to safe hex values", () => {
		expect(normalizeNativeAgentFolderColor("#ABCDEF")).toBe("#abcdef");
		expect(normalizeNativeAgentFolderColor(" #123456 ")).toBe("#123456");
		expect(normalizeNativeAgentFolderColor("red", "#38bdf8")).toBe("#38bdf8");
		expect(normalizeNativeAgentFolderColor("#123", "#38bdf8")).toBe("#38bdf8");
	});

	it("normalizes and remembers recent custom folder colors", () => {
		expect(
			normalizeNativeAgentRecentFolderColors([
				"#ABCDEF",
				"bad",
				"#abcdef",
				"#123456",
				"#654321",
			]),
		).toEqual(["#abcdef", "#123456", "#654321"]);

		expect(
			rememberNativeAgentRecentFolderColor(
				["#123456", "#abcdef", "#654321"],
				"#ABCDEF",
				2,
			),
		).toEqual(["#abcdef", "#123456"]);
		expect(rememberNativeAgentRecentFolderColor(["#123456"], "bad", 2)).toEqual(
			["#123456"],
		);
	});

	it("reads recent custom folder colors from local storage safely", () => {
		const values: Record<string, string> = {
			[NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY]: JSON.stringify([
				"#ABCDEF",
				"bad",
				"#abcdef",
			]),
		};
		const previous = Object.getOwnPropertyDescriptor(
			globalThis,
			"localStorage",
		);
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: {
				getItem: (key: string) => values[key] ?? null,
			},
		});
		try {
			expect(readNativeAgentRecentFolderColorsFromLocalStorage()).toEqual([
				"#abcdef",
			]);
		} finally {
			if (previous) Object.defineProperty(globalThis, "localStorage", previous);
			else delete (globalThis as { localStorage?: unknown }).localStorage;
		}
	});

	it("normalizes persisted folders and fills missing or invalid colors safely", () => {
		expect(
			normalizeNativeAgentFolders([
				{
					color: "not-a-color",
					createdAt: Number.NaN,
					id: "folder-1",
					isCollapsed: true,
					provider: "capy",
					title: "Inbox",
					updatedAt: Number.NaN,
				},
				{
					id: "not-a-provider",
					provider: "slack",
					title: "Bad",
				},
			]),
		).toEqual([
			{
				color: "#38bdf8",
				createdAt: 0,
				id: "folder-1",
				isCollapsed: true,
				provider: "capy",
				title: "Inbox",
				updatedAt: 0,
			},
		]);
	});

	it("renames, recolors, and toggles folders without mutating other folders", () => {
		const otherFolder: NativeAgentFolder = {
			...baseFolder,
			id: "folder-2",
			title: "Other",
		};
		const renamed = renameNativeAgentFolder([baseFolder, otherFolder], {
			folderId: "folder-1",
			now: 20,
			title: "  Focus  ",
		});
		expect(renamed[0]).toMatchObject({ title: "Focus", updatedAt: 20 });
		expect(renamed[1]).toEqual(otherFolder);

		const recolored = setNativeAgentFolderColor(renamed, {
			color: "#EF4444",
			folderId: "folder-1",
			now: 30,
		});
		expect(recolored[0]).toMatchObject({ color: "#ef4444", updatedAt: 30 });
		expect(
			setNativeAgentFolderColor(recolored, {
				color: "bad-color",
				folderId: "folder-1",
				now: 35,
			})[0],
		).toMatchObject({ color: "#ef4444", updatedAt: 35 });

		const toggled = toggleNativeAgentFolderCollapsed(recolored, {
			folderId: "folder-1",
			now: 40,
		});
		expect(toggled[0]).toMatchObject({
			isCollapsed: true,
			updatedAt: 40,
		});

		const explicitlyExpanded = setNativeAgentFolderCollapsed(toggled, {
			folderId: "folder-1",
			isCollapsed: false,
			now: 50,
		});
		expect(explicitlyExpanded[0]).toMatchObject({
			isCollapsed: false,
			updatedAt: 50,
		});
	});

	it("ignores blank rename input", () => {
		expect(
			renameNativeAgentFolder([baseFolder], {
				folderId: "folder-1",
				now: 20,
				title: " ",
			}),
		).toEqual([baseFolder]);
	});

	it("moves sessions into and out of folders optimistically", () => {
		const assigned = moveNativeAgentSessionToFolder(
			{},
			{ folderId: "folder-1", provider: "capy", sessionId: "thread-1" },
		);
		expect(assigned).toEqual({ "capy:thread-1": "folder-1" });
		expect(
			moveNativeAgentSessionToFolder(assigned, {
				folderId: null,
				provider: "capy",
				sessionId: "thread-1",
			}),
		).toEqual({ "capy:thread-1": null });
	});

	it("normalizes stale session folder assignments back to the overview", () => {
		expect(
			normalizeNativeAgentSessionFolders(
				{
					"capy:thread-1": "capy-folder",
					"capy:thread-2": "deleted-folder",
					"devin:session-1": "capy-folder",
					"devin:session-2": null,
					"slack:bad": "capy-folder",
					"capy:bad-value": 42,
				},
				[{ id: "capy-folder", provider: "capy" }],
			),
		).toEqual({
			"capy:thread-1": "capy-folder",
			"capy:thread-2": null,
			"devin:session-1": null,
			"devin:session-2": null,
		});
		expect(normalizeNativeAgentSessionFolders(null, [])).toEqual({});
	});

	it("tracks the last selected folder for keyboard and command moves", () => {
		const initial: NativeAgentLastFolderIds = {
			capy: "old-capy-folder",
			devin: "devin-folder",
		};
		const remembered = rememberNativeAgentLastFolderId(initial, {
			folderId: "new-capy-folder",
			provider: "capy",
		});

		expect(remembered).toEqual({
			capy: "new-capy-folder",
			devin: "devin-folder",
		});
		expect(
			forgetNativeAgentLastFolderId(remembered, {
				id: "other-folder",
				provider: "capy",
			}),
		).toEqual(remembered);
		expect(
			forgetNativeAgentLastFolderId(remembered, {
				id: "new-capy-folder",
				provider: "capy",
			}),
		).toEqual({ devin: "devin-folder" });
	});

	it("deletes folders and moves their sessions back to the overview", () => {
		expect(
			deleteNativeAgentFolder(
				[baseFolder, { ...baseFolder, id: "folder-2" }],
				{
					"capy:thread-1": "folder-1",
					"capy:thread-2": "folder-2",
				},
				"folder-1",
			),
		).toEqual({
			folders: [{ ...baseFolder, id: "folder-2" }],
			sessionFolders: {
				"capy:thread-1": null,
				"capy:thread-2": "folder-2",
			},
		});
	});
});
