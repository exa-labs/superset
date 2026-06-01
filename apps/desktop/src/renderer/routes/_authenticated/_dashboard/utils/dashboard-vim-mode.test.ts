import { describe, expect, it } from "bun:test";
import {
	nextDashboardVimSequence,
	setDashboardVimModeEnabled,
	shouldHandleDashboardVimKey,
} from "./dashboard-vim-mode";

function keyEvent(
	overrides: Partial<KeyboardEvent> & { target?: EventTarget | null } = {},
) {
	const target = overrides.target ?? document.body;
	return {
		altKey: false,
		ctrlKey: false,
		defaultPrevented: false,
		isComposing: false,
		key: "j",
		metaKey: false,
		shiftKey: false,
		target,
		...overrides,
	} as KeyboardEvent;
}

describe("dashboard vim mode", () => {
	it("does not handle keys when disabled", () => {
		setDashboardVimModeEnabled(false);
		expect(shouldHandleDashboardVimKey(keyEvent())).toBe(false);
	});

	it("guards editable targets and modified chords", () => {
		setDashboardVimModeEnabled(true);
		if (typeof document !== "undefined") {
			const input = document.createElement("input");
			document.body.append(input);
			expect(shouldHandleDashboardVimKey(keyEvent({ target: input }))).toBe(
				false,
			);
			input.remove();
		}
		expect(shouldHandleDashboardVimKey(keyEvent({ metaKey: true }))).toBe(
			false,
		);
		expect(shouldHandleDashboardVimKey(keyEvent())).toBe(true);
	});

	it("parses g-prefixed jumps", () => {
		expect(nextDashboardVimSequence(null, "g")).toEqual({
			pendingPrefix: "g",
			sequence: null,
		});
		expect(nextDashboardVimSequence("g", "c")).toEqual({
			pendingPrefix: null,
			sequence: "g c",
		});
		expect(nextDashboardVimSequence("g", "d")).toEqual({
			pendingPrefix: null,
			sequence: "g d",
		});
		expect(nextDashboardVimSequence("g", "g")).toEqual({
			pendingPrefix: null,
			sequence: "g g",
		});
		expect(nextDashboardVimSequence("g", "x")).toEqual({
			pendingPrefix: null,
			sequence: null,
		});
	});
});
