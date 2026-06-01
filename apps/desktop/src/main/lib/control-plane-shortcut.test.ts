import { describe, expect, it } from "bun:test";
import { isOpenControlPlaneShortcutInput } from "./control-plane-shortcut";

const baseInput = {
	type: "keyDown",
	key: "k",
	code: "KeyK",
	isAutoRepeat: false,
	shift: false,
	control: false,
	alt: true,
	meta: false,
};

describe("isOpenControlPlaneShortcutInput", () => {
	it("matches Option+K by physical code even when macOS reports a dead key", () => {
		expect(
			isOpenControlPlaneShortcutInput({
				...baseInput,
				key: "Dead",
				code: "KeyK",
			}),
		).toBe(true);
	});

	it("matches raw key down events emitted by webview guests", () => {
		expect(
			isOpenControlPlaneShortcutInput({
				...baseInput,
				type: "rawKeyDown",
			}),
		).toBe(true);
	});

	it("matches macOS dead-key variants when code is missing", () => {
		expect(
			isOpenControlPlaneShortcutInput({
				...baseInput,
				code: "",
				key: "Dead",
			}),
		).toBe(true);
		expect(
			isOpenControlPlaneShortcutInput({
				...baseInput,
				code: "",
				key: "˚",
			}),
		).toBe(true);
	});

	it("does not match shifted or repeated Option+K", () => {
		expect(isOpenControlPlaneShortcutInput({ ...baseInput, shift: true })).toBe(
			false,
		);
		expect(
			isOpenControlPlaneShortcutInput({ ...baseInput, isAutoRepeat: true }),
		).toBe(false);
	});

	it("does not match plain K", () => {
		expect(isOpenControlPlaneShortcutInput({ ...baseInput, alt: false })).toBe(
			false,
		);
	});
});
