export const COMMAND_PALETTE_INPUT_SELECTOR =
	'[data-command-palette-root="global"] [data-command-palette-input="true"]';

export function focusCommandPaletteInput(): boolean {
	if (typeof document === "undefined") return false;

	const input = document.querySelector<HTMLInputElement>(
		COMMAND_PALETTE_INPUT_SELECTOR,
	);
	if (!input) return false;

	input.focus({ preventScroll: true });
	input.select();
	return true;
}

export function scheduleCommandPaletteInputFocus(): void {
	if (typeof window === "undefined") {
		queueMicrotask(focusCommandPaletteInput);
		return;
	}

	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(focusCommandPaletteInput);
	});
}
