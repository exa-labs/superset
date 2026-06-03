import { describe, expect, it } from "bun:test";
import {
	isOpenControlPlaneShortcutInput,
	openControlPlaneAccelerator,
} from "./control-plane-shortcut";

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
	it("uses the same platform accelerators as the renderer advertises", () => {
		expect(openControlPlaneAccelerator("darwin")).toBe("Alt+K");
		expect(openControlPlaneAccelerator("linux")).toBe("Ctrl+Alt+K");
		expect(openControlPlaneAccelerator("win32")).toBe("Ctrl+Alt+K");
	});

	it("matches Option+K by physical code even when macOS reports a dead key", () => {
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					key: "Dead",
					code: "KeyK",
				},
				"darwin",
			),
		).toBe(true);
	});

	it("matches raw key down events emitted by webview guests", () => {
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					type: "rawKeyDown",
				},
				"darwin",
			),
		).toBe(true);
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					type: "char",
				},
				"darwin",
			),
		).toBe(true);
	});

	it("matches macOS dead-key variants when code is missing", () => {
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					code: "",
					key: "Dead",
				},
				"darwin",
			),
		).toBe(true);
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					code: "",
					key: "˚",
				},
				"darwin",
			),
		).toBe(true);
	});

	it("does not treat non-K dead-key Option chords as Option+K", () => {
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					code: "KeyN",
					key: "Dead",
				},
				"darwin",
			),
		).toBe(false);
	});

	it("matches Ctrl+Alt+K on Windows and Linux", () => {
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					control: true,
				},
				"linux",
			),
		).toBe(true);
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					control: true,
				},
				"win32",
			),
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

	it("does not match Ctrl+Alt+K on macOS or bare Alt+K on Windows/Linux", () => {
		expect(
			isOpenControlPlaneShortcutInput(
				{
					...baseInput,
					control: true,
				},
				"darwin",
			),
		).toBe(false);
		expect(isOpenControlPlaneShortcutInput(baseInput, "linux")).toBe(false);
		expect(isOpenControlPlaneShortcutInput(baseInput, "win32")).toBe(false);
	});
});
