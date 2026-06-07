import type { NativeAgentProvider } from "./native-agent-ui";

export interface NativeAgentRouteMatch {
	id: string | null;
	provider: NativeAgentProvider | null;
}

export function activeNativeAgentRoute(
	pathname: string,
): NativeAgentRouteMatch {
	const capyMatch = /\/native\/capy\/([^/]+)/.exec(pathname);
	if (capyMatch?.[1]) {
		return { id: decodeURIComponent(capyMatch[1]), provider: "capy" };
	}

	const devinMatch = /\/native\/devin\/([^/]+)/.exec(pathname);
	if (devinMatch?.[1]) {
		return { id: decodeURIComponent(devinMatch[1]), provider: "devin" };
	}

	if (pathname.includes("/native/capy")) return { id: null, provider: "capy" };
	if (pathname.includes("/native/devin"))
		return { id: null, provider: "devin" };
	return { id: null, provider: null };
}

export function isNativeAgentProviderOverviewRoute(
	route: NativeAgentRouteMatch,
	provider: NativeAgentProvider,
): boolean {
	return route.provider === provider && route.id == null;
}
