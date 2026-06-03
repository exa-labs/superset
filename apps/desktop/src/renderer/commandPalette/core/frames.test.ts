import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Command } from "./types";

mock.module("renderer/lib/analytics", () => ({
	track: mock(() => {}),
}));

function frameCommand(id: string): Command {
	return {
		id,
		section: "actions",
		title: id,
	};
}

describe("useFrameStackStore", () => {
	beforeEach(async () => {
		const { useFrameStackStore } = await import("./frames");
		useFrameStackStore.setState({
			frames: [],
			open: false,
			rootOpenRequestId: 0,
		});
	});

	it("opens the root control plane from a closed state", async () => {
		const { useFrameStackStore } = await import("./frames");

		useFrameStackStore.getState().openRoot();

		expect(useFrameStackStore.getState().open).toBe(true);
		expect(useFrameStackStore.getState().frames).toEqual([]);
		expect(useFrameStackStore.getState().rootOpenRequestId).toBe(1);
	});

	it("clears nested command frames when the global control-plane shortcut wins", async () => {
		const { useFrameStackStore } = await import("./frames");
		const store = useFrameStackStore.getState();

		store.setOpen(true);
		store.pushFrame(frameCommand("nested"));

		expect(useFrameStackStore.getState().frames).toHaveLength(1);

		useFrameStackStore.getState().openRoot();

		expect(useFrameStackStore.getState().open).toBe(true);
		expect(useFrameStackStore.getState().frames).toEqual([]);
		expect(useFrameStackStore.getState().rootOpenRequestId).toBe(1);
	});

	it("increments the root open request even when the palette was already open", async () => {
		const { useFrameStackStore } = await import("./frames");

		useFrameStackStore.getState().openRoot();
		useFrameStackStore.getState().openRoot();

		expect(useFrameStackStore.getState().open).toBe(true);
		expect(useFrameStackStore.getState().rootOpenRequestId).toBe(2);
	});
});
