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

export function openControlPlaneAccelerator(
	platform: NodeJS.Platform = process.platform,
): string {
	return platform === "darwin" ? "Alt+K" : "Ctrl+Alt+K";
}

function isShortcutKeyDownType(type: string): boolean {
	return type === "keyDown" || type === "rawKeyDown" || type === "char";
}

export function isOpenControlPlaneShortcutInput(
	input: ControlPlaneShortcutInput,
	platform: NodeJS.Platform = process.platform,
): boolean {
	if (!isShortcutKeyDownType(input.type)) return false;
	if (input.isAutoRepeat) return false;
	if (!input.alt || input.meta || input.shift) return false;
	if (platform === "darwin" ? input.control : !input.control) return false;

	const code = input.code.toLowerCase();
	if (code === "keyk") return true;
	if (code && code !== "unidentified") return false;

	// Some synthetic callers only fill `key`; real macOS Option+K can report a
	// dead-key glyph here, so `code` remains the primary matcher.
	const key = input.key.toLowerCase();
	return key === "k" || key === "dead" || key === "˚";
}
