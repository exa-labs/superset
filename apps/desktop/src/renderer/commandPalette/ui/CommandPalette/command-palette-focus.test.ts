import { afterEach, describe, expect, it } from "bun:test";
import {
	COMMAND_PALETTE_INPUT_SELECTOR,
	focusCommandPaletteInput,
	scheduleCommandPaletteInputFocus,
} from "./command-palette-focus";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

afterEach(() => {
	globalThis.document = originalDocument;
	globalThis.window = originalWindow;
});

describe("focusCommandPaletteInput", () => {
	it("focuses and selects the global command palette input", () => {
		let focused = false;
		let selected = false;
		const input = {
			focus: (options?: FocusOptions) => {
				focused = options?.preventScroll === true;
			},
			select: () => {
				selected = true;
			},
		} as HTMLInputElement;

		globalThis.document = {
			querySelector: (selector: string) =>
				selector === COMMAND_PALETTE_INPUT_SELECTOR ? input : null,
		} as Document;

		expect(focusCommandPaletteInput()).toBe(true);
		expect(focused).toBe(true);
		expect(selected).toBe(true);
	});

	it("fails quietly when the global command palette input is absent", () => {
		globalThis.document = {
			querySelector: () => null,
		} as unknown as Document;

		expect(focusCommandPaletteInput()).toBe(false);
	});
});

describe("scheduleCommandPaletteInputFocus", () => {
	it("waits two animation frames so the dialog focus scope can mount first", () => {
		let frameCount = 0;
		globalThis.document = {
			querySelector: () => null,
		} as unknown as Document;
		globalThis.window = {
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				frameCount += 1;
				callback(frameCount);
				return frameCount;
			},
		} as unknown as Window & typeof globalThis;

		scheduleCommandPaletteInputFocus();

		expect(frameCount).toBe(2);
	});
});
