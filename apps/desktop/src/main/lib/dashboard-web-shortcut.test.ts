import { describe, expect, it } from "bun:test";
import { HOTKEYS_REGISTRY, type HotkeyId } from "renderer/hotkeys/registry";
import {
	DASHBOARD_WEB_SHORTCUTS,
	type DashboardWebShortcut,
	dashboardWebCreateShortcutFromInput,
	dashboardWebDigitIndexFromInput,
	dashboardWebIndexedShortcut,
	dashboardWebPendingDigitIndexFromInput,
	dashboardWebShortcutFromInput,
	isDashboardWebShortcut,
} from "./dashboard-web-shortcut";

function input(
	overrides: Partial<Parameters<typeof dashboardWebShortcutFromInput>[0]>,
) {
	return {
		alt: true,
		code: "Digit1",
		control: false,
		isAutoRepeat: false,
		key: "1",
		meta: false,
		shift: false,
		type: "keyDown",
		...overrides,
	} satisfies Parameters<typeof dashboardWebShortcutFromInput>[0];
}

function macChordForHotkey(hotkeyId: HotkeyId): string {
	const binding = HOTKEYS_REGISTRY[hotkeyId].key.mac;
	if (binding === null) throw new Error(`${hotkeyId} has no macOS shortcut`);
	return typeof binding === "string" ? binding : binding.chord;
}

function inputFromMacChord(
	chord: string,
): Parameters<typeof dashboardWebShortcutFromInput>[0] {
	const parts = chord.toLowerCase().split("+");
	const token = parts.at(-1);
	if (!token) throw new Error(`Invalid shortcut chord: ${chord}`);

	if (/^[a-z]$/i.test(token)) {
		return input({
			alt: parts.includes("alt"),
			code: `Key${token.toUpperCase()}`,
			control: parts.includes("ctrl") || parts.includes("control"),
			key: "Dead",
			meta: parts.includes("meta") || parts.includes("cmd"),
			shift: parts.includes("shift"),
		});
	}

	if (/^[1-9]$/.test(token)) {
		return input({
			alt: parts.includes("alt"),
			code: `Digit${token}`,
			control: parts.includes("ctrl") || parts.includes("control"),
			key: token,
			meta: parts.includes("meta") || parts.includes("cmd"),
			shift: parts.includes("shift"),
		});
	}

	if (token === "0") {
		return input({
			alt: parts.includes("alt"),
			code: "Digit0",
			control: parts.includes("ctrl") || parts.includes("control"),
			key: token,
			meta: parts.includes("meta") || parts.includes("cmd"),
			shift: parts.includes("shift"),
		});
	}

	if (token === "left" || token === "right") {
		return input({
			alt: parts.includes("alt"),
			code: token === "left" ? "ArrowLeft" : "ArrowRight",
			control: parts.includes("ctrl") || parts.includes("control"),
			key: token === "left" ? "ArrowLeft" : "ArrowRight",
			meta: parts.includes("meta") || parts.includes("cmd"),
			shift: parts.includes("shift"),
		});
	}

	if (token === "comma" || token === "period") {
		return input({
			alt: parts.includes("alt"),
			code: token === "comma" ? "Comma" : "Period",
			control: parts.includes("ctrl") || parts.includes("control"),
			key: token === "comma" ? "," : ".",
			meta: parts.includes("meta") || parts.includes("cmd"),
			shift: parts.includes("shift"),
		});
	}

	throw new Error(
		`Unsupported dashboard web shortcut terminal token: ${token}`,
	);
}

describe("dashboardWebShortcutFromInput", () => {
	it("keeps fast-switcher Option shortcuts aligned with renderer registry mac defaults", () => {
		const cases: Array<{
			hotkeyId: HotkeyId;
			shortcut: DashboardWebShortcut;
		}> = [
			{ hotkeyId: "OPEN_WEB_PAGE_1", shortcut: "OPEN_WEB_PAGE_1" },
			{ hotkeyId: "OPEN_WEB_PAGE_2", shortcut: "OPEN_WEB_PAGE_2" },
			{ hotkeyId: "OPEN_WEB_PAGE_3", shortcut: "OPEN_WEB_PAGE_3" },
			{ hotkeyId: "OPEN_WEB_PAGE_4", shortcut: "OPEN_WEB_PAGE_4" },
			{ hotkeyId: "OPEN_WEB_PAGE_5", shortcut: "OPEN_WEB_PAGE_5" },
			{ hotkeyId: "OPEN_WEB_PAGE_6", shortcut: "OPEN_WEB_PAGE_6" },
			{ hotkeyId: "OPEN_CAPY", shortcut: "OPEN_CAPY" },
			{ hotkeyId: "CREATE_CAPY", shortcut: "CREATE_CAPY" },
			{ hotkeyId: "OPEN_DEVIN", shortcut: "OPEN_DEVIN" },
			{ hotkeyId: "CREATE_DEVIN", shortcut: "CREATE_DEVIN" },
			{ hotkeyId: "OPEN_CHROME", shortcut: "OPEN_CHROME" },
			{ hotkeyId: "OPEN_WORKSPACES", shortcut: "OPEN_WORKSPACES" },
			{
				hotkeyId: "OPEN_ROOT_TERMINAL_STAG",
				shortcut: "OPEN_ROOT_TERMINAL_STAG",
			},
			{
				hotkeyId: "OPEN_ROOT_TERMINAL_PROD",
				shortcut: "OPEN_ROOT_TERMINAL_PROD",
			},
			{
				hotkeyId: "OPEN_ROOT_TERMINAL_HEPH",
				shortcut: "OPEN_ROOT_TERMINAL_HEPH",
			},
			{
				hotkeyId: "TOGGLE_NATIVE_BROWSER_VIEW",
				shortcut: "TOGGLE_NATIVE_BROWSER_VIEW",
			},
			{
				hotkeyId: "TOGGLE_NATIVE_SPLIT_VIEW",
				shortcut: "TOGGLE_NATIVE_SPLIT_VIEW",
			},
			{ hotkeyId: "SIDEBAR_ACTION_MENU", shortcut: "SIDEBAR_ACTION_MENU" },
			{ hotkeyId: "SIDEBAR_ACTION_PIN", shortcut: "SIDEBAR_ACTION_PIN" },
			{
				hotkeyId: "SIDEBAR_ACTION_ARCHIVE",
				shortcut: "SIDEBAR_ACTION_ARCHIVE",
			},
			{
				hotkeyId: "SIDEBAR_ACTION_HARD_ARCHIVE",
				shortcut: "SIDEBAR_ACTION_HARD_ARCHIVE",
			},
			{ hotkeyId: "SIDEBAR_ACTION_MOVE", shortcut: "SIDEBAR_ACTION_MOVE" },
			{
				hotkeyId: "SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
				shortcut: "SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
			},
			{
				hotkeyId: "SIDEBAR_ACTION_RENAME",
				shortcut: "SIDEBAR_ACTION_RENAME",
			},
			{ hotkeyId: "SIDEBAR_ACTION_REPLY", shortcut: "SIDEBAR_ACTION_REPLY" },
			{
				hotkeyId: "SIDEBAR_ACTION_OPEN_BROWSER",
				shortcut: "SIDEBAR_ACTION_OPEN_BROWSER",
			},
			{
				hotkeyId: "SIDEBAR_ACTION_MARK_READ",
				shortcut: "SIDEBAR_ACTION_MARK_READ",
			},
			{ hotkeyId: "BROWSER_NEW_TAB", shortcut: "BROWSER_NEW_TAB" },
			{ hotkeyId: "BROWSER_RELOAD", shortcut: "BROWSER_RELOAD" },
			{ hotkeyId: "BROWSER_GO_BACK", shortcut: "BROWSER_GO_BACK" },
			{ hotkeyId: "BROWSER_GO_FORWARD", shortcut: "BROWSER_GO_FORWARD" },
			{ hotkeyId: "BROWSER_PREVIOUS_TAB", shortcut: "BROWSER_PREVIOUS_TAB" },
			{ hotkeyId: "BROWSER_NEXT_TAB", shortcut: "BROWSER_NEXT_TAB" },
			{ hotkeyId: "BROWSER_CLOSE_TAB", shortcut: "BROWSER_CLOSE_TAB" },
			{ hotkeyId: "BROWSER_TOGGLE_PIN", shortcut: "BROWSER_TOGGLE_PIN" },
			{ hotkeyId: "BROWSER_OPEN_EXTERNAL", shortcut: "BROWSER_OPEN_EXTERNAL" },
			{ hotkeyId: "BROWSER_TOGGLE_SPLIT", shortcut: "BROWSER_TOGGLE_SPLIT" },
			{ hotkeyId: "BROWSER_CLOSE_SPLIT", shortcut: "BROWSER_CLOSE_SPLIT" },
			{ hotkeyId: "BROWSER_SWAP_SPLIT", shortcut: "BROWSER_SWAP_SPLIT" },
			{ hotkeyId: "BROWSER_NARROW_SPLIT", shortcut: "BROWSER_NARROW_SPLIT" },
			{ hotkeyId: "BROWSER_WIDEN_SPLIT", shortcut: "BROWSER_WIDEN_SPLIT" },
			{
				hotkeyId: "BROWSER_EQUALIZE_SPLIT",
				shortcut: "BROWSER_EQUALIZE_SPLIT",
			},
		];

		for (const testCase of cases) {
			expect(
				dashboardWebShortcutFromInput(
					inputFromMacChord(macChordForHotkey(testCase.hotkeyId)),
				),
				`${testCase.hotkeyId} registry chord should resolve through the Electron dashboard shortcut bridge`,
			).toBe(testCase.shortcut);
		}
	});

	it("matches Option+number shortcuts by physical digit code and key fallback", () => {
		expect(dashboardWebShortcutFromInput(input({ code: "Digit1" }))).toBe(
			"OPEN_WEB_PAGE_1",
		);
		expect(dashboardWebShortcutFromInput(input({ code: "Numpad6" }))).toBe(
			"OPEN_WEB_PAGE_6",
		);
		expect(dashboardWebShortcutFromInput(input({ code: "", key: "4" }))).toBe(
			"OPEN_WEB_PAGE_4",
		);
	});

	it("matches app-level Option shortcuts by physical code", () => {
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyC", key: "Dead" })),
		).toBe("OPEN_CAPY");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyD", key: "Dead" })),
		).toBe("OPEN_DEVIN");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyC", key: "Dead", shift: true }),
			),
		).toBe("CREATE_CAPY");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyD", key: "Dead", shift: true }),
			),
		).toBe("CREATE_DEVIN");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyS", key: "Dead", shift: true }),
			),
		).toBe("OPEN_ROOT_TERMINAL_STAG");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyP", key: "Dead", shift: true }),
			),
		).toBe("OPEN_ROOT_TERMINAL_PROD");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyH", key: "Dead", shift: true }),
			),
		).toBe("OPEN_ROOT_TERMINAL_HEPH");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyG", key: "Dead" })),
		).toBe("OPEN_CHROME");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyW", key: "Dead" })),
		).toBe("OPEN_WORKSPACES");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyB", key: "Dead" })),
		).toBe("TOGGLE_NATIVE_BROWSER_VIEW");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyS", key: "Dead" })),
		).toBe("TOGGLE_NATIVE_SPLIT_VIEW");
	});

	it("matches Ctrl+Alt dashboard shortcuts on non-macOS webview bridges", () => {
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "Digit2", control: true, key: "2" }),
				"linux",
			),
		).toBe("OPEN_WEB_PAGE_2");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyC", control: true, key: "c" }),
				"linux",
			),
		).toBe("OPEN_CAPY");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyD", control: true, key: "d", shift: true }),
				"win32",
			),
		).toBe("CREATE_DEVIN");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyP", control: true, key: "p" }),
				"linux",
			),
		).toBe("SIDEBAR_ACTION_PIN");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyC", key: "c" }), "linux"),
		).toBeNull();
	});

	it("matches current sidebar row Option shortcuts while preserving browser precedence", () => {
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyP", key: "Dead" })),
		).toBe("SIDEBAR_ACTION_PIN");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyA", key: "Dead" })),
		).toBe("SIDEBAR_ACTION_ARCHIVE");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyA", key: "Dead", shift: true }),
			),
		).toBe("SIDEBAR_ACTION_HARD_ARCHIVE");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyM", key: "Dead" })),
		).toBe("SIDEBAR_ACTION_MOVE");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyM", key: "Dead", shift: true }),
			),
		).toBe("SIDEBAR_ACTION_REMOVE_FROM_FOLDER");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyE", key: "Dead" })),
		).toBe("SIDEBAR_ACTION_RENAME");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyR", key: "Dead", shift: true }),
			),
		).toBe("SIDEBAR_ACTION_REPLY");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyO", key: "Dead" })),
		).toBe("SIDEBAR_ACTION_OPEN_BROWSER");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyU", key: "Dead" })),
		).toBe("SIDEBAR_ACTION_MARK_READ");
		expect(
			dashboardWebShortcutFromInput(input({ code: "Period", key: "." })),
		).toBe("SIDEBAR_ACTION_MENU");
		expect(
			dashboardWebShortcutFromInput(input({ code: "KeyR", key: "Dead" })),
		).toBe("BROWSER_RELOAD");
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyO", key: "Dead", shift: true }),
			),
		).toBe("BROWSER_OPEN_EXTERNAL");
	});

	it("matches raw key down events emitted by focused webviews", () => {
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyG", key: "g", type: "rawKeyDown" }),
			),
		).toBe("OPEN_CHROME");
		expect(
			dashboardWebDigitIndexFromInput(
				input({ code: "", key: "3", type: "rawKeyDown" }),
			),
		).toBe(2);
	});

	it("matches character events emitted by focused webviews", () => {
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyG", key: "g", type: "char" }),
			),
		).toBe("OPEN_CHROME");
	});

	it("ignores repeats, non-alt chords, and unsupported digits", () => {
		expect(dashboardWebShortcutFromInput(input({ isAutoRepeat: true }))).toBe(
			null,
		);
		expect(dashboardWebShortcutFromInput(input({ alt: false }))).toBe(null);
		expect(dashboardWebShortcutFromInput(input({ code: "Digit7" }))).toBe(null);
		expect(dashboardWebShortcutFromInput(input({ meta: true }))).toBe(null);
	});

	it("maps C/D prefix digits to app-specific indexed shortcuts", () => {
		expect(dashboardWebIndexedShortcut("OPEN_CAPY", 0)).toBe("OPEN_CAPY_1");
		expect(dashboardWebIndexedShortcut("OPEN_CAPY", 8)).toBe("OPEN_CAPY_9");
		expect(dashboardWebIndexedShortcut("OPEN_DEVIN", 2)).toBe("OPEN_DEVIN_3");
		expect(dashboardWebIndexedShortcut("OPEN_WEB_PAGE_1", 0)).toBe(null);
		expect(dashboardWebIndexedShortcut("OPEN_CAPY", 9)).toBe(null);
	});

	it("maps C/D prefix n to native create shortcuts", () => {
		expect(
			dashboardWebCreateShortcutFromInput(
				"OPEN_CAPY",
				input({ alt: false, code: "KeyN", key: "n" }),
			),
		).toBe("CREATE_CAPY");
		expect(
			dashboardWebCreateShortcutFromInput(
				"OPEN_DEVIN",
				input({ code: "KeyN", key: "Dead" }),
			),
		).toBe("CREATE_DEVIN");
		expect(
			dashboardWebCreateShortcutFromInput(
				"OPEN_CHROME",
				input({ alt: false, code: "KeyN", key: "n" }),
			),
		).toBe(null);
	});

	it("exposes Option+digit indices beyond fixed top-page shortcuts for C/D chains", () => {
		expect(dashboardWebDigitIndexFromInput(input({ code: "Digit7" }))).toBe(6);
		expect(dashboardWebShortcutFromInput(input({ code: "Digit7" }))).toBe(null);
		expect(
			dashboardWebPendingDigitIndexFromInput(
				input({ alt: false, code: "", key: "7" }),
			),
		).toBe(6);
	});

	it("validates every embedded-browser Vim shortcut emitted by the bridge", () => {
		expect(DASHBOARD_WEB_SHORTCUTS).toEqual(
			expect.arrayContaining([
				"BROWSER_GO_BACK",
				"BROWSER_GO_FORWARD",
				"BROWSER_OPEN_EXTERNAL",
				"BROWSER_PREVIOUS_TAB",
				"BROWSER_NEXT_TAB",
				"BROWSER_CLOSE_TAB",
				"BROWSER_TOGGLE_PIN",
				"SIDEBAR_FOCUS_NEXT",
				"SIDEBAR_FOCUS_PREVIOUS",
				"SIDEBAR_FOCUS_FIRST",
				"SIDEBAR_FOCUS_LAST",
				"SIDEBAR_ACTIVATE",
				"SIDEBAR_TOGGLE_EXPANSION",
				"SIDEBAR_COLLAPSE",
				"SIDEBAR_EXPAND",
				"SIDEBAR_FOCUS_SEARCH",
				"SIDEBAR_ACTION_ARCHIVE",
				"SIDEBAR_ACTION_COLOR",
				"SIDEBAR_ACTION_CREATE",
				"SIDEBAR_ACTION_CREATE_FOLDER",
				"SIDEBAR_ACTION_DELETE",
				"SIDEBAR_ACTION_HARD_ARCHIVE",
				"SIDEBAR_ACTION_MARK_READ",
				"SIDEBAR_ACTION_MENU",
				"SIDEBAR_ACTION_MOVE",
				"SIDEBAR_ACTION_OPEN_BROWSER",
				"SIDEBAR_ACTION_PIN",
				"SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
				"SIDEBAR_ACTION_RENAME",
				"SIDEBAR_ACTION_REPLY",
				"SIDEBAR_ACTION_TOGGLE_BROWSER",
			]),
		);
		expect(isDashboardWebShortcut("BROWSER_GO_BACK")).toBe(true);
		expect(isDashboardWebShortcut("BROWSER_GO_FORWARD")).toBe(true);
		expect(isDashboardWebShortcut("SIDEBAR_FOCUS_NEXT")).toBe(true);
		expect(isDashboardWebShortcut("SIDEBAR_COLLAPSE")).toBe(true);
		expect(isDashboardWebShortcut("SIDEBAR_EXPAND")).toBe(true);
		expect(isDashboardWebShortcut("SIDEBAR_ACTION_HARD_ARCHIVE")).toBe(true);
		expect(isDashboardWebShortcut("SIDEBAR_ACTION_MARK_READ")).toBe(true);
		expect(isDashboardWebShortcut("SIDEBAR_ACTION_MOVE")).toBe(true);
		expect(isDashboardWebShortcut("NOT_A_SHORTCUT")).toBe(false);
		expect(isDashboardWebShortcut(null)).toBe(false);
	});
});
