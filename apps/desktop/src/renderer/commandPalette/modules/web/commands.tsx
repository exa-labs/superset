import { PlusIcon } from "lucide-react";
import type { HotkeyId } from "renderer/hotkeys/registry";
import {
	NATIVE_AGENT_FOLDER_COLORS,
	type NativeAgentFolderProvider,
	readNativeAgentFoldersFromLocalStorage,
	readNativeAgentRecentFolderColorsFromLocalStorage,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-folders";
import { readLatestNativeAgentReplyNotification } from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-notifications";
import {
	DASHBOARD_QUICK_TERMINALS,
	dashboardQuickTerminalCommand,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-quick-terminals";
import { getDashboardWebPageFavicon } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-page-favicons";
import { DASHBOARD_WEB_PAGES } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	createDashboardWebTab,
	DASHBOARD_WEB_TAB_APPS,
	getDashboardWebTabApp,
	getDashboardWebTabFavicon,
	getDashboardWebTabs,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import type {
	Command,
	CommandContext,
	CommandProvider,
} from "../../core/types";

type NativeAgentProvider = "capy" | "devin";
type NativeFolderAction =
	| "color"
	| "create"
	| "delete"
	| "move-active"
	| "remove-active"
	| "rename";
type NativeOverviewFilter =
	| "active"
	| "all"
	| "finished"
	| "hidden"
	| "pinned"
	| "unread";

function dispatchNativeAgentAction(
	action:
		| "hide"
		| "new"
		| "pin"
		| "refresh"
		| "rename"
		| "show"
		| "sync-capy"
		| "toggle-browser"
		| "toggle-diagnostics"
		| "toggle-split"
		| "unpin",
	provider?: NativeAgentProvider | null,
) {
	window.dispatchEvent(
		new CustomEvent("dashboard-native-agent-current-action", {
			detail: { action, provider },
		}),
	);
}

function dispatchNativeAgentCreate(provider: NativeAgentProvider) {
	window.dispatchEvent(
		new CustomEvent("dashboard-native-agent-create", {
			detail: { provider },
		}),
	);
}

function dispatchNativeOverviewFilter(
	provider: NativeAgentProvider,
	filter: NativeOverviewFilter,
) {
	window.dispatchEvent(
		new CustomEvent("dashboard-native-agent-overview-filter", {
			detail: { filter, provider },
		}),
	);
}

function dispatchNativeFolderAction(
	provider: NativeAgentProvider | null,
	action: NativeFolderAction,
	folderId?: string,
	color?: string,
) {
	window.dispatchEvent(
		new CustomEvent("dashboard-native-agent-folder-action", {
			detail: { action, color, folderId, provider },
		}),
	);
}

function dispatchBrowserAction(
	action:
		| "close-current-tab"
		| "new-chatgpt-tab"
		| "new-claude-tab"
		| "new-current-url-tab"
		| "new-google-tab"
		| "reload"
		| "toggle-split",
) {
	window.dispatchEvent(
		new CustomEvent("dashboard-browser-current-action", {
			detail: { action },
		}),
	);
}

function nativeProviderFromPathname(
	pathname: string,
): NativeAgentProvider | null {
	if (pathname.includes("/native/capy")) return "capy";
	if (pathname.includes("/native/devin")) return "devin";
	return null;
}

function openNativeOverviewFilter(
	context: CommandContext,
	provider: NativeAgentProvider,
	filter: NativeOverviewFilter,
) {
	context.navigate(provider === "capy" ? "/native/capy" : "/native/devin");
	window.setTimeout(() => dispatchNativeOverviewFilter(provider, filter), 0);
	window.setTimeout(() => dispatchNativeOverviewFilter(provider, filter), 150);
}

const NATIVE_FILTER_COMMANDS: Array<{
	filter: NativeOverviewFilter;
	keywords: string[];
	title: string;
}> = [
	{
		filter: "all",
		keywords: ["all", "overview", "threads", "sessions"],
		title: "Open all",
	},
	{
		filter: "active",
		keywords: ["active", "running", "working"],
		title: "Open active",
	},
	{
		filter: "unread",
		keywords: ["unread", "reply", "notification"],
		title: "Open unread",
	},
	{
		filter: "pinned",
		keywords: ["pinned", "sidebar", "saved"],
		title: "Open pinned",
	},
	{
		filter: "hidden",
		keywords: ["hidden", "overview", "archived"],
		title: "Open hidden",
	},
	{
		filter: "finished",
		keywords: ["finished", "done", "completed"],
		title: "Open finished",
	},
];

function nativeProviderIconUrl(provider: NativeAgentProvider): string {
	return provider === "capy"
		? "https://capy.ai/_marketing/favicon/favicon-96x96.png"
		: "https://app.devin.ai/favicon.ico";
}

function nativeProviderTitle(provider: NativeAgentProvider): string {
	return provider === "capy" ? "Capy" : "Devin";
}

function nativeConversationNoun(
	provider: NativeAgentProvider,
	filter: NativeOverviewFilter,
): string {
	if (provider === "capy") return filter === "unread" ? "replies" : "threads";
	return filter === "unread" ? "replies" : "sessions";
}

function nativeFolderCommandColors(): string[] {
	return [
		...new Set([
			...NATIVE_AGENT_FOLDER_COLORS,
			...readNativeAgentRecentFolderColorsFromLocalStorage(),
		]),
	];
}

export const webProvider: CommandProvider = {
	id: "web",
	provide: (context) => {
		const commands: Command[] = DASHBOARD_WEB_PAGES.map((page) => ({
			id: `web.page.${page.id}`,
			title: `Open ${page.label}`,
			section: "web",
			iconUrl: getDashboardWebPageFavicon(page) ?? undefined,
			hotkeyId: page.hotkeyId as HotkeyId,
			description: page.url,
			keywords: [
				page.shortLabel,
				page.label,
				page.url,
				"dashboard",
				"pinned",
				"web",
			],
			run: (context) => context.navigate(`/web/${page.id}`),
		}));

		for (const app of DASHBOARD_WEB_TAB_APPS) {
			commands.push({
				id: `web.${app.id}.new`,
				title: `Create new ${app.label} tab`,
				section: "web",
				icon: PlusIcon,
				iconUrl: app.fallbackFaviconUrl,
				hotkeyId: app.id === "chrome" ? "OPEN_CHROME" : undefined,
				description: app.url,
				keywords: [app.label, app.id, "google", "new", "browser", "tab", "web"],
				run: (context) => {
					const tab = createDashboardWebTab(app.id);
					context.navigate(`/web-tabs/${tab.id}`);
				},
			});
		}

		for (const terminal of DASHBOARD_QUICK_TERMINALS) {
			commands.push({
				id: `terminal.root.${terminal.id}`,
				title: `Open ${terminal.label} root terminal`,
				section: "web",
				description: `${dashboardQuickTerminalCommand(terminal.id)} in repo root`,
				keywords: [
					terminal.id,
					terminal.label,
					"kr9",
					"terminal",
					"shell",
					"repo",
					"root",
				],
				run: (context) => context.navigate(`/root-terminal/${terminal.id}`),
			});
		}

		commands.push(
			{
				id: "web.current.reload",
				title: "Reload current Chrome tab",
				section: "web",
				description: "Reload the active embedded Chrome tab",
				keywords: ["chrome", "browser", "reload", "refresh", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("reload"),
			},
			{
				id: "web.current.newFromCurrent",
				title: "New Chrome tab from current URL",
				section: "web",
				description: "Duplicate the active embedded Chrome tab",
				keywords: ["chrome", "browser", "duplicate", "same", "url", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-current-url-tab"),
			},
			{
				id: "web.current.newGoogle",
				title: "New Google tab",
				section: "web",
				iconUrl: "https://www.google.com/favicon.ico",
				description: "Open Google in a new embedded Chrome tab",
				keywords: ["chrome", "browser", "google", "search", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-google-tab"),
			},
			{
				id: "web.current.newChatGPT",
				title: "New ChatGPT tab",
				section: "web",
				description: "Open ChatGPT in a new embedded Chrome tab",
				keywords: ["chrome", "browser", "chatgpt", "openai", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-chatgpt-tab"),
			},
			{
				id: "web.current.newClaude",
				title: "New Claude tab",
				section: "web",
				description: "Open Claude in a new embedded Chrome tab",
				keywords: ["chrome", "browser", "claude", "anthropic", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-claude-tab"),
			},
			{
				id: "web.current.toggleSplit",
				title: "Toggle Chrome split view",
				section: "web",
				description: "Show two embedded Chrome tabs side by side",
				keywords: ["chrome", "browser", "split", "side by side", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("toggle-split"),
			},
			{
				id: "web.current.close",
				title: "Close current Chrome tab",
				section: "web",
				description: "Close the active embedded Chrome tab",
				keywords: ["chrome", "browser", "close", "remove", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("close-current-tab"),
			},
		);

		const currentNativeProvider = nativeProviderFromPathname(
			context.route.pathname,
		);
		const nativeFolders = readNativeAgentFoldersFromLocalStorage();
		const latestNativeReply = readLatestNativeAgentReplyNotification();

		commands.push(
			{
				id: "native.capy.open",
				title: "Open Capy",
				section: "web",
				iconUrl: nativeProviderIconUrl("capy"),
				hotkeyId: "OPEN_CAPY",
				description: "Use the Capy API in a native chat interface",
				keywords: ["capy", "capi", "native", "thread", "agent"],
				run: (context) => context.navigate("/native/capy"),
			},
			{
				id: "native.devin.open",
				title: "Open Devin",
				section: "web",
				iconUrl: nativeProviderIconUrl("devin"),
				hotkeyId: "OPEN_DEVIN",
				description: "Use the Devin API in a native chat interface",
				keywords: ["devin", "native", "session", "agent"],
				run: (context) => context.navigate("/native/devin"),
			},
			{
				id: "native.capy.create",
				title: "Create Capy thread",
				section: "web",
				icon: PlusIcon,
				iconUrl: nativeProviderIconUrl("capy"),
				description: "Open Capy Native and start a thread",
				keywords: ["capy", "capi", "native", "new", "thread", "agent"],
				run: (context) => {
					context.navigate("/native/capy");
					window.setTimeout(() => {
						dispatchNativeAgentCreate("capy");
					}, 0);
				},
			},
			{
				id: "native.devin.create",
				title: "Create Devin session",
				section: "web",
				icon: PlusIcon,
				iconUrl: nativeProviderIconUrl("devin"),
				description: "Open Devin Native and start a session",
				keywords: ["devin", "native", "new", "session", "agent"],
				run: (context) => {
					context.navigate("/native/devin");
					window.setTimeout(() => {
						dispatchNativeAgentCreate("devin");
					}, 0);
				},
			},
			{
				id: "native.capy.sync",
				title: "Sync Capy threads",
				section: "web",
				iconUrl: nativeProviderIconUrl("capy"),
				description:
					"Scan Capy for Lakee-created threads and update the local cache",
				keywords: [
					"capy",
					"capi",
					"sync",
					"refresh",
					"discover",
					"threads",
					"native",
				],
				run: (context) => {
					context.navigate("/native/capy");
					window.setTimeout(
						() =>
							window.dispatchEvent(
								new CustomEvent("dashboard-native-agent-current-action", {
									detail: { action: "sync-capy", provider: "capy" },
								}),
							),
						0,
					);
					window.setTimeout(
						() => dispatchNativeAgentAction("sync-capy", "capy"),
						150,
					);
				},
			},
		);

		for (const provider of ["capy", "devin"] as const) {
			for (const filterCommand of NATIVE_FILTER_COMMANDS) {
				const providerTitle = nativeProviderTitle(provider);
				const noun = nativeConversationNoun(provider, filterCommand.filter);
				commands.push({
					id: `native.${provider}.${filterCommand.filter}`,
					title: `${filterCommand.title} ${providerTitle} ${noun}`,
					section: "web",
					iconUrl: nativeProviderIconUrl(provider),
					description: `Open ${providerTitle} Native filtered to ${filterCommand.filter} ${noun}`,
					keywords: [
						provider,
						providerTitle,
						filterCommand.filter,
						...filterCommand.keywords,
						"native",
						noun,
					],
					run: (context) =>
						openNativeOverviewFilter(context, provider, filterCommand.filter),
				});
			}
		}

		if (latestNativeReply) {
			commands.push({
				id: "native.latestReply.open",
				title: `Open latest ${latestNativeReply.provider === "capy" ? "Capy" : "Devin"} reply`,
				section: "web",
				iconUrl:
					latestNativeReply.provider === "capy"
						? "https://capy.ai/_marketing/favicon/favicon-96x96.png"
						: "https://app.devin.ai/favicon.ico",
				description: `${latestNativeReply.title}: ${latestNativeReply.preview}`,
				keywords: [
					latestNativeReply.provider,
					"latest",
					"reply",
					"notification",
					"jump",
					"agent",
				],
				run: (context) =>
					context.navigate(
						latestNativeReply.provider === "capy"
							? `/native/capy/${latestNativeReply.id}`
							: `/native/devin/${latestNativeReply.id}`,
					),
			});
		}

		commands.push(
			{
				id: "native.current.new",
				title: "Create new current native session",
				section: "web",
				icon: PlusIcon,
				description:
					"Create a Capy thread or Devin session for the current native provider",
				keywords: ["capy", "devin", "new", "create", "native", "agent"],
				shortcutLabel: "n",
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) => {
					const provider = nativeProviderFromPathname(context.route.pathname);
					if (provider) dispatchNativeAgentCreate(provider);
				},
			},
			{
				id: "native.current.refresh",
				title: "Refresh current native agent",
				section: "web",
				description: "Refresh Capy or Devin data for the current view",
				keywords: ["capy", "devin", "refresh", "reload", "native"],
				shortcutLabel: "R",
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) =>
					dispatchNativeAgentAction(
						"refresh",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.pin",
				title: "Pin current native session",
				section: "web",
				description: "Keep the current Capy/Devin conversation in the sidebar",
				keywords: ["capy", "devin", "pin", "sidebar", "native"],
				shortcutLabel: "p",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"pin",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.unpin",
				title: "Unpin current native session",
				section: "web",
				description:
					"Let the current conversation leave the sidebar automatically",
				keywords: ["capy", "devin", "unpin", "sidebar", "native"],
				shortcutLabel: "p",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"unpin",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.rename",
				title: "Rename current native session",
				section: "web",
				description: "Set a local title for the current Capy/Devin session",
				keywords: ["capy", "devin", "rename", "title", "session", "native"],
				shortcutLabel: "e",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"rename",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.hide",
				title: "Move current native session to overview",
				section: "web",
				description:
					"Hide the current Capy/Devin conversation from the sidebar",
				keywords: ["capy", "devin", "hide", "overview", "sidebar"],
				shortcutLabel: "x",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"hide",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.show",
				title: "Show current native session in sidebar",
				section: "web",
				description:
					"Move the current Capy/Devin conversation back to the sidebar",
				keywords: ["capy", "devin", "show", "overview", "sidebar"],
				shortcutLabel: "p",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"show",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.toggleBrowser",
				title: "Toggle native/browser view",
				section: "web",
				hotkeyId: "TOGGLE_NATIVE_BROWSER_VIEW",
				description:
					"Switch the current native session between chat and browser",
				keywords: ["capy", "devin", "browser", "native", "toggle"],
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"toggle-browser",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.toggleSplit",
				title: "Toggle native split view",
				section: "web",
				hotkeyId: "TOGGLE_NATIVE_SPLIT_VIEW",
				description: "Show the current native chat and browser side by side",
				keywords: ["capy", "devin", "browser", "native", "split", "side"],
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"toggle-split",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.toggleDiagnostics",
				title: "Toggle native diagnostics",
				section: "web",
				description: "Show native Capy/Devin freshness and inclusion details",
				keywords: ["capy", "devin", "diagnostics", "debug", "freshness"],
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) =>
					dispatchNativeAgentAction(
						"toggle-diagnostics",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.folder.create",
				title: "Create native folder",
				section: "web",
				description: "Create a folder for the current Capy/Devin section",
				keywords: ["capy", "devin", "folder", "create", "native"],
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) =>
					dispatchNativeFolderAction(
						nativeProviderFromPathname(context.route.pathname),
						"create",
					),
			},
			{
				id: "native.folder.rename",
				title: "Rename native folder",
				section: "web",
				description: "Rename the last selected folder for this native provider",
				keywords: ["capy", "devin", "folder", "rename", "native"],
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) =>
					dispatchNativeFolderAction(
						nativeProviderFromPathname(context.route.pathname),
						"rename",
					),
			},
			{
				id: "native.folder.color",
				title: "Change native folder color",
				section: "web",
				description: "Cycle the last selected native folder color",
				keywords: ["capy", "devin", "folder", "color", "native"],
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) =>
					dispatchNativeFolderAction(
						nativeProviderFromPathname(context.route.pathname),
						"color",
					),
			},
			{
				id: "native.folder.delete",
				title: "Delete native folder",
				section: "web",
				description:
					"Delete the last selected native folder after confirmation",
				keywords: ["capy", "devin", "folder", "delete", "native"],
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) =>
					dispatchNativeFolderAction(
						nativeProviderFromPathname(context.route.pathname),
						"delete",
					),
			},
			{
				id: "native.folder.moveCurrent",
				title: "Move current native session to folder",
				section: "web",
				description:
					"Move the current Capy/Devin session to the last selected folder",
				keywords: ["capy", "devin", "folder", "move", "native"],
				shortcutLabel: "m",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeFolderAction(
						nativeProviderFromPathname(context.route.pathname),
						"move-active",
					),
			},
			{
				id: "native.folder.removeCurrent",
				title: "Move current native session out of folder",
				section: "web",
				description: "Return the current Capy/Devin session to the main list",
				keywords: [
					"capy",
					"devin",
					"folder",
					"remove",
					"out",
					"overview",
					"native",
				],
				shortcutLabel: "F",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeFolderAction(
						nativeProviderFromPathname(context.route.pathname),
						"remove-active",
					),
			},
		);

		for (const folder of nativeFolders) {
			const provider = folder.provider as NativeAgentFolderProvider;
			const providerTitle =
				provider === "capy" ? "Capy" : provider === "devin" ? "Devin" : null;
			if (!providerTitle) continue;
			const isCurrentProvider = currentNativeProvider === provider;
			commands.push(
				{
					id: `native.folder.${folder.id}.moveCurrent`,
					title: `Move current session to ${folder.title}`,
					section: "web",
					description: `${providerTitle} folder`,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"move",
						"native",
					],
					when: () => isCurrentProvider,
					run: () =>
						dispatchNativeFolderAction(provider, "move-active", folder.id),
				},
				{
					id: `native.folder.${folder.id}.rename`,
					title: `Rename ${folder.title}`,
					section: "web",
					description: `${providerTitle} folder`,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"rename",
						"native",
					],
					when: () => isCurrentProvider,
					run: () => dispatchNativeFolderAction(provider, "rename", folder.id),
				},
				{
					id: `native.folder.${folder.id}.color`,
					title: `Change ${folder.title} color`,
					section: "web",
					description: `${providerTitle} folder`,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"color",
						"native",
					],
					when: () => isCurrentProvider,
					run: () => dispatchNativeFolderAction(provider, "color", folder.id),
				},
				{
					id: `native.folder.${folder.id}.delete`,
					title: `Delete ${folder.title}`,
					section: "web",
					description: `${providerTitle} folder`,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"delete",
						"native",
					],
					when: () => isCurrentProvider,
					run: () => dispatchNativeFolderAction(provider, "delete", folder.id),
				},
			);

			for (const color of nativeFolderCommandColors()) {
				commands.push({
					id: `native.folder.${folder.id}.color.${color.slice(1)}`,
					title: `Set ${folder.title} color to ${color}`,
					section: "web",
					description: `${providerTitle} folder`,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						color,
						"folder",
						"color",
						"native",
					],
					when: () => isCurrentProvider,
					run: () =>
						dispatchNativeFolderAction(provider, "color", folder.id, color),
				});
			}
		}

		for (const tab of getDashboardWebTabs()) {
			const app = getDashboardWebTabApp(tab.appId);
			commands.push({
				id: `web.tab.${tab.id}`,
				title: `${app.label}: ${tab.title}`,
				section: "web",
				iconUrl: getDashboardWebTabFavicon(tab) ?? undefined,
				description: tab.url,
				keywords: [
					app.label,
					app.id,
					tab.title,
					tab.browserTitle ?? "",
					tab.url,
					"session",
					"tab",
					"web",
					"capi",
				],
				run: (context) => context.navigate(`/web-tabs/${tab.id}`),
			});
		}

		return commands;
	},
};
