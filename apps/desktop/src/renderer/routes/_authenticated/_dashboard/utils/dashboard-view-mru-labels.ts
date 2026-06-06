import {
	type NativeAgentProvider,
	nativeAgentConversationLabel,
	nativeAgentProviderTitle,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-ui";
import {
	dashboardQuickTerminalTitle,
	isDashboardQuickTerminalId,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-quick-terminals";
import type {
	DashboardViewMruEntryLabel,
	DashboardViewMruEntryLabelResolver,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-view-mru";
import {
	type DashboardWebPage,
	getDashboardWebPage,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	type DashboardWebTab,
	type DashboardWebTabFolder,
	getDashboardWebTab,
	getDashboardWebTabApp,
	getDashboardWebTabFolder,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";

interface DashboardViewMruLabelContext {
	getNativeSessionSidebarTitle?: (
		provider: NativeAgentProvider,
		id: string,
	) => string | null;
	getQuickTerminalTitle?: (id: string) => string | null;
	getWebPage?: (id: string | undefined) => DashboardWebPage | null;
	getWebTab?: (id: string | undefined) => DashboardWebTab | null;
	getWebTabFolder?: (
		id: string | null | undefined,
	) => DashboardWebTabFolder | null;
}

function segmentAt(path: string, index: number): string | null {
	return path.split("/").filter(Boolean)[index] ?? null;
}

function titleCaseSegment(value: string): string {
	return decodeURIComponent(value)
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isNativeAgentProvider(
	value: string | null,
): value is NativeAgentProvider {
	return value === "capy" || value === "devin";
}

function browserTitleForWebTab(tab: DashboardWebTab): string {
	const title = tab.isTitleCustomized
		? tab.title
		: (tab.browserTitle ?? tab.title);
	return title.trim() || getDashboardWebTabApp(tab.appId).label;
}

function subtitleForWebTab(
	tab: DashboardWebTab,
	folder: DashboardWebTabFolder | null,
): string {
	const app = getDashboardWebTabApp(tab.appId);
	return [app.label, folder?.title, tab.url].filter(Boolean).join(" · ");
}

function readNativeSessionSidebarTitle(
	provider: NativeAgentProvider,
	id: string,
): string | null {
	if (typeof document === "undefined") return null;
	const rows = document.querySelectorAll<HTMLElement>(
		"[data-native-agent-session-row-id]",
	);
	for (const row of rows) {
		if (
			row.dataset.nativeAgentSessionRowProvider !== provider ||
			row.dataset.nativeAgentSessionRowId !== id
		) {
			continue;
		}
		const title = row.title.split("\n")[0]?.trim();
		if (title) return title;
	}
	return null;
}

function quickTerminalTitle(id: string): string | null {
	return isDashboardQuickTerminalId(id)
		? dashboardQuickTerminalTitle(id)
		: null;
}

const DEFAULT_LABEL_CONTEXT = {
	getNativeSessionSidebarTitle: readNativeSessionSidebarTitle,
	getQuickTerminalTitle: quickTerminalTitle,
	getWebPage: getDashboardWebPage,
	getWebTab: getDashboardWebTab,
	getWebTabFolder: getDashboardWebTabFolder,
} satisfies Required<DashboardViewMruLabelContext>;

export function resolveDashboardViewMruRegistryLabel(
	path: string,
	context: DashboardViewMruLabelContext = DEFAULT_LABEL_CONTEXT,
): DashboardViewMruEntryLabel | null {
	const first = segmentAt(path, 0);
	const second = segmentAt(path, 1);

	if (first === "web") {
		const page = context.getWebPage?.(second ?? undefined);
		if (!page) return null;
		return {
			subtitle: page.url,
			title: page.shortLabel || page.label,
		};
	}

	if (first === "web-tabs") {
		const tab = context.getWebTab?.(second ?? undefined);
		if (!tab) return null;
		const folder = context.getWebTabFolder?.(tab.folderId) ?? null;
		return {
			subtitle: subtitleForWebTab(tab, folder),
			title: browserTitleForWebTab(tab),
		};
	}

	if (first === "native" && isNativeAgentProvider(second)) {
		const id = segmentAt(path, 2);
		const providerTitle = nativeAgentProviderTitle(second);
		if (!id) {
			return {
				subtitle: `${providerTitle} ${nativeAgentConversationLabel(second, {
					plural: true,
				})}`,
				title: providerTitle,
			};
		}
		return {
			subtitle: id,
			title:
				context.getNativeSessionSidebarTitle?.(second, id) ??
				`${providerTitle} ${nativeAgentConversationLabel(second)}`,
		};
	}

	if (first === "v2-workspaces") {
		return {
			subtitle: "Dashboard",
			title: "Workspaces",
		};
	}

	if (first === "workspace" || first === "v2-workspace") {
		return {
			subtitle: second ?? "Local workspace",
			title: "Workspace",
		};
	}

	if (first === "root-terminal" && second) {
		const title = context.getQuickTerminalTitle?.(second);
		if (!title) return null;
		return {
			subtitle: "Root terminal",
			title: `${title} kr9`,
		};
	}

	if (first === "tasks") {
		return {
			subtitle: second ? `Task ${second}` : "Dashboard",
			title: "Tasks & PRs",
		};
	}

	if (first === "automations") {
		return {
			subtitle: second ? `Automation ${second}` : "Dashboard",
			title: "Automations",
		};
	}

	if (first === "settings") {
		return {
			subtitle: "Settings",
			title: second ? `${titleCaseSegment(second)} settings` : "Settings",
		};
	}

	return null;
}

export const dashboardViewMruRegistryLabelResolver: DashboardViewMruEntryLabelResolver =
	(path) => resolveDashboardViewMruRegistryLabel(path);
