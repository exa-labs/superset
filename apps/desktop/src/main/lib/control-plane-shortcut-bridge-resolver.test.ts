import { describe, expect, it } from "bun:test";
import { createControlPlaneShortcutBridgeInputResolver } from "./control-plane-shortcut-bridge-resolver";
import type { DashboardWebShortcut } from "./dashboard-web-shortcut";

type ResolverInput = Parameters<
	ReturnType<typeof createControlPlaneShortcutBridgeInputResolver>["resolve"]
>[0];
type ResolverResult = ReturnType<
	ReturnType<typeof createControlPlaneShortcutBridgeInputResolver>["resolve"]
>;

function input(overrides: Partial<ResolverInput>): ResolverInput {
	return {
		alt: true,
		code: "KeyK",
		control: false,
		isAutoRepeat: false,
		key: "k",
		meta: false,
		shift: false,
		type: "keyDown",
		...overrides,
	};
}

function createResolverHarness() {
	const cleared: unknown[] = [];
	return {
		cleared,
		resolver: createControlPlaneShortcutBridgeInputResolver({
			clearTimeout: (timeout) => cleared.push(timeout),
			setTimeout: (_callback, ms) => ({ ms, timer: cleared.length + 1 }),
		}),
	};
}

describe("control plane shortcut bridge resolver", () => {
	it("lets Option+K win before global and dashboard web shortcuts", () => {
		const { resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyK", key: "Dead" }))).toEqual({
			preventDefault: true,
			type: "open-control-plane",
		});
	});

	it("routes the keyboard-native global shortcuts through the main bridge", () => {
		const cases: Array<{
			input: Partial<ResolverInput>;
			name: string;
			result: ResolverResult;
		}> = [
			{
				input: { code: "KeyV", key: "Dead" },
				name: "Option+V toggles Vim mode",
				result: {
					action: "TOGGLE_VIM_MODE",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "Slash", key: "/", type: "rawKeyDown" },
				name: "Option+/ opens dashboard keyboard help from webviews",
				result: {
					action: "SHOW_DASHBOARD_KEYBOARD_HELP",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "KeyF", key: "Dead", type: "rawKeyDown" },
				name: "Option+F opens dashboard action hints from webviews",
				result: {
					action: "SHOW_DASHBOARD_ACTION_HINTS",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "KeyN", key: "Dead" },
				name: "Option+N opens the newest unread native reply",
				result: {
					action: "OPEN_UNREAD_NATIVE_REPLY",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "KeyN", key: "Dead", shift: true },
				name: "Option+Shift+N marks the newest unread native reply read",
				result: {
					action: "MARK_LATEST_NATIVE_REPLY_READ",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "Tab", key: "Tab" },
				name: "Option+Tab switches recent dashboard views",
				result: {
					action: "SWITCH_DASHBOARD_VIEW_NEXT",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "Tab", key: "Tab", shift: true },
				name: "Option+Shift+Tab switches recent dashboard views backward",
				result: {
					action: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
		];

		for (const testCase of cases) {
			const { resolver } = createResolverHarness();
			expect(resolver.resolve(input(testCase.input)), testCase.name).toEqual(
				testCase.result,
			);
		}
	});

	it("keeps C/D numeric chains for dashboard web shortcuts", () => {
		const { resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyC", key: "c" }))).toEqual({
			preventDefault: true,
			shortcut: "OPEN_CAPY",
			type: "dashboard-web-shortcut",
		});
		expect(
			resolver.resolve(input({ alt: false, code: "Digit2", key: "2" })),
		).toEqual({
			preventDefault: true,
			shortcut: "OPEN_CAPY_2",
			type: "dashboard-web-shortcut",
		});

		expect(resolver.resolve(input({ code: "KeyD", key: "d" }))).toEqual({
			preventDefault: true,
			shortcut: "OPEN_DEVIN",
			type: "dashboard-web-shortcut",
		});
		expect(resolver.resolve(input({ code: "Digit9", key: "9" }))).toEqual({
			preventDefault: true,
			shortcut: "OPEN_DEVIN_9",
			type: "dashboard-web-shortcut",
		});
	});

	it("keeps C/D numeric chains when Electron only reports the digit key", () => {
		const { resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyC", key: "c" })).type).toBe(
			"dashboard-web-shortcut",
		);
		expect(resolver.resolve(input({ alt: false, code: "", key: "4" }))).toEqual(
			{
				preventDefault: true,
				shortcut: "OPEN_CAPY_4",
				type: "dashboard-web-shortcut",
			},
		);
	});

	it("routes high-impact dashboard Option shortcuts through the main bridge", () => {
		const cases: Array<{
			input: Partial<ResolverInput>;
			name: string;
			shortcut: DashboardWebShortcut;
		}> = [
			{
				input: { code: "KeyG", key: "Dead" },
				name: "Option+G opens Chrome",
				shortcut: "OPEN_CHROME",
			},
			{
				input: { code: "KeyW", key: "Dead" },
				name: "Option+W opens workspaces",
				shortcut: "OPEN_WORKSPACES",
			},
			{
				input: { code: "KeyB", key: "Dead" },
				name: "Option+B toggles native/browser view",
				shortcut: "TOGGLE_NATIVE_BROWSER_VIEW",
			},
			{
				input: { code: "KeyS", key: "Dead" },
				name: "Option+S toggles native split view",
				shortcut: "TOGGLE_NATIVE_SPLIT_VIEW",
			},
		];

		for (const testCase of cases) {
			const { resolver } = createResolverHarness();
			expect(resolver.resolve(input(testCase.input)), testCase.name).toEqual({
				preventDefault: true,
				shortcut: testCase.shortcut,
				type: "dashboard-web-shortcut",
			});
		}
	});

	it("routes direct native create shortcuts through the main bridge", () => {
		const cases: Array<{
			input: Partial<ResolverInput>;
			name: string;
			shortcut: DashboardWebShortcut;
		}> = [
			{
				input: { code: "KeyC", key: "Dead", shift: true },
				name: "Option+Shift+C creates a Capy thread",
				shortcut: "CREATE_CAPY",
			},
			{
				input: { code: "KeyD", key: "Dead", shift: true },
				name: "Option+Shift+D creates a Devin session",
				shortcut: "CREATE_DEVIN",
			},
			{
				input: { code: "KeyS", key: "Dead", shift: true },
				name: "Option+Shift+S opens the stag root kr9 terminal",
				shortcut: "OPEN_ROOT_TERMINAL_STAG",
			},
			{
				input: { code: "KeyP", key: "Dead", shift: true },
				name: "Option+Shift+P opens the prod root kr9 terminal",
				shortcut: "OPEN_ROOT_TERMINAL_PROD",
			},
			{
				input: { code: "KeyH", key: "Dead", shift: true },
				name: "Option+Shift+H opens the heph root kr9 terminal",
				shortcut: "OPEN_ROOT_TERMINAL_HEPH",
			},
		];

		for (const testCase of cases) {
			const { resolver } = createResolverHarness();
			expect(resolver.resolve(input(testCase.input)), testCase.name).toEqual({
				preventDefault: true,
				shortcut: testCase.shortcut,
				type: "dashboard-web-shortcut",
			});
		}
	});

	it("keeps C/D create chains for dashboard web shortcuts", () => {
		const { resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyC", key: "c" })).type).toBe(
			"dashboard-web-shortcut",
		);
		expect(
			resolver.resolve(input({ alt: false, code: "KeyN", key: "n" })),
		).toEqual({
			preventDefault: true,
			shortcut: "CREATE_CAPY",
			type: "dashboard-web-shortcut",
		});

		expect(resolver.resolve(input({ code: "KeyD", key: "d" })).type).toBe(
			"dashboard-web-shortcut",
		);
		expect(resolver.resolve(input({ code: "KeyN", key: "Dead" }))).toEqual({
			preventDefault: true,
			shortcut: "CREATE_DEVIN",
			type: "dashboard-web-shortcut",
		});
	});

	it("clears pending dashboard web chains when Option+K opens the control plane", () => {
		const { cleared, resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyC", key: "c" })).type).toBe(
			"dashboard-web-shortcut",
		);
		expect(resolver.resolve(input({ code: "KeyK", key: "Dead" }))).toEqual({
			preventDefault: true,
			type: "open-control-plane",
		});
		expect(cleared).toHaveLength(1);
		expect(resolver.resolve(input({ code: "Digit1", key: "1" }))).toEqual({
			preventDefault: true,
			shortcut: "OPEN_WEB_PAGE_1",
			type: "dashboard-web-shortcut",
		});
	});

	it("clears pending dashboard web chains when global Vim/help/MRU actions run", () => {
		const cases: Array<{
			input: Partial<ResolverInput>;
			result: ResolverResult;
		}> = [
			{
				input: { code: "KeyV", key: "v" },
				result: {
					action: "TOGGLE_VIM_MODE",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "Slash", key: "/", type: "rawKeyDown" },
				result: {
					action: "SHOW_DASHBOARD_KEYBOARD_HELP",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "KeyF", key: "Dead", type: "rawKeyDown" },
				result: {
					action: "SHOW_DASHBOARD_ACTION_HINTS",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "KeyN", key: "Dead", shift: true },
				result: {
					action: "MARK_LATEST_NATIVE_REPLY_READ",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
			{
				input: { code: "Tab", key: "Tab" },
				result: {
					action: "SWITCH_DASHBOARD_VIEW_NEXT",
					preventDefault: true,
					type: "global-keyboard-action",
				},
			},
		];

		for (const testCase of cases) {
			const { resolver } = createResolverHarness();
			expect(resolver.resolve(input({ code: "KeyD", key: "d" })).type).toBe(
				"dashboard-web-shortcut",
			);
			expect(resolver.resolve(input(testCase.input))).toEqual(testCase.result);
			expect(resolver.resolve(input({ code: "Digit3", key: "3" }))).toEqual({
				preventDefault: true,
				shortcut: "OPEN_WEB_PAGE_3",
				type: "dashboard-web-shortcut",
			});
		}
	});

	it("clears pending dashboard web chains when Escape returns focus to the shell", () => {
		const { resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyC", key: "c" })).type).toBe(
			"dashboard-web-shortcut",
		);
		expect(
			resolver.resolve(
				input({
					alt: false,
					code: "Escape",
					key: "Escape",
				}),
			),
		).toEqual({
			action: "FOCUS_DASHBOARD_SHELL",
			preventDefault: true,
			type: "global-keyboard-action",
		});
		expect(
			resolver.resolve(input({ alt: false, code: "Digit1", key: "1" })),
		).toEqual({ preventDefault: false, type: "none" });
	});

	it("prevents default for bare Escape focus-shell action", () => {
		const { resolver } = createResolverHarness();

		expect(
			resolver.resolve(
				input({
					alt: false,
					code: "Escape",
					key: "Escape",
				}),
			),
		).toEqual({
			action: "FOCUS_DASHBOARD_SHELL",
			preventDefault: true,
			type: "global-keyboard-action",
		});
	});

	it("clears pending Capy/Devin chains on unrelated real keys", () => {
		const { cleared, resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyC", key: "c" })).type).toBe(
			"dashboard-web-shortcut",
		);
		expect(
			resolver.resolve(input({ alt: false, code: "KeyX", key: "x" })),
		).toEqual({
			preventDefault: false,
			type: "none",
		});
		expect(cleared).toHaveLength(1);
		expect(
			resolver.resolve(input({ alt: false, code: "Digit2", key: "2" })),
		).toEqual({
			preventDefault: false,
			type: "none",
		});
		expect(resolver.resolve(input({ code: "Digit2", key: "2" }))).toEqual({
			preventDefault: true,
			shortcut: "OPEN_WEB_PAGE_2",
			type: "dashboard-web-shortcut",
		});
	});

	it("keeps pending Capy/Devin chains across modifier key noise", () => {
		const { cleared, resolver } = createResolverHarness();

		expect(resolver.resolve(input({ code: "KeyD", key: "d" })).type).toBe(
			"dashboard-web-shortcut",
		);
		expect(
			resolver.resolve(
				input({
					alt: false,
					code: "AltLeft",
					key: "Alt",
					type: "keyUp",
				}),
			),
		).toEqual({
			preventDefault: false,
			type: "none",
		});
		expect(cleared).toHaveLength(0);
		expect(
			resolver.resolve(input({ alt: false, code: "Digit4", key: "4" })),
		).toEqual({
			preventDefault: true,
			shortcut: "OPEN_DEVIN_4",
			type: "dashboard-web-shortcut",
		});
	});
});
