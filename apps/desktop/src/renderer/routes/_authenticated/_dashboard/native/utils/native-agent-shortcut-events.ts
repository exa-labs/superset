import type { NativeAgentProvider } from "./native-agent-ui";

export const DASHBOARD_NATIVE_AGENT_OPEN_INDEX_EVENT =
	"dashboard-native-agent-open-index";

export interface DashboardNativeAgentOpenIndexEventDetail {
	index: number;
	provider: NativeAgentProvider;
}

export function dispatchDashboardNativeAgentOpenIndex(
	detail: DashboardNativeAgentOpenIndexEventDetail,
): boolean {
	if (typeof window === "undefined") return false;
	const event = new CustomEvent(DASHBOARD_NATIVE_AGENT_OPEN_INDEX_EVENT, {
		cancelable: true,
		detail,
	});
	return window.dispatchEvent(event) === false;
}

export function dashboardNativeAgentOpenIndexDetail(
	event: Event,
): DashboardNativeAgentOpenIndexEventDetail | null {
	const detail = (
		event as CustomEvent<Partial<DashboardNativeAgentOpenIndexEventDetail>>
	).detail;
	if (!detail) return null;
	if (detail.provider !== "capy" && detail.provider !== "devin") return null;
	const index = detail.index;
	if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
		return null;
	}
	return {
		index,
		provider: detail.provider,
	};
}
