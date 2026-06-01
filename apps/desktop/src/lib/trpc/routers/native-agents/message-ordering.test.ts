import { describe, expect, it } from "bun:test";
import { orderMessagesOldestFirst } from "./message-ordering";

describe("orderMessagesOldestFirst", () => {
	it("sorts ISO timestamps from oldest to newest", () => {
		const messages = [
			{ createdAt: "2026-05-31T10:02:00.000Z", id: "newest" },
			{ createdAt: "2026-05-31T10:00:00.000Z", id: "oldest" },
			{ createdAt: "2026-05-31T10:01:00.000Z", id: "middle" },
		];

		expect(
			orderMessagesOldestFirst(messages).map((message) => message.id),
		).toEqual(["oldest", "middle", "newest"]);
	});

	it("handles second and millisecond numeric timestamps", () => {
		const messages = [
			{ createdAt: 1_780_000_200_000, id: "millis" },
			{ createdAt: 1_780_000_100, id: "seconds" },
		];

		expect(
			orderMessagesOldestFirst(messages).map((message) => message.id),
		).toEqual(["seconds", "millis"]);
	});

	it("keeps untimestamped messages stable at the end", () => {
		const messages = [
			{ createdAt: null, id: "missing-a" },
			{ createdAt: "2026-05-31T10:00:00.000Z", id: "dated" },
			{ id: "missing-b" },
		];

		expect(
			orderMessagesOldestFirst(messages).map((message) => message.id),
		).toEqual(["dated", "missing-a", "missing-b"]);
	});
});
