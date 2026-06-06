import { describe, expect, it } from "bun:test";
import { HOTKEYS_REGISTRY, type HotkeyId } from "renderer/hotkeys/registry";
import {
	type GlobalKeyboardAction,
	globalKeyboardActionFromInput,
	isGlobalKeyboardAction,
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

type GlobalKeyboardShortcutInput = Parameters<
	typeof globalKeyboardActionFromInput
>[0];

function macChordForHotkey(hotkeyId: HotkeyId): string {
	const binding = HOTKEYS_REGISTRY[hotkeyId].key.mac;
	if (binding === null) throw new Error(`${hotkeyId} has no macOS shortcut`);
	return typeof binding === "string" ? binding : binding.chord;
}

function keyTokenInput(
	token: string,
): Pick<GlobalKeyboardShortcutInput, "code" | "key"> {
	if (/^[a-z]$/i.test(token)) {
		return {
			code: `Key${token.toUpperCase()}`,
			key: "Dead",
		};
	}
	if (token === "slash") return { code: "Slash", key: "/" };
	if (token === "tab") return { code: "Tab", key: "Tab" };
	throw new Error(`Unsupported global shortcut terminal token: ${token}`);
}

function inputFromMacChord(chord: string): GlobalKeyboardShortcutInput {
	const parts = chord.toLowerCase().split("+");
	const token = parts.at(-1);
	if (!token) throw new Error(`Invalid shortcut chord: ${chord}`);

	return {
		...baseInput,
		alt: parts.includes("alt"),
		code: keyTokenInput(token).code,
		control: parts.includes("ctrl") || parts.includes("control"),
		key: keyTokenInput(token).key,
		meta: parts.includes("meta") || parts.includes("cmd"),
		shift: parts.includes("shift"),
	};
}

describe("globalKeyboardActionFromInput", () => {
	it("recognizes global keyboard actions emitted by embedded webview bridges", () => {
		expect(isGlobalKeyboardAction("TOGGLE_VIM_MODE")).toBe(true);
		expect(isGlobalKeyboardAction("SWITCH_DASHBOARD_VIEW_NEXT")).toBe(true);
		expect(isGlobalKeyboardAction("OPEN_UNREAD_NATIVE_REPLY")).toBe(true);
		expect(isGlobalKeyboardAction("OPEN_CHROME")).toBe(false);
		expect(isGlobalKeyboardAction(null)).toBe(false);
	});

	it("keeps globally captured shortcuts aligned with renderer registry mac defaults", () => {
		const cases: Array<{
			action: GlobalKeyboardAction;
			hotkeyId: HotkeyId;
		}> = [
			{
				action: "SHOW_DASHBOARD_KEYBOARD_HELP",
				hotkeyId: "SHOW_DASHBOARD_KEYBOARD_HELP",
			},
			{
				action: "SHOW_DASHBOARD_ACTION_HINTS",
				hotkeyId: "SHOW_DASHBOARD_ACTION_HINTS",
			},
			{
				action: "OPEN_UNREAD_NATIVE_REPLY",
				hotkeyId: "OPEN_UNREAD_NATIVE_REPLY",
			},
			{
				action: "MARK_LATEST_NATIVE_REPLY_READ",
				hotkeyId: "MARK_LATEST_NATIVE_REPLY_READ",
			},
			{
				action: "SWITCH_DASHBOARD_VIEW_NEXT",
				hotkeyId: "SWITCH_DASHBOARD_VIEW_NEXT",
			},
			{
				action: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
				hotkeyId: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
			},
			{ action: "TOGGLE_VIM_MODE", hotkeyId: "TOGGLE_VIM_MODE" },
		];

		for (const testCase of cases) {
			expect(
				globalKeyboardActionFromInput(
					inputFromMacChord(macChordForHotkey(testCase.hotkeyId)),
				),
				`${testCase.hotkeyId} registry chord should be captured by Electron bridge`,
			).toBe(testCase.action);
		}
	});

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

	it("matches Option+F as a global dashboard action hint trigger", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "KeyF",
				key: "Dead",
			}),
		).toBe("SHOW_DASHBOARD_ACTION_HINTS");
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				code: "",
				key: "f",
				type: "rawKeyDown",
			}),
		).toBe("SHOW_DASHBOARD_ACTION_HINTS");
	});

	it("keeps plain F available for Vim-mode in-page action hints", () => {
		expect(
			globalKeyboardActionFromInput({
				...baseInput,
				alt: false,
				code: "KeyF",
				key: "f",
			}),
		).toBeNull();
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

	it("matches Ctrl+Alt global actions on non-macOS webview bridges", () => {
		expect(
			globalKeyboardActionFromInput(
				{
					...baseInput,
					control: true,
					code: "KeyV",
					key: "v",
				},
				"linux",
			),
		).toBe("TOGGLE_VIM_MODE");
		expect(
			globalKeyboardActionFromInput(
				{
					...baseInput,
					control: true,
					code: "Tab",
					key: "Tab",
					shift: true,
				},
				"win32",
			),
		).toBe("SWITCH_DASHBOARD_VIEW_PREVIOUS");
		expect(
			globalKeyboardActionFromInput(
				{
					...baseInput,
					code: "KeyV",
					key: "v",
				},
				"linux",
			),
		).toBeNull();
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

	it("captures bare Escape as a shell-owned dashboard focus action", () => {
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
		).toBe(true);
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

	it("prevents defaults for global dashboard-owned actions", () => {
		expect(
			shouldPreventDefaultForGlobalKeyboardAction("FOCUS_DASHBOARD_SHELL"),
		).toBe(true);
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
				"SHOW_DASHBOARD_ACTION_HINTS",
			),
		).toBe(true);
		expect(
			shouldPreventDefaultForGlobalKeyboardAction(
				"SHOW_DASHBOARD_KEYBOARD_HELP",
			),
		).toBe(true);
	});
});
