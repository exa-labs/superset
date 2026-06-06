import type { NativeAgentProvider } from "./native-agent-ui";

export const DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT =
	"dashboard-native-agent-current-action";

export type NativeAgentCurrentAction =
	| "archive"
	| "close-split"
	| "equalize-split"
	| "focus-composer"
	| "hide"
	| "mark-read"
	| "narrow-native-split"
	| "new"
	| "open-browser"
	| "open-external"
	| "pin"
	| "refresh"
	| "rename"
	| "show"
	| "sync-capy"
	| "swap-split"
	| "toggle-browser"
	| "toggle-diagnostics"
	| "toggle-split"
	| "unpin"
	| "widen-native-split";

export interface NativeAgentCurrentActionEventDetail {
	action: NativeAgentCurrentAction;
	provider?: NativeAgentProvider;
}

const NATIVE_AGENT_CURRENT_ACTIONS = new Set<string>([
	"archive",
	"close-split",
	"equalize-split",
	"focus-composer",
	"hide",
	"mark-read",
	"narrow-native-split",
	"new",
	"open-browser",
	"open-external",
	"pin",
	"refresh",
	"rename",
	"show",
	"sync-capy",
	"swap-split",
	"toggle-browser",
	"toggle-diagnostics",
	"toggle-split",
	"unpin",
	"widen-native-split",
]);

export function isNativeAgentCurrentAction(
	value: unknown,
): value is NativeAgentCurrentAction {
	return typeof value === "string" && NATIVE_AGENT_CURRENT_ACTIONS.has(value);
}

export function nativeAgentCurrentActionEventDetail(
	event: Event,
): NativeAgentCurrentActionEventDetail | null {
	const detail = (
		event as CustomEvent<Partial<NativeAgentCurrentActionEventDetail>>
	).detail;
	if (!detail || !isNativeAgentCurrentAction(detail.action)) return null;
	if (
		detail.provider != null &&
		detail.provider !== "capy" &&
		detail.provider !== "devin"
	) {
		return null;
	}
	return {
		action: detail.action,
		provider: detail.provider,
	};
}

export function dispatchNativeAgentCurrentAction(
	detail: NativeAgentCurrentActionEventDetail,
): boolean {
	if (typeof window === "undefined") return false;
	const event = new CustomEvent(DASHBOARD_NATIVE_AGENT_CURRENT_ACTION_EVENT, {
		cancelable: true,
		detail,
	});
	window.dispatchEvent(event);
	return event.defaultPrevented;
}
