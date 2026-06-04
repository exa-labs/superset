import { describe, expect, it } from "bun:test";
import { HOTKEYS_REGISTRY } from "./registry";

// Locks in the shape of shipped defaults so the toggle keeps doing
// something. The original "Adaptive layout mapping" toggle was decorative
// for shipped defaults because every entry was a bare-string (physical)
// chord, and bindingToDispatchChord short-circuits physical mode. Keeping
// printable defaults as `mode: "logical"` is what makes the toggle move
// them on non-US layouts.

const NAMED_TERMINAL_TOKENS = new Set([
	"enter",
	"escape",
	"backspace",
	"delete",
	"tab",
	"space",
	"up",
	"down",
	"left",
	"right",
	"arrowup",
	"arrowdown",
	"arrowleft",
	"arrowright",
	"home",
	"end",
	"pageup",
	"pagedown",
	"insert",
]);

function isFunctionKey(token: string): boolean {
	return /^f([1-9]|1[0-2])$/.test(token);
}

function terminalToken(chord: string): string {
	const parts = chord.split("+");
	return parts[parts.length - 1] ?? "";
}

function* allBindings(): Generator<{
	id: string;
	platform: "mac" | "windows" | "linux";
	binding: unknown;
}> {
	for (const [id, def] of Object.entries(HOTKEYS_REGISTRY)) {
		for (const platform of ["mac", "windows", "linux"] as const) {
			yield { id, platform, binding: def.key[platform] };
		}
	}
}

describe("HOTKEYS_REGISTRY shape", () => {
	it("authors printable defaults as mode: 'logical'", () => {
		const offenders: string[] = [];
		for (const { id, platform, binding } of allBindings()) {
			if (binding === null) continue;
			if (typeof binding !== "string") continue; // v2 objects checked below

			const token = terminalToken(binding);
			const isLayoutStable =
				NAMED_TERMINAL_TOKENS.has(token) || isFunctionKey(token);
			if (!isLayoutStable) {
				offenders.push(`${id}.${platform}=${binding}`);
			}
		}
		// If this fires: a printable chord ('meta+t', 'ctrl+shift+0', 'meta+slash')
		// was authored as a bare string, which parses as physical mode and bypasses
		// the adaptive-layout toggle. Wrap it with the L() helper in registry.ts.
		expect(offenders).toEqual([]);
	});

	it("keeps every logical entry pinned to v2 / logical mode", () => {
		for (const { id, platform, binding } of allBindings()) {
			if (binding === null) continue;
			if (typeof binding === "string") continue;
			expect({ id, platform, binding }).toMatchObject({
				binding: { version: 2, mode: "logical" },
			});
		}
	});

	it("keeps named-key chords as bare strings (layout-stable, no L() needed)", () => {
		// Chords whose terminal is a named key gain nothing from logical mode —
		// translateLogicalChord short-circuits named keys. Authoring them as
		// bare strings keeps the registry terse.
		for (const { id, platform, binding } of allBindings()) {
			if (typeof binding !== "string") continue;
			const token = terminalToken(binding);
			const isLayoutStable =
				NAMED_TERMINAL_TOKENS.has(token) || isFunctionKey(token);
			if (!isLayoutStable) {
				throw new Error(
					`${id}.${platform}=${binding} is a bare string but its terminal token is not a named key — wrap with L() in registry.ts`,
				);
			}
		}
	});

	it("includes a canary letter, digit, and punctuation default in logical mode", () => {
		// Sample three different terminal-token shapes so a partial regression
		// (e.g. only digits revert to physical) gets caught here too.
		expect(HOTKEYS_REGISTRY.QUICK_OPEN.key.mac).toMatchObject({
			mode: "logical",
			chord: "meta+p",
		});
		expect(HOTKEYS_REGISTRY.JUMP_TO_WORKSPACE_1.key.mac).toMatchObject({
			mode: "logical",
			chord: "meta+1",
		});
		expect(HOTKEYS_REGISTRY.OPEN_SETTINGS.key.mac).toMatchObject({
			mode: "logical",
			chord: "meta+comma",
		});
	});

	it("registers MRU view switching on layout-stable Tab chords", () => {
		expect(HOTKEYS_REGISTRY.SWITCH_DASHBOARD_VIEW_NEXT.key.mac).toBe("alt+tab");
		expect(HOTKEYS_REGISTRY.SWITCH_DASHBOARD_VIEW_PREVIOUS.key.mac).toBe(
			"alt+shift+tab",
		);
	});

	it("registers native session view toggles as discoverable Option shortcuts", () => {
		expect(HOTKEYS_REGISTRY.TOGGLE_NATIVE_BROWSER_VIEW.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+b",
		});
		expect(HOTKEYS_REGISTRY.TOGGLE_NATIVE_SPLIT_VIEW.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+s",
		});
		expect(HOTKEYS_REGISTRY.NARROW_PANE_SPLIT.key.mac).toMatchObject({
			mode: "logical",
			chord: "meta+alt+bracketleft",
		});
		expect(HOTKEYS_REGISTRY.WIDEN_PANE_SPLIT.key.mac).toMatchObject({
			mode: "logical",
			chord: "meta+alt+bracketright",
		});
		expect(HOTKEYS_REGISTRY.OPEN_WORKSPACES.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+w",
		});
		expect(HOTKEYS_REGISTRY.TOGGLE_VIM_MODE.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+v",
		});
		expect(HOTKEYS_REGISTRY.SHOW_DASHBOARD_KEYBOARD_HELP.key.mac).toMatchObject(
			{
				mode: "logical",
				chord: "alt+slash",
			},
		);
		expect(HOTKEYS_REGISTRY.SHOW_DASHBOARD_ACTION_HINTS.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+f",
		});
		expect(HOTKEYS_REGISTRY.OPEN_UNREAD_NATIVE_REPLY.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+n",
		});
		expect(HOTKEYS_REGISTRY.CREATE_CAPY.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+shift+c",
		});
		expect(HOTKEYS_REGISTRY.CREATE_DEVIN.key.mac).toMatchObject({
			mode: "logical",
			chord: "alt+shift+d",
		});
		expect(
			HOTKEYS_REGISTRY.MARK_LATEST_NATIVE_REPLY_READ.key.mac,
		).toMatchObject({
			mode: "logical",
			chord: "alt+shift+n",
		});
	});
});
