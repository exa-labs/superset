import type { NativeAgentProvider } from "./native-agent-ui";

export interface DashboardNativeAgentCurrentSessionState {
	id: string;
	provider: NativeAgentProvider;
	sidebarHidden: boolean;
	sidebarPinned: boolean;
	title?: string | null;
}

const DASHBOARD_NATIVE_AGENT_CURRENT_SESSION_STATE_KEY =
	"__dashboardNativeAgentCurrentSessionState";

type DashboardNativeAgentCurrentSessionStateWindow = Window & {
	[DASHBOARD_NATIVE_AGENT_CURRENT_SESSION_STATE_KEY]?: DashboardNativeAgentCurrentSessionState | null;
};

function currentWindow():
	| DashboardNativeAgentCurrentSessionStateWindow
	| undefined {
	return typeof window === "undefined"
		? undefined
		: (window as DashboardNativeAgentCurrentSessionStateWindow);
}

export function nativeAgentSessionRoute(
	pathname: string,
): Pick<DashboardNativeAgentCurrentSessionState, "id" | "provider"> | null {
	const match = pathname.match(/^\/native\/(capy|devin)\/([^/?#]+)/);
	if (!match?.[1] || !match[2]) return null;
	return {
		id: decodeURIComponent(match[2]),
		provider: match[1] as NativeAgentProvider,
	};
}

export function publishDashboardNativeAgentCurrentSessionState(
	state: DashboardNativeAgentCurrentSessionState | null,
): void {
	const targetWindow = currentWindow();
	if (!targetWindow) return;
	targetWindow[DASHBOARD_NATIVE_AGENT_CURRENT_SESSION_STATE_KEY] = state;
	targetWindow.dispatchEvent(
		new CustomEvent("dashboard-native-agent-current-session-state", {
			detail: state,
		}),
	);
}

export function readDashboardNativeAgentCurrentSessionState(
	pathname: string,
): DashboardNativeAgentCurrentSessionState | null {
	const route = nativeAgentSessionRoute(pathname);
	if (!route) return null;
	const state =
		currentWindow()?.[DASHBOARD_NATIVE_AGENT_CURRENT_SESSION_STATE_KEY] ?? null;
	if (!state || state.provider !== route.provider || state.id !== route.id) {
		return null;
	}
	return state;
}
