import { PlusIcon } from "lucide-react";
import type { HotkeyId } from "renderer/hotkeys/registry";
import { getDashboardWebPageFavicon } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-page-favicons";
import { DASHBOARD_WEB_PAGES } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-pages";
import {
	createDashboardWebTab,
	DASHBOARD_WEB_TAB_APPS,
	getDashboardWebTabApp,
	getDashboardWebTabFavicon,
	getDashboardWebTabs,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import type { Command, CommandProvider } from "../../core/types";

function dispatchNativeAgentAction(
	action:
		| "hide"
		| "new"
		| "pin"
		| "refresh"
		| "show"
		| "toggle-browser"
		| "unpin",
) {
	window.dispatchEvent(
		new CustomEvent("dashboard-native-agent-current-action", {
			detail: { action },
		}),
	);
}

export const webProvider: CommandProvider = {
	id: "web",
	provide: () => {
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
				description: app.url,
				keywords: [app.label, app.id, "google", "new", "browser", "tab", "web"],
				run: (context) => {
					const tab = createDashboardWebTab(app.id);
					context.navigate(`/web-tabs/${tab.id}`);
				},
			});
		}

		commands.push(
			{
				id: "native.capy.open",
				title: "Open Capy",
				section: "web",
				iconUrl: "https://capy.ai/_marketing/favicon/favicon-96x96.png",
				description: "Use the Capy API in a native chat interface",
				keywords: ["capy", "capi", "native", "thread", "agent"],
				run: (context) => context.navigate("/native/capy"),
			},
			{
				id: "native.devin.open",
				title: "Open Devin",
				section: "web",
				iconUrl: "https://app.devin.ai/favicon.ico",
				description: "Use the Devin API in a native chat interface",
				keywords: ["devin", "native", "session", "agent"],
				run: (context) => context.navigate("/native/devin"),
			},
			{
				id: "native.capy.create",
				title: "Create Capy thread",
				section: "web",
				icon: PlusIcon,
				iconUrl: "https://capy.ai/_marketing/favicon/favicon-96x96.png",
				description: "Open Capy Native and start a thread",
				keywords: ["capy", "capi", "native", "new", "thread", "agent"],
				run: (context) => {
					context.navigate("/native/capy");
					window.setTimeout(() => {
						window.dispatchEvent(
							new CustomEvent("dashboard-native-agent-create", {
								detail: { provider: "capy" },
							}),
						);
					}, 0);
				},
			},
			{
				id: "native.devin.create",
				title: "Create Devin session",
				section: "web",
				icon: PlusIcon,
				iconUrl: "https://app.devin.ai/favicon.ico",
				description: "Open Devin Native and start a session",
				keywords: ["devin", "native", "new", "session", "agent"],
				run: (context) => {
					context.navigate("/native/devin");
					window.setTimeout(() => {
						window.dispatchEvent(
							new CustomEvent("dashboard-native-agent-create", {
								detail: { provider: "devin" },
							}),
						);
					}, 0);
				},
			},
		);

		commands.push(
			{
				id: "native.current.refresh",
				title: "Refresh current native agent",
				section: "web",
				description: "Refresh Capy or Devin data for the current view",
				keywords: ["capy", "devin", "refresh", "reload", "native"],
				when: (context) => context.route.pathname.startsWith("/native/"),
				run: () => dispatchNativeAgentAction("refresh"),
			},
			{
				id: "native.current.pin",
				title: "Pin current native session",
				section: "web",
				description: "Keep the current Capy/Devin conversation in the sidebar",
				keywords: ["capy", "devin", "pin", "sidebar", "native"],
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: () => dispatchNativeAgentAction("pin"),
			},
			{
				id: "native.current.unpin",
				title: "Unpin current native session",
				section: "web",
				description:
					"Let the current conversation leave the sidebar automatically",
				keywords: ["capy", "devin", "unpin", "sidebar", "native"],
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: () => dispatchNativeAgentAction("unpin"),
			},
			{
				id: "native.current.hide",
				title: "Move current native session to overview",
				section: "web",
				description:
					"Hide the current Capy/Devin conversation from the sidebar",
				keywords: ["capy", "devin", "hide", "overview", "sidebar"],
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: () => dispatchNativeAgentAction("hide"),
			},
			{
				id: "native.current.show",
				title: "Show current native session in sidebar",
				section: "web",
				description:
					"Move the current Capy/Devin conversation back to the sidebar",
				keywords: ["capy", "devin", "show", "overview", "sidebar"],
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: () => dispatchNativeAgentAction("show"),
			},
			{
				id: "native.current.toggleBrowser",
				title: "Toggle native/browser view",
				section: "web",
				description:
					"Switch the current native session between chat and browser",
				keywords: ["capy", "devin", "browser", "native", "toggle"],
				when: (context) =>
					/\/native\/(?:capy|devin)\//.test(context.route.pathname),
				run: () => dispatchNativeAgentAction("toggle-browser"),
			},
		);

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
