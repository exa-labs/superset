import { describe, expect, it } from "bun:test";
import {
	isControlPlaneShortcutEventHandled,
	markControlPlaneShortcutEventHandled,
} from "./control-plane-shortcut-event";

describe("control plane shortcut event marker", () => {
	it("marks handled shortcut events without requiring preventDefault", () => {
		const event = {};

		expect(isControlPlaneShortcutEventHandled(event)).toBe(false);

		markControlPlaneShortcutEventHandled(event);

		expect(isControlPlaneShortcutEventHandled(event)).toBe(true);
	});
});
