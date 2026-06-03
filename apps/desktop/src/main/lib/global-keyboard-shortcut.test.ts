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

	it("matches Option+N as a global unread native reply jump", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "KeyN",
				key: "Dead",
			}),
		).toBe("OPEN_UNREAD_NATIVE_REPLY");
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "",
				key: "n",
				type: "rawKeyDown",
			}),
		).toBe("OPEN_UNREAD_NATIVE_REPLY");
	});

	it("matches Option+Shift+N as a global latest native reply acknowledgement", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "KeyN",
				key: "Dead",
				shift: true,
			}),
		).toBe("MARK_LATEST_NATIVE_REPLY_READ");
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "",
				key: "N",
				shift: true,
				type: "rawKeyDown",
			}),
		).toBe("MARK_LATEST_NATIVE_REPLY_READ");
	});

	it("keeps unmodified N available for pending Capy and Devin create chords", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				alt: false,
				code: "KeyN",
				key: "n",
			}),
		).toBeNull();
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

	it("matches Option+/ dashboard keyboard help by physical code and question key", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "Slash",
				key: "/",
			}),
		).toBe("SHOW_DASHBOARD_KEYBOARD_HELP");
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "Slash",
				key: "?",
				shift: true,
			}),
		).toBe("SHOW_DASHBOARD_KEYBOARD_HELP");
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
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "Slash",
				key: "/",
				type: "rawKeyDown",
			}),
		).toBe("SHOW_DASHBOARD_KEYBOARD_HELP");
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
				code: "Slash",
				key: "/",
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
		expect(
			shouldPreventDefaultForGlobalKeyboardAction("OPEN_UNREAD_NATIVE_REPLY"),
		).toBe(true);
		expect(
			shouldPreventDefaultForGlobalKeyboardAction(
				"MARK_LATEST_NATIVE_REPLY_READ",
			),
		).toBe(true);
		expect(
			shouldPreventDefaultForGlobalKeyboardAction(
				"SHOW_DASHBOARD_KEYBOARD_HELP",
			),
		).toBe(true);
	});
});
