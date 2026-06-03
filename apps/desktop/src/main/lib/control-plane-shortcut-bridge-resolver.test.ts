import { describe, expect, it } from "bun:test";
import { createControlPlaneShortcutBridgeInputResolver } from "./control-plane-shortcut-bridge-resolver";

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

	it("does not prevent default for bare Escape focus-shell action", () => {
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
			preventDefault: false,
			type: "global-keyboard-action",
		});
	});
});
