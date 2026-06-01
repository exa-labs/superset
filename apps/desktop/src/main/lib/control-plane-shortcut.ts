import type { Input } from "electron";

type ControlPlaneShortcutInput = Pick<
	Input,
	| "alt"
	| "code"
	| "control"
	| "isAutoRepeat"
	| "key"
	| "meta"
	| "shift"
	| "type"
>;

export function isOpenControlPlaneShortcutInput(
	input: ControlPlaneShortcutInput,
): boolean {
	if (input.type !== "keyDown" && input.type !== "rawKeyDown") return false;
	if (input.isAutoRepeat) return false;
	if (!input.alt || input.control || input.meta || input.shift) return false;

	const code = input.code.toLowerCase();
	if (code === "keyk") return true;

	// Some synthetic callers only fill `key`; real macOS Option+K can report a
	// dead-key glyph here, so `code` remains the primary matcher.
	const key = input.key.toLowerCase();
	return key === "k" || key === "dead" || key === "˚";
}
