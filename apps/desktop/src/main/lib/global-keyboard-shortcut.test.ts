import { describe, expect, it } from "bun:test";
import {
	globalKeyboardActionFromInput,
	shouldPreventDefaultForGlobalKeyboardAction,
} from "./global-keyboard-shortcut";

const baseInput = {
	alt: true,
	code: "KeyV",
	control: false,
	isAutoRepeat: false,
	key: "v",
	meta: false,
	shift: false,
	type: "keyDown",
};

describe("globalKeyboardActionFromInput", () => {
	it("matches Option+V by physical code", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				key: "Dead",
				code: "KeyV",
			}),
		).toBe("TOGGLE_VIM_MODE");
	});

	it("matches Option+Tab MRU switching in both directions", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "Tab",
				key: "Tab",
			}),
		).toBe("SWITCH_DASHBOARD_VIEW_NEXT");
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "Tab",
				key: "Tab",
				shift: true,
			}),
		).toBe("SWITCH_DASHBOARD_VIEW_PREVIOUS");
	});

	it("matches raw key down and char events emitted by focused webviews", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				type: "rawKeyDown",
			}),
		).toBe("TOGGLE_VIM_MODE");
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				type: "char",
			}),
		).toBe("TOGGLE_VIM_MODE");
	});

	it("emits a non-preventing dashboard shell focus action for bare Escape", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				alt: false,
				code: "Escape",
				key: "Escape",
			}),
		).toBe("FOCUS_DASHBOARD_SHELL");
		expect(
			shouldPreventDefaultForGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL"),
		).toBe(false);
	});

	it("ignores repeats and non-option chords", () => {
		expect(
			globalKeyboardActionFromInput({ ...baseInput, isAutoRepeat: true }),
		).toBeNull();
		expect(
			globalKeyboardActionFromInput({ ...baseInput, alt: false }),
		).toBeNull();
		expect(
			globalKeyboardActionFromInput({ ...baseInput, meta: true }),
		).toBeNull();
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "Tab",
				key: "Tab",
				isAutoRepeat: true,
			}),
		).toBeNull();
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				alt: false,
				code: "Escape",
				key: "Escape",
				shift: true,
			}),
		).toBeNull();
	});

	it("prevents defaults for switching and Vim toggle actions", () => {
		expect(
			shouldPreventDefaultForGlobalKeyboardAction("SWITCH_DASHBOARD_VIEW_NEXT"),
		).toBe(true);
		expect(shouldPreventDefaultForGlobalKeyboardAction("TOGGLE_VIM_MODE")).toBe(
			true,
		);
	});
});
