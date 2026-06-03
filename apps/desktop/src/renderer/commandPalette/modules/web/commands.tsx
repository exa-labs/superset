import { PlusIcon, TerminalIcon } from "lucide-react";
import type { HotkeyId } from "renderer/hotkeys/registry";
import {
	NATIVE_AGENT_FOLDER_COLORS,
	type NativeAgentFolderProvider,
	readNativeAgentFoldersFromLocalStorage,
	readNativeAgentRecentFolderColorsFromLocalStorage,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-folders";
import {
	isNativeAgentReplyNotificationRead,
	markNativeAgentReplyNotificationRead,
	readLatestNativeAgentReplyNotification,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-notifications";
import {
	DASHBOARD_QUICK_TERMINALS,
	dashboardQuickTerminalCommand,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-quick-terminals";
import { getDashboardWebPageFavicon } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-page-favicons";
import { DASHBOARD_WEB_PAGES } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	closeDashboardWebTab,
	createDashboardWebTab,
	DASHBOARD_WEB_TAB_APPS,
	getDashboardWebTab,
	getDashboardWebTabApp,
	getDashboardWebTabFavicon,
	getDashboardWebTabFolders,
	getDashboardWebTabs,
	moveDashboardWebTabToFolder,
	setDashboardWebTabPinned,
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

const CONTROL_PLANE_PRIORITY = {
	browserCurrent: 270,
	nativeCreate: 230,
	nativeCurrent: 260,
	nativeCurrentPrimary: 280,
	nativeCurrentSecondary: 240,
	nativeFilter: 120,
	nativeFolder: 180,
	nativeOpen: 220,
	pinnedWebPage: 150,
	quickTerminal: 160,
	unreadNativeReply: 300,
	webTab: 90,
} as const;

function dispatchNativeAgentAction(
	action:
		| "equalize-split"
		| "focus-composer"
		| "hide"
		| "narrow-native-split"
		| "new"
		| "open-browser"
		| "open-external"
		| "pin"
		| "refresh"
		| "rename"
		| "show"
		| "sync-capy"
		| "toggle-browser"
		| "toggle-diagnostics"
		| "toggle-split"
		| "unpin"
		| "widen-native-split",
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
		| "equalize-split"
		| "narrow-active-split"
		| "new-chatgpt-tab"
		| "new-claude-tab"
		| "new-current-url-tab"
		| "new-google-tab"
		| "reload"
		| "swap-split"
		| "toggle-split"
		| "widen-active-split",
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

function webTabIdFromPathname(pathname: string): string | null {
	const match = pathname.match(/^\/web-tabs\/([^/]+)/);
	return match?.[1] ?? null;
}

function closeWebTabFromCommand(context: CommandContext, tabId: string) {
	const currentTabId = webTabIdFromPathname(context.route.pathname);
	const nextTab = closeDashboardWebTab(tabId);
	if (currentTabId !== tabId) return;
	context.navigate(nextTab ? `/web-tabs/${nextTab.id}` : "/v2-workspaces");
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
	shortcutLabel?: string;
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
		shortcutLabel: "u",
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
			priority: CONTROL_PLANE_PRIORITY.pinnedWebPage,
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
		const webTabs = getDashboardWebTabs();
		const webFolders = getDashboardWebTabFolders();
		const currentWebTabId = webTabIdFromPathname(context.route.pathname);
		const currentWebTab = currentWebTabId
			? getDashboardWebTab(currentWebTabId)
			: null;

		for (const app of DASHBOARD_WEB_TAB_APPS) {
			commands.push({
				id: `web.${app.id}.new`,
				title: `Create new ${app.label} tab`,
				section: "web",
				icon: PlusIcon,
				iconUrl: app.fallbackFaviconUrl,
				hotkeyId: app.id === "chrome" ? "OPEN_CHROME" : undefined,
				description: app.url,
				priority:
					app.id === "chrome"
						? CONTROL_PLANE_PRIORITY.nativeOpen
						: CONTROL_PLANE_PRIORITY.pinnedWebPage,
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
				icon: TerminalIcon,
				description: `${dashboardQuickTerminalCommand(terminal.id)} in repo root`,
				priority: CONTROL_PLANE_PRIORITY.quickTerminal,
				keywords: [
					terminal.id,
					terminal.label,
					"kr9",
					"quick",
					"terminal",
					"shell",
					"repo",
					"root",
				],
				shortcutLabel: "⌥K",
				run: (context) => context.navigate(`/root-terminal/${terminal.id}`),
			});
		}

		commands.push(
			{
				id: "web.current.reload",
				title: "Reload current Chrome tab",
				section: "web",
				description: "Reload the active embedded Chrome tab",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "reload", "refresh", "tab"],
				shortcutLabel: "r",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("reload"),
			},
			{
				id: "web.current.newFromCurrent",
				title: "New Chrome tab from current URL",
				section: "web",
				description: "Duplicate the active embedded Chrome tab",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "duplicate", "same", "url", "tab"],
				shortcutLabel: "n",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-current-url-tab"),
			},
			{
				id: "web.current.newGoogle",
				title: "New Google tab",
				section: "web",
				iconUrl: "https://www.google.com/favicon.ico",
				description: "Open Google in a new embedded Chrome tab",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "google", "search", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-google-tab"),
			},
			{
				id: "web.current.newChatGPT",
				title: "New ChatGPT tab",
				section: "web",
				description: "Open ChatGPT in a new embedded Chrome tab",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "chatgpt", "openai", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-chatgpt-tab"),
			},
			{
				id: "web.current.newClaude",
				title: "New Claude tab",
				section: "web",
				description: "Open Claude in a new embedded Chrome tab",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "claude", "anthropic", "tab"],
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("new-claude-tab"),
			},
			{
				id: "web.current.toggleSplit",
				title: "Toggle Chrome split view",
				section: "web",
				description: "Show two embedded Chrome tabs side by side",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "split", "side by side", "tab"],
				shortcutLabel: "s",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("toggle-split"),
			},
			{
				id: "web.current.swapSplit",
				title: "Swap Chrome split focus",
				section: "web",
				description: "Move focus between the two embedded Chrome split panes",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "split", "swap", "focus", "pane"],
				shortcutLabel: "w",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("swap-split"),
			},
			{
				id: "web.current.narrowActiveSplit",
				title: "Narrow active Chrome pane",
				section: "web",
				description: "Give the active embedded Chrome split pane less width",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "split", "narrow", "resize", "pane"],
				shortcutLabel: "[",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("narrow-active-split"),
			},
			{
				id: "web.current.widenActiveSplit",
				title: "Widen active Chrome pane",
				section: "web",
				description: "Give the active embedded Chrome split pane more width",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "split", "widen", "resize", "pane"],
				shortcutLabel: "]",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("widen-active-split"),
			},
			{
				id: "web.current.equalizeSplit",
				title: "Equalize Chrome split panes",
				section: "web",
				description: "Reset embedded Chrome split panes to equal widths",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "split", "equal", "resize", "pane"],
				shortcutLabel: "=",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("equalize-split"),
			},
			{
				id: "web.current.close",
				title: "Close current Chrome tab",
				section: "web",
				description: "Close the active embedded Chrome tab",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "close", "remove", "tab"],
				shortcutLabel: "x",
				when: (context) => context.route.pathname.startsWith("/web"),
				run: () => dispatchBrowserAction("close-current-tab"),
			},
			{
				id: "web.current.pin",
				title: "Pin current Chrome tab",
				section: "web",
				description: "Keep the active embedded Chrome tab warm in the sidebar",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "pin", "retain", "sidebar", "tab"],
				shortcutLabel: "p",
				when: (context) => webTabIdFromPathname(context.route.pathname) != null,
				run: (context) => {
					const tabId = webTabIdFromPathname(context.route.pathname);
					if (tabId) setDashboardWebTabPinned(tabId, true);
				},
			},
			{
				id: "web.current.unpin",
				title: "Unpin current Chrome tab",
				section: "web",
				description:
					"Let the active embedded Chrome tab leave retention normally",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "unpin", "retain", "sidebar", "tab"],
				shortcutLabel: "p",
				when: (context) => webTabIdFromPathname(context.route.pathname) != null,
				run: (context) => {
					const tabId = webTabIdFromPathname(context.route.pathname);
					if (tabId) setDashboardWebTabPinned(tabId, false);
				},
			},
			{
				id: "web.current.removeFolder",
				title: "Move current Chrome tab out of folder",
				section: "web",
				description: "Return the active embedded Chrome tab to the main list",
				priority: CONTROL_PLANE_PRIORITY.browserCurrent,
				keywords: ["chrome", "browser", "folder", "remove", "out", "tab"],
				shortcutLabel: "F",
				when: (context) =>
					getDashboardWebTab(webTabIdFromPathname(context.route.pathname) ?? "")
						?.folderId != null,
				run: (context) => {
					const tabId = webTabIdFromPathname(context.route.pathname);
					if (tabId) moveDashboardWebTabToFolder(tabId, null);
				},
			},
		);

		if (currentWebTab) {
			for (const folder of webFolders) {
				if (
					folder.appId !== currentWebTab.appId ||
					folder.id === currentWebTab.folderId
				) {
					continue;
				}
				commands.push({
					id: `web.current.moveToFolder.${folder.id}`,
					title: `Move current Chrome tab to ${folder.title}`,
					section: "web",
					description: "Move the active embedded Chrome tab into a folder",
					priority: CONTROL_PLANE_PRIORITY.browserCurrent,
					keywords: [
						"chrome",
						"browser",
						"folder",
						"move",
						folder.title,
						"tab",
					],
					shortcutLabel: "m",
					when: (context) =>
						webTabIdFromPathname(context.route.pathname) === currentWebTab.id,
					run: () => moveDashboardWebTabToFolder(currentWebTab.id, folder.id),
				});
			}
		}

		const currentNativeProvider = nativeProviderFromPathname(
			context.route.pathname,
		);
		const nativeFolders = readNativeAgentFoldersFromLocalStorage();
		const latestNativeReply = readLatestNativeAgentReplyNotification();
		const actionableLatestNativeReply =
			latestNativeReply &&
			!isNativeAgentReplyNotificationRead(latestNativeReply)
				? latestNativeReply
				: null;

		commands.push(
			{
				id: "native.capy.open",
				title: "Open Capy",
				section: "web",
				iconUrl: nativeProviderIconUrl("capy"),
				hotkeyId: "OPEN_CAPY",
				description: "Use the Capy API in a native chat interface",
				priority: CONTROL_PLANE_PRIORITY.nativeOpen,
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
				priority: CONTROL_PLANE_PRIORITY.nativeOpen,
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
				priority: CONTROL_PLANE_PRIORITY.nativeCreate,
				keywords: ["capy", "capi", "native", "new", "thread", "agent"],
				shortcutLabel: "⌥C n",
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
				priority: CONTROL_PLANE_PRIORITY.nativeCreate,
				keywords: ["devin", "native", "new", "session", "agent"],
				shortcutLabel: "⌥D n",
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
				priority: CONTROL_PLANE_PRIORITY.nativeOpen,
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
					priority: CONTROL_PLANE_PRIORITY.nativeFilter,
					keywords: [
						provider,
						providerTitle,
						filterCommand.filter,
						...filterCommand.keywords,
						"native",
						noun,
					],
					shortcutLabel: filterCommand.shortcutLabel,
					run: (context) =>
						openNativeOverviewFilter(context, provider, filterCommand.filter),
				});
			}
		}

		if (actionableLatestNativeReply) {
			const providerTitle =
				actionableLatestNativeReply.provider === "capy" ? "Capy" : "Devin";
			const iconUrl =
				actionableLatestNativeReply.provider === "capy"
					? "https://capy.ai/_marketing/favicon/favicon-96x96.png"
					: "https://app.devin.ai/favicon.ico";
			const nativePath =
				actionableLatestNativeReply.provider === "capy"
					? `/native/capy/${actionableLatestNativeReply.id}`
					: `/native/devin/${actionableLatestNativeReply.id}`;
			const keywords = [
				actionableLatestNativeReply.provider,
				"latest",
				"reply",
				"notification",
				"unread",
				"acknowledge",
				"agent",
			];
			commands.push(
				{
					id: "native.latestReply.open",
					title: `Open latest ${providerTitle} reply`,
					section: "web",
					iconUrl,
					description: `${actionableLatestNativeReply.title}: ${actionableLatestNativeReply.preview}`,
					priority: CONTROL_PLANE_PRIORITY.unreadNativeReply,
					keywords: [...keywords, "jump", "open"],
					hotkeyId: "OPEN_UNREAD_NATIVE_REPLY",
					run: (context) => {
						markNativeAgentReplyNotificationRead(actionableLatestNativeReply);
						context.navigate(nativePath);
					},
				},
				{
					id: "native.latestReply.markRead",
					title: `Mark latest ${providerTitle} reply read`,
					section: "web",
					iconUrl,
					description: `${actionableLatestNativeReply.title}: ${actionableLatestNativeReply.preview}`,
					priority: CONTROL_PLANE_PRIORITY.unreadNativeReply,
					keywords: [...keywords, "read", "dismiss", "clear"],
					shortcutLabel: "U",
					run: () => {
						markNativeAgentReplyNotificationRead(actionableLatestNativeReply);
					},
				},
			);
		}

		commands.push(
			{
				id: "native.current.new",
				title: "Create new current native session",
				section: "web",
				icon: PlusIcon,
				description:
					"Create a Capy thread or Devin session for the current native provider",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentSecondary,
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
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentSecondary,
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
				id: "native.current.reply",
				title: "Reply to current native session",
				section: "web",
				description: "Focus the composer for the current Capy/Devin session",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
				keywords: ["capy", "devin", "reply", "composer", "message", "native"],
				shortcutLabel: "r",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"focus-composer",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.openBrowser",
				title: "Open current native session in browser",
				section: "web",
				description: "Switch the current Capy/Devin session to browser view",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
				keywords: ["capy", "devin", "open", "browser", "native", "session"],
				shortcutLabel: "o",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"open-browser",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.openExternal",
				title: "Open current native session externally",
				section: "web",
				description:
					"Open the current Capy/Devin session in the system browser",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
				keywords: [
					"capy",
					"devin",
					"open",
					"external",
					"browser",
					"native",
					"session",
				],
				shortcutLabel: "O",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"open-external",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.pin",
				title: "Pin current native session",
				section: "web",
				description: "Keep the current Capy/Devin conversation in the sidebar",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
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
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
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
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
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
				title: "Archive current native session",
				section: "web",
				description:
					"Hide the current Capy/Devin conversation from the sidebar",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
				keywords: [
					"capy",
					"devin",
					"archive",
					"hide",
					"move",
					"overview",
					"sidebar",
				],
				shortcutLabel: "a/x",
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
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
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
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
				keywords: ["capy", "devin", "browser", "native", "toggle"],
				shortcutLabel: "b",
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
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
				keywords: ["capy", "devin", "browser", "native", "split", "side"],
				shortcutLabel: "s",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"toggle-split",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.narrowSplit",
				title: "Narrow native chat pane",
				section: "web",
				description: "Give the native chat side less width in split view",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentSecondary,
				keywords: ["capy", "devin", "native", "split", "narrow", "resize"],
				shortcutLabel: "[",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"narrow-native-split",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.widenSplit",
				title: "Widen native chat pane",
				section: "web",
				description: "Give the native chat side more width in split view",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrent,
				keywords: ["capy", "devin", "native", "split", "widen", "resize"],
				shortcutLabel: "]",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"widen-native-split",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.equalizeSplit",
				title: "Equalize native split panes",
				section: "web",
				description:
					"Reset native chat and browser split panes to equal widths",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrent,
				keywords: ["capy", "devin", "native", "split", "equal", "resize"],
				shortcutLabel: "=",
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: (context) =>
					dispatchNativeAgentAction(
						"equalize-split",
						nativeProviderFromPathname(context.route.pathname),
					),
			},
			{
				id: "native.current.toggleDiagnostics",
				title: "Toggle native diagnostics",
				section: "web",
				description: "Show native Capy/Devin freshness and inclusion details",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentSecondary,
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
				priority: CONTROL_PLANE_PRIORITY.nativeFolder,
				keywords: ["capy", "devin", "folder", "create", "native"],
				shortcutLabel: "N",
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
				priority: CONTROL_PLANE_PRIORITY.nativeFolder,
				keywords: ["capy", "devin", "folder", "rename", "native"],
				shortcutLabel: "e",
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
				priority: CONTROL_PLANE_PRIORITY.nativeFolder,
				keywords: ["capy", "devin", "folder", "color", "native"],
				shortcutLabel: "c",
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
				priority: CONTROL_PLANE_PRIORITY.nativeFolder,
				keywords: ["capy", "devin", "folder", "delete", "native"],
				shortcutLabel: "d",
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: (context) =>
					dispatchNativeFolderAction(
						nativeProviderFromPathname(context.route.pathname),
						"delete",
					),
			},
			{
				id: "native.folder.moveCurrent",
				title: "Move current native session to remembered folder",
				section: "web",
				description:
					"Move the current Capy/Devin session to the last selected folder",
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
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
				priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
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
					priority: CONTROL_PLANE_PRIORITY.nativeCurrentPrimary,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"move",
						"native",
					],
					shortcutLabel: "m",
					when: () => isCurrentProvider,
					run: () =>
						dispatchNativeFolderAction(provider, "move-active", folder.id),
				},
				{
					id: `native.folder.${folder.id}.rename`,
					title: `Rename ${folder.title}`,
					section: "web",
					description: `${providerTitle} folder`,
					priority: CONTROL_PLANE_PRIORITY.nativeFolder,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"rename",
						"native",
					],
					shortcutLabel: "e",
					when: () => isCurrentProvider,
					run: () => dispatchNativeFolderAction(provider, "rename", folder.id),
				},
				{
					id: `native.folder.${folder.id}.color`,
					title: `Change ${folder.title} color`,
					section: "web",
					description: `${providerTitle} folder`,
					priority: CONTROL_PLANE_PRIORITY.nativeFolder,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"color",
						"native",
					],
					shortcutLabel: "c",
					when: () => isCurrentProvider,
					run: () => dispatchNativeFolderAction(provider, "color", folder.id),
				},
				{
					id: `native.folder.${folder.id}.delete`,
					title: `Delete ${folder.title}`,
					section: "web",
					description: `${providerTitle} folder`,
					priority: CONTROL_PLANE_PRIORITY.nativeFolder,
					keywords: [
						provider,
						providerTitle,
						folder.title,
						"folder",
						"delete",
						"native",
					],
					shortcutLabel: "d",
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
					priority: CONTROL_PLANE_PRIORITY.nativeFolder - 1,
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

		for (const tab of webTabs) {
			const app = getDashboardWebTabApp(tab.appId);
			const tabIcon = getDashboardWebTabFavicon(tab) ?? undefined;
			const tabKeywords = [
				app.label,
				app.id,
				tab.title,
				tab.browserTitle ?? "",
				tab.url,
				"session",
				"tab",
				"web",
				"capi",
				"chrome",
				"browser",
			];
			commands.push(
				{
					id: `web.tab.${tab.id}`,
					title: `${app.label}: ${tab.title}`,
					section: "web",
					iconUrl: tabIcon,
					description: tab.url,
					priority: CONTROL_PLANE_PRIORITY.webTab,
					keywords: tabKeywords,
					run: (context) => context.navigate(`/web-tabs/${tab.id}`),
				},
				{
					id: `web.tab.${tab.id}.togglePin`,
					title: `${tab.isPinned ? "Unpin" : "Pin"} ${tab.title}`,
					section: "web",
					iconUrl: tabIcon,
					description: `${app.label} tab`,
					priority: CONTROL_PLANE_PRIORITY.webTab,
					keywords: [...tabKeywords, "pin", "unpin", "retain", "sidebar"],
					shortcutLabel: "p",
					run: () => setDashboardWebTabPinned(tab.id, !tab.isPinned),
				},
				{
					id: `web.tab.${tab.id}.close`,
					title: `Close ${tab.title}`,
					section: "web",
					iconUrl: tabIcon,
					description: `${app.label} tab`,
					priority: CONTROL_PLANE_PRIORITY.webTab,
					keywords: [...tabKeywords, "close", "archive", "remove"],
					shortcutLabel: "x",
					run: (context) => closeWebTabFromCommand(context, tab.id),
				},
			);

			if (tab.folderId) {
				commands.push({
					id: `web.tab.${tab.id}.removeFolder`,
					title: `Move ${tab.title} out of folder`,
					section: "web",
					iconUrl: tabIcon,
					description: `${app.label} tab`,
					priority: CONTROL_PLANE_PRIORITY.webTab,
					keywords: [...tabKeywords, "folder", "remove", "out"],
					shortcutLabel: "F",
					run: () => moveDashboardWebTabToFolder(tab.id, null),
				});
			}

			for (const folder of webFolders) {
				if (folder.appId !== tab.appId || folder.id === tab.folderId) continue;
				commands.push({
					id: `web.tab.${tab.id}.moveToFolder.${folder.id}`,
					title: `Move ${tab.title} to ${folder.title}`,
					section: "web",
					iconUrl: tabIcon,
					description: `${app.label} folder`,
					priority: CONTROL_PLANE_PRIORITY.webTab,
					keywords: [...tabKeywords, folder.title, "folder", "move"],
					shortcutLabel: "m",
					run: () => moveDashboardWebTabToFolder(tab.id, folder.id),
				});
			}
		}

		return commands;
	},
};
