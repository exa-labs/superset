import { track } from "renderer/lib/analytics";
import { create } from "zustand";
import type { Command } from "./types";

export interface Frame {
	command: Command;
}

interface FrameStackState {
	open: boolean;
	rootOpenRequestId: number;
	frames: Frame[];
	openRoot: () => void;
	setOpen: (open: boolean) => void;
	pushFrame: (command: Command) => void;
	popFrame: () => void;
	reset: () => void;
}

export const useFrameStackStore = create<FrameStackState>((set) => ({
	open: false,
	rootOpenRequestId: 0,
	frames: [],
	openRoot: () =>
		set((state) => {
			if (!state.open) track("command_palette_opened");
			return {
				frames: [],
				open: true,
				rootOpenRequestId: state.rootOpenRequestId + 1,
			};
		}),
	setOpen: (open) =>
		set((state) => {
			if (open) {
				if (!state.open) track("command_palette_opened");
				return { open: true };
			}
			return { open: false, frames: [] };
		}),
	pushFrame: (command) =>
		set((state) => ({ frames: [...state.frames, { command }] })),
	popFrame: () => set((state) => ({ frames: state.frames.slice(0, -1) })),
	reset: () => set({ frames: [] }),
}));
