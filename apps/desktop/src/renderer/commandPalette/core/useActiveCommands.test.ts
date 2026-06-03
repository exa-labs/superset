import { describe, expect, it } from "bun:test";
import type { Command } from "./types";
import { orderCommandsByPriority } from "./useActiveCommands";

function command(id: string, priority?: number): Command {
	return {
		id,
		priority,
		section: "web",
		title: id,
	};
}

describe("orderCommandsByPriority", () => {
	it("puts high-priority keyboard actions first within a section", () => {
		expect(
			orderCommandsByPriority([
				command("open-capy"),
				command("reply-current", 100),
				command("create-devin", 50),
				command("open-chrome"),
			]).map((item) => item.id),
		).toEqual(["reply-current", "create-devin", "open-capy", "open-chrome"]);
	});

	it("keeps provider order stable for equal priorities", () => {
		expect(
			orderCommandsByPriority([
				command("first", 10),
				command("second", 10),
				command("third"),
			]).map((item) => item.id),
		).toEqual(["first", "second", "third"]);
	});
});
