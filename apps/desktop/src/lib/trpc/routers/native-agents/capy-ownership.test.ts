import { describe, expect, it } from "bun:test";
import { isCapyThreadCreatedByUser } from "./index";

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
					createdByUserEmail: "friend@exa.ai",
					id: "thread-2",
					participants: [{ userId: "user_3CPOt2D9tBk4PVimoQaDhBkf6Wn" }],
					projectId: "project",
					title: "Not mine",
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
});
