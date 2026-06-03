export const DASHBOARD_KEYBOARD_CHAIN_RESET_EVENT =
	"dashboard-keyboard-chain-reset";

export type DashboardKeyboardChainResetReason =
	| "control-plane"
	| "global-keyboard-action";

export function dispatchDashboardKeyboardChainReset(
	reason: DashboardKeyboardChainResetReason,
): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent(DASHBOARD_KEYBOARD_CHAIN_RESET_EVENT, {
			detail: { reason },
		}),
	);
}

export function addDashboardKeyboardChainResetListener(
	listener: (reason: DashboardKeyboardChainResetReason) => void,
): () => void {
	if (typeof window === "undefined") return () => {};

	const handleReset = (event: Event) => {
		const reason = (event as CustomEvent<{ reason?: unknown }>).detail?.reason;
		listener(
			reason === "control-plane" || reason === "global-keyboard-action"
				? reason
				: "global-keyboard-action",
		);
	};

	window.addEventListener(DASHBOARD_KEYBOARD_CHAIN_RESET_EVENT, handleReset);
	return () =>
		window.removeEventListener(
			DASHBOARD_KEYBOARD_CHAIN_RESET_EVENT,
			handleReset,
		);
}
