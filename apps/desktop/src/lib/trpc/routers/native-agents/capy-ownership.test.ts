import { describe, expect, it } from "bun:test";
import {
	CAPY_MINE_DEFAULT_SCAN_PAGE_LIMIT,
	isCapyThreadCreatedByUser,
	selectCapyMetadataBackfillIds,
} from "./index";

describe("isCapyThreadCreatedByUser", () => {
	it("matches explicit creator email", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdByUserEmail: "lakee@exa.ai",
					id: "thread-1",
					projectId: "project",
					title: "Mine",
				},
				"lakee@exa.ai",
			),
		).toBe(true);
	});

	it("does not treat participant comments as ownership", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdAt: "2026-06-01T10:00:00.000Z",
					createdByUserEmail: "friend@exa.ai",
					id: "thread-2",
					participants: [
						{
							firstParticipatedAt: "2026-06-01T10:30:00.000Z",
							userId: "user_3CPOt2D9tBk4PVimoQaDhBkf6Wn",
						},
					],
					projectId: "project",
					title: "Not mine",
				},
				"lakee@exa.ai",
			),
		).toBe(false);
	});

	it("does not treat ambiguous top-level userEmail as creator ownership", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdAt: "2026-06-01T10:00:00.000Z",
					id: "thread-ambiguous-user",
					projectId: "project",
					title: "Commented thread",
					userEmail: "lakee@exa.ai",
				},
				"lakee@exa.ai",
			),
		).toBe(false);
	});

	it("matches creator user ids without using participants", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdByUserId: "user_3CPOt2D9tBk4PVimoQaDhBkf6Wn",
					id: "thread-3",
					projectId: "project",
					title: "Mine by id",
				},
				"lakee@exa.ai",
			),
		).toBe(true);
	});

	it("matches nested creator userEmail fields", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					creator: { userEmail: "lakee@exa.ai" },
					id: "thread-nested-creator",
					projectId: "project",
					title: "Nested mine",
				},
				"lakee@exa.ai",
			),
		).toBe(true);
	});

	it("matches Capy UI threads where Lakee is the starting participant", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdAt: "2026-06-01T10:25:24.000Z",
					id: "thread-4",
					participants: [
						{
							firstParticipatedAt: "2026-06-01T10:25:24.000Z",
							userId: "user_3CPOt2D9tBk4PVimoQaDhBkf6Wn",
							userType: "human",
						},
					],
					projectId: "project",
					title: "Mine from Capy UI",
				},
				"lakee@exa.ai",
			),
		).toBe(true);
	});

	it("fails closed when the starting participant row does not identify a human user", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdAt: "2026-06-01T10:25:24.000Z",
					id: "thread-ambiguous-participant",
					participants: [
						{
							firstParticipatedAt: "2026-06-01T10:25:24.000Z",
							userId: "user_3CPOt2D9tBk4PVimoQaDhBkf6Wn",
						},
					],
					projectId: "project",
					title: "Ambiguous participant",
				},
				"lakee@exa.ai",
			),
		).toBe(false);
	});

	it("does not match shared threads when another human participant is present at creation", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdAt: "2026-06-01T10:25:24.000Z",
					id: "thread-shared-start",
					participants: [
						{
							firstParticipatedAt: "2026-06-01T10:25:24.000Z",
							userId: "user_3CPOt2D9tBk4PVimoQaDhBkf6Wn",
							userType: "human",
						},
						{
							firstParticipatedAt: "2026-06-01T10:25:24.000Z",
							userId: "user_someone_else",
							userType: "human",
						},
					],
					projectId: "project",
					title: "Shared starting participant",
				},
				"lakee@exa.ai",
			),
		).toBe(false);
	});

	it("does not match participant rows joined after thread creation", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdAt: "2026-06-01T10:25:24.000Z",
					id: "thread-5",
					participants: [
						{
							firstParticipatedAt: "2026-06-01T10:26:24.000Z",
							userId: "user_3CPOt2D9tBk4PVimoQaDhBkf6Wn",
							userType: "human",
						},
					],
					projectId: "project",
					title: "Commented later",
				},
				"lakee@exa.ai",
			),
		).toBe(false);
	});

	it("fails closed when creator metadata is absent and the starting participant is not Lakee", () => {
		expect(
			isCapyThreadCreatedByUser(
				{
					createdAt: "2026-06-01T10:25:24.000Z",
					id: "thread-created-by-someone-else",
					participants: [
						{
							firstParticipatedAt: "2026-06-01T10:25:24.000Z",
							userId: "user_someone_else",
							userType: "human",
						},
					],
					projectId: "project",
					title: "Not Lakee's Capy thread",
				},
				"lakee@exa.ai",
			),
		).toBe(false);
	});
});

describe("selectCapyMetadataBackfillIds", () => {
	it("backfills only locally created, pinned, and ownership-verified Capy threads outside the bounded scan", () => {
		expect(
			selectCapyMetadataBackfillIds({
				existingThreadIds: ["already-visible"],
				metadataById: {
					"capy:already-visible": {
						createdAt: "2026-06-01T10:00:00.000Z",
						createdLocally: true,
						id: "already-visible",
						provider: "capy",
						updatedAt: "2026-06-01T10:00:00.000Z",
					},
					"capy:local": {
						createdAt: "2026-06-01T10:00:00.000Z",
						createdLocally: true,
						id: "local",
						provider: "capy",
						updatedAt: "2026-06-01T10:05:00.000Z",
					},
					"capy:pinned": {
						createdAt: "2026-06-01T10:00:00.000Z",
						id: "pinned",
						pinned: true,
						provider: "capy",
						updatedAt: "2026-06-01T10:06:00.000Z",
					},
					"capy:discovered": {
						createdAt: "2026-06-01T10:00:00.000Z",
						discoveredFromProvider: true,
						id: "discovered",
						provider: "capy",
						updatedAt: "2026-06-01T10:04:00.000Z",
					},
					"capy:verified-discovered": {
						createdAt: "2026-06-01T10:00:00.000Z",
						discoveredFromProvider: true,
						id: "verified-discovered",
						ownershipVerified: true,
						provider: "capy",
						updatedAt: "2026-06-01T10:09:00.000Z",
					},
					"capy:archived": {
						archivedLocally: true,
						createdAt: "2026-06-01T10:00:00.000Z",
						id: "archived",
						pinned: true,
						provider: "capy",
						updatedAt: "2026-06-01T10:07:00.000Z",
					},
					"devin:pinned": {
						createdAt: "2026-06-01T10:00:00.000Z",
						id: "pinned",
						pinned: true,
						provider: "devin",
						updatedAt: "2026-06-01T10:08:00.000Z",
					},
				},
			}),
		).toEqual(["verified-discovered", "pinned", "local"]);
	});
});

describe("Capy mine scan defaults", () => {
	it("scans beyond the first couple pages so older Lakee-created UI threads can appear", () => {
		expect(CAPY_MINE_DEFAULT_SCAN_PAGE_LIMIT).toBeGreaterThanOrEqual(8);
	});
});
