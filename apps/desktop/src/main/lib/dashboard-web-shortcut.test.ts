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
				hotkeyId: "TOGGLE_NATIVE_BROWSER_VIEW",
				shortcut: "TOGGLE_NATIVE_BROWSER_VIEW",
			},
			{
				hotkeyId: "TOGGLE_NATIVE_SPLIT_VIEW",
				shortcut: "TOGGLE_NATIVE_SPLIT_VIEW",
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

	it("matches Option+number shortcuts by physical digit code", () => {
		expect(dashboardWebShortcutFromInput(input({ code: "Digit1" }))).toBe(
			"OPEN_WEB_PAGE_1",
		);
		expect(dashboardWebShortcutFromInput(input({ code: "Numpad6" }))).toBe(
			"OPEN_WEB_PAGE_6",
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

	it("matches raw key down events emitted by focused webviews", () => {
		expect(
			dashboardWebShortcutFromInput(
				input({ code: "KeyG", key: "g", type: "rawKeyDown" }),
			),
		).toBe("OPEN_CHROME");
		expect(
			dashboardWebDigitIndexFromInput(
				input({ code: "Digit3", key: "3", type: "rawKeyDown" }),
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
				input({ alt: false, code: "Digit7" }),
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
				"SIDEBAR_FOCUS_SEARCH",
			]),
		);
		expect(isDashboardWebShortcut("BROWSER_GO_BACK")).toBe(true);
		expect(isDashboardWebShortcut("BROWSER_GO_FORWARD")).toBe(true);
		expect(isDashboardWebShortcut("SIDEBAR_FOCUS_NEXT")).toBe(true);
		expect(isDashboardWebShortcut("NOT_A_SHORTCUT")).toBe(false);
		expect(isDashboardWebShortcut(null)).toBe(false);
	});
});
