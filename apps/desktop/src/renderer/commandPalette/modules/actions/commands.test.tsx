import { describe, expect, it, mock } from "bun:test";
import type { CommandContext } from "../../core/types";

mock.module("@superset/ui/sonner", () => ({
	toast: { error: () => undefined, success: () => undefined },
}));

mock.module("renderer/lib/trpc-client", () => ({
	electronTrpcClient: {
		autoUpdate: { checkInteractive: { mutate: async () => undefined } },
		settings: {
			setNotificationSoundsMuted: { mutate: async () => undefined },
		},
	},
}));

mock.module("renderer/providers/ElectronTRPCProvider", () => ({
	electronQueryClient: {
		invalidateQueries: async () => undefined,
	},
}));

mock.module("renderer/stores/new-workspace-modal", () => ({
	useNewWorkspaceModalStore: {
		getState: () => ({ openModal: () => undefined }),
	},
}));

mock.module("renderer/stores/right-sidebar-toggle-intent", () => ({
	useRightSidebarToggleIntent: {
		getState: () => ({ request: () => undefined }),
	},
}));

mock.module("renderer/stores/theme/store", () => ({
	SYSTEM_THEME_ID: "system",
	useThemeStore: {
		getState: () => ({
			activeThemeId: "dark",
			setTheme: () => undefined,
		}),
	},
}));

mock.module("renderer/stores/workspace-sidebar-state", () => ({
	useWorkspaceSidebarStore: {
		getState: () => ({
			isOpen: true,
			setOpen: () => undefined,
			toggleCollapsed: () => undefined,
		}),
	},
}));

mock.module("../../ui/ThemeFrame/ThemeFrame", () => ({
	ThemeFrame: () => null,
}));

const { isDashboardVimModeEnabled, setDashboardVimModeEnabled } = await import(
	"renderer/routes/_authenticated/_dashboard/utils/dashboard-vim-mode"
);
const { DASHBOARD_ACTION_HINTS_OPEN_EVENT } = await import(
	"renderer/routes/_authenticated/_dashboard/utils/dashboard-action-hints"
);
const { DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT } = await import(
	"renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-search-focus"
);
const { DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT } = await import(
	"renderer/routes/_authenticated/_dashboard/utils/dashboard-sidebar-keyboard-command"
);
const { actionsProvider } = await import("./commands");

function commandContext(pathname = "/native/capy"): CommandContext {
	return {
		activeHostUrl: null,
		activeOrganizationId: null,
		activeOrganizationName: null,
		hostServiceStatus: "running",
		localMachineId: null,
		navigate: () => {},
		notificationSoundsMuted: false,
		route: { params: {}, pathname },
		workspace: null,
	};
}

describe("actions command provider", () => {
	it("does not register duplicate command ids", () => {
		const commands = actionsProvider.provide(commandContext());
		const commandIds = commands.map((command) => command.id);

		expect(new Set(commandIds).size).toBe(commandIds.length);
	});

	it("registers the global control-plane commands required by the dashboard", () => {
		const commands = actionsProvider.provide(commandContext());
		const commandIds = new Set(commands.map((command) => command.id));

		expect(commandIds.has("actions.newWorkspace")).toBe(true);
		expect(commandIds.has("actions.toggleDashboardVimMode")).toBe(true);
		expect(commandIds.has("actions.switchDashboardViewNext")).toBe(true);
		expect(commandIds.has("actions.switchDashboardViewPrevious")).toBe(true);
		expect(commandIds.has("actions.openUnreadNativeReply")).toBe(true);
		expect(commandIds.has("actions.markLatestNativeReplyRead")).toBe(true);
		expect(commandIds.has("actions.openSettings")).toBe(true);
		expect(commandIds.has("actions.toggleLeftSidebar")).toBe(true);
		expect(commandIds.has("actions.focusNavigationShell")).toBe(true);
		expect(commandIds.has("actions.searchSidebar")).toBe(true);
		expect(commandIds.has("actions.sidebar.focusNext")).toBe(true);
		expect(commandIds.has("actions.sidebar.focusPrevious")).toBe(true);
		expect(commandIds.has("actions.sidebar.focusFirst")).toBe(true);
		expect(commandIds.has("actions.sidebar.focusLast")).toBe(true);
		expect(commandIds.has("actions.sidebar.activate")).toBe(true);
		expect(commandIds.has("actions.sidebar.toggleExpansion")).toBe(true);
		expect(commandIds.has("actions.sidebar.collapse")).toBe(true);
		expect(commandIds.has("actions.sidebar.expand")).toBe(true);
		expect(commandIds.has("actions.sidebar.create")).toBe(true);
		expect(commandIds.has("actions.sidebar.createFolder")).toBe(true);
		expect(commandIds.has("actions.sidebar.menu")).toBe(true);
		expect(commandIds.has("actions.sidebar.pin")).toBe(true);
		expect(commandIds.has("actions.sidebar.reply")).toBe(true);
		expect(commandIds.has("actions.sidebar.openBrowser")).toBe(true);
		expect(commandIds.has("actions.sidebar.toggleBrowser")).toBe(true);
		expect(commandIds.has("actions.sidebar.move")).toBe(true);
		expect(commandIds.has("actions.sidebar.removeFromFolder")).toBe(true);
		expect(commandIds.has("actions.sidebar.rename")).toBe(true);
		expect(commandIds.has("actions.sidebar.color")).toBe(true);
		expect(commandIds.has("actions.sidebar.delete")).toBe(true);
		expect(commandIds.has("actions.sidebar.markRead")).toBe(true);
		expect(commandIds.has("actions.sidebar.hardArchive")).toBe(true);
		expect(commandIds.has("actions.sidebar.archive")).toBe(true);
		expect(commandIds.has("actions.showDashboardActionHints")).toBe(true);
		expect(commandIds.has("actions.showDashboardKeyboardGuide")).toBe(true);
		expect(commandIds.has("actions.showShortcuts")).toBe(true);
	});

	it("exposes discoverable hotkeys for workspace, settings, and sidebar commands", () => {
		const commands = actionsProvider.provide(commandContext());

		expect(
			commands.find(
				(command) => command.id === "actions.toggleDashboardVimMode",
			)?.hotkeyId,
		).toBe("TOGGLE_VIM_MODE");
		expect(
			commands.find(
				(command) => command.id === "actions.switchDashboardViewNext",
			)?.hotkeyId,
		).toBe("SWITCH_DASHBOARD_VIEW_NEXT");
		expect(
			commands.find(
				(command) => command.id === "actions.switchDashboardViewPrevious",
			)?.hotkeyId,
		).toBe("SWITCH_DASHBOARD_VIEW_PREVIOUS");
		expect(
			commands.find((command) => command.id === "actions.openUnreadNativeReply")
				?.hotkeyId,
		).toBe("OPEN_UNREAD_NATIVE_REPLY");
		expect(
			commands.find(
				(command) => command.id === "actions.markLatestNativeReplyRead",
			)?.hotkeyId,
		).toBe("MARK_LATEST_NATIVE_REPLY_READ");
		expect(
			commands.find((command) => command.id === "actions.newWorkspace")
				?.hotkeyId,
		).toBe("NEW_WORKSPACE");
		expect(
			commands.find((command) => command.id === "actions.openSettings")
				?.hotkeyId,
		).toBe("OPEN_SETTINGS");
		expect(
			commands.find((command) => command.id === "actions.toggleLeftSidebar")
				?.hotkeyId,
		).toBe("TOGGLE_WORKSPACE_SIDEBAR");
		expect(
			commands.find((command) => command.id === "actions.toggleLeftSidebar")
				?.shortcutLabel,
		).toBe("H");
		expect(
			commands.find((command) => command.id === "actions.toggleLeftSidebar")
				?.keywords,
		).toContain("vim");
		expect(
			commands.find((command) => command.id === "actions.focusNavigationShell")
				?.shortcutLabel,
		).toBe("Esc");
		expect(
			commands.find((command) => command.id === "actions.searchSidebar")
				?.shortcutLabel,
		).toBe("/");
		const shortcutById = new Map(
			commands
				.filter((command) => command.id.startsWith("actions.sidebar."))
				.map((command) => [command.id, command.shortcutLabel] as const),
		);
		const hotkeyById = new Map(
			commands
				.filter((command) => command.id.startsWith("actions.sidebar."))
				.map((command) => [command.id, command.hotkeyId] as const),
		);
		expect(shortcutById.get("actions.sidebar.focusNext")).toBe("↓/j");
		expect(shortcutById.get("actions.sidebar.focusPrevious")).toBe("↑/k");
		expect(shortcutById.get("actions.sidebar.focusFirst")).toBe("Home/gg");
		expect(shortcutById.get("actions.sidebar.focusLast")).toBe("End/G");
		expect(shortcutById.get("actions.sidebar.activate")).toBe("Enter");
		expect(shortcutById.get("actions.sidebar.toggleExpansion")).toBe("Space");
		expect(shortcutById.get("actions.sidebar.collapse")).toBe("h");
		expect(shortcutById.get("actions.sidebar.expand")).toBe("l");
		expect(shortcutById.get("actions.sidebar.create")).toBe("n");
		expect(shortcutById.get("actions.sidebar.createFolder")).toBe("N");
		expect(shortcutById.get("actions.sidebar.menu")).toBe(".");
		expect(shortcutById.get("actions.sidebar.pin")).toBe("p");
		expect(shortcutById.get("actions.sidebar.reply")).toBe("r");
		expect(shortcutById.get("actions.sidebar.openBrowser")).toBe("o");
		expect(shortcutById.get("actions.sidebar.toggleBrowser")).toBe("b");
		expect(shortcutById.get("actions.sidebar.move")).toBe("m");
		expect(shortcutById.get("actions.sidebar.removeFromFolder")).toBe("F");
		expect(shortcutById.get("actions.sidebar.rename")).toBe("e");
		expect(shortcutById.get("actions.sidebar.color")).toBe("c");
		expect(shortcutById.get("actions.sidebar.delete")).toBe("d");
		expect(shortcutById.get("actions.sidebar.markRead")).toBe("U");
		expect(shortcutById.get("actions.sidebar.hardArchive")).toBe("x/X");
		expect(shortcutById.get("actions.sidebar.archive")).toBe("a/x");
		expect(hotkeyById.get("actions.sidebar.menu")).toBe("SIDEBAR_ACTION_MENU");
		expect(hotkeyById.get("actions.sidebar.pin")).toBe("SIDEBAR_ACTION_PIN");
		expect(hotkeyById.get("actions.sidebar.reply")).toBe(
			"SIDEBAR_ACTION_REPLY",
		);
		expect(hotkeyById.get("actions.sidebar.openBrowser")).toBe(
			"SIDEBAR_ACTION_OPEN_BROWSER",
		);
		expect(hotkeyById.get("actions.sidebar.move")).toBe("SIDEBAR_ACTION_MOVE");
		expect(hotkeyById.get("actions.sidebar.removeFromFolder")).toBe(
			"SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
		);
		expect(hotkeyById.get("actions.sidebar.rename")).toBe(
			"SIDEBAR_ACTION_RENAME",
		);
		expect(hotkeyById.get("actions.sidebar.markRead")).toBe(
			"SIDEBAR_ACTION_MARK_READ",
		);
		expect(hotkeyById.get("actions.sidebar.hardArchive")).toBe(
			"SIDEBAR_ACTION_HARD_ARCHIVE",
		);
		expect(hotkeyById.get("actions.sidebar.archive")).toBe(
			"SIDEBAR_ACTION_ARCHIVE",
		);
		expect(
			commands.find((command) => command.id === "actions.sidebar.hardArchive")
				?.title,
		).toBe("Archive focused native agent session");
		expect(
			commands.find((command) => command.id === "actions.sidebar.markRead")
				?.title,
		).toBe("Mark focused native reply read");
		expect(
			commands.find((command) => command.id === "actions.sidebar.archive")
				?.title,
		).toBe("Move focused sidebar item away");
		expect(
			commands.find(
				(command) => command.id === "actions.showDashboardActionHints",
			)?.hotkeyId,
		).toBe("SHOW_DASHBOARD_ACTION_HINTS");
		expect(
			commands.find(
				(command) => command.id === "actions.showDashboardKeyboardGuide",
			)?.hotkeyId,
		).toBe("SHOW_DASHBOARD_KEYBOARD_HELP");
	});

	it("makes the Vim mode command state-aware", () => {
		setDashboardVimModeEnabled(false);
		const enableCommand = actionsProvider
			.provide(commandContext())
			.find((command) => command.id === "actions.toggleDashboardVimMode");

		expect(enableCommand?.title).toBe("Enable Vim mode");
		expect(enableCommand?.description).toContain("Turn on j/k");
		expect(enableCommand?.keywords).toContain("disabled");

		setDashboardVimModeEnabled(true);
		const disableCommand = actionsProvider
			.provide(commandContext())
			.find((command) => command.id === "actions.toggleDashboardVimMode");

		expect(disableCommand?.title).toBe("Disable Vim mode");
		expect(disableCommand?.description).toContain("Turn off j/k");
		expect(disableCommand?.keywords).toContain("enabled");

		setDashboardVimModeEnabled(false);
	});

	it("routes MRU command-palette actions through the dashboard switch event", () => {
		const directions: unknown[] = [];
		const originalWindow = globalThis.window;
		const testWindow = new EventTarget();
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: testWindow,
		});
		const listener = (event: Event) => {
			directions.push(
				(event as CustomEvent<{ direction?: unknown }>).detail?.direction,
			);
		};
		window.addEventListener("dashboard-view-mru-switch", listener);
		try {
			const commands = actionsProvider.provide(commandContext());
			commands
				.find((command) => command.id === "actions.switchDashboardViewNext")
				?.run?.(commandContext());
			commands
				.find((command) => command.id === "actions.switchDashboardViewPrevious")
				?.run?.(commandContext());
		} finally {
			window.removeEventListener("dashboard-view-mru-switch", listener);
			if (originalWindow) {
				Object.defineProperty(globalThis, "window", {
					configurable: true,
					value: originalWindow,
				});
			} else {
				delete (globalThis as { window?: unknown }).window;
			}
		}

		expect(directions).toEqual(["next", "previous"]);
	});

	it("routes unread native reply command-palette action through the global event", () => {
		if (typeof window === "undefined") return;
		let openEventCount = 0;
		const listener = () => {
			openEventCount += 1;
		};
		window.addEventListener(
			"dashboard-native-agent-open-unread-reply",
			listener,
		);
		const command = actionsProvider
			.provide(commandContext("/web-tabs/google"))
			.find((candidate) => candidate.id === "actions.openUnreadNativeReply");

		command?.run?.(commandContext("/web-tabs/google"));
		window.removeEventListener(
			"dashboard-native-agent-open-unread-reply",
			listener,
		);

		expect(openEventCount).toBe(1);
	});

	it("routes mark-latest-read command-palette action through the global event", () => {
		if (typeof window === "undefined") return;
		let markReadEventCount = 0;
		const listener = () => {
			markReadEventCount += 1;
		};
		window.addEventListener(
			"dashboard-native-agent-mark-latest-reply-read",
			listener,
		);
		const command = actionsProvider
			.provide(commandContext("/web-tabs/google"))
			.find(
				(candidate) => candidate.id === "actions.markLatestNativeReplyRead",
			);

		command?.run?.(commandContext("/web-tabs/google"));
		window.removeEventListener(
			"dashboard-native-agent-mark-latest-reply-read",
			listener,
		);

		expect(markReadEventCount).toBe(1);
	});

	it("runs the dashboard Vim toggle command", () => {
		setDashboardVimModeEnabled(false);
		const command = actionsProvider
			.provide(commandContext())
			.find((candidate) => candidate.id === "actions.toggleDashboardVimMode");

		command?.run?.(commandContext());

		expect(isDashboardVimModeEnabled()).toBe(true);
		setDashboardVimModeEnabled(false);
	});

	it("opens sidebar search from the command palette", () => {
		if (typeof window === "undefined") return;
		let openEventCount = 0;
		const listener = () => {
			openEventCount += 1;
		};
		window.addEventListener(DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT, listener);
		const command = actionsProvider
			.provide(commandContext("/web-tabs/google"))
			.find((candidate) => candidate.id === "actions.searchSidebar");

		command?.run?.(commandContext("/web-tabs/google"));
		window.removeEventListener(DASHBOARD_SIDEBAR_SEARCH_FOCUS_EVENT, listener);

		expect(openEventCount).toBe(1);
	});

	it("routes focused sidebar row commands through the shared sidebar command event", () => {
		if (typeof window === "undefined") return;
		const commands: string[] = [];
		const listener = (event: Event) => {
			commands.push(
				(event as CustomEvent<{ command?: string }>).detail?.command ?? "",
			);
			event.preventDefault();
		};
		window.addEventListener(DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT, listener);
		try {
			const providedCommands = actionsProvider.provide(commandContext());
			for (const id of [
				"actions.sidebar.focusNext",
				"actions.sidebar.focusPrevious",
				"actions.sidebar.focusFirst",
				"actions.sidebar.focusLast",
				"actions.sidebar.activate",
				"actions.sidebar.toggleExpansion",
				"actions.sidebar.collapse",
				"actions.sidebar.expand",
				"actions.sidebar.create",
				"actions.sidebar.createFolder",
				"actions.sidebar.menu",
				"actions.sidebar.pin",
				"actions.sidebar.reply",
				"actions.sidebar.openBrowser",
				"actions.sidebar.toggleBrowser",
				"actions.sidebar.move",
				"actions.sidebar.removeFromFolder",
				"actions.sidebar.rename",
				"actions.sidebar.color",
				"actions.sidebar.delete",
				"actions.sidebar.markRead",
				"actions.sidebar.hardArchive",
				"actions.sidebar.archive",
			]) {
				providedCommands
					.find((candidate) => candidate.id === id)
					?.run?.(commandContext());
			}
		} finally {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
				listener,
			);
		}

		expect(commands).toEqual([
			"focus-next",
			"focus-previous",
			"focus-first",
			"focus-last",
			"activate",
			"toggle-expansion",
			"collapse",
			"expand",
			"action-create",
			"action-create-folder",
			"action-menu",
			"action-pin",
			"action-reply",
			"action-open-browser",
			"action-toggle-browser",
			"action-move",
			"action-remove-from-folder",
			"action-rename",
			"action-color",
			"action-delete",
			"action-mark-read",
			"action-hard-archive",
			"action-archive",
		]);
	});

	it("falls the control-plane native archive action back to generic move-away when hard archive is unhandled", () => {
		if (typeof window === "undefined") return;
		const commands: string[] = [];
		const listener = (event: Event) => {
			const command =
				(event as CustomEvent<{ command?: string }>).detail?.command ?? "";
			commands.push(command);
			if (command === "action-archive") event.preventDefault();
		};
		window.addEventListener(DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT, listener);
		try {
			actionsProvider
				.provide(commandContext())
				.find((candidate) => candidate.id === "actions.sidebar.hardArchive")
				?.run?.(commandContext());
		} finally {
			window.removeEventListener(
				DASHBOARD_SIDEBAR_KEYBOARD_COMMAND_EVENT,
				listener,
			);
		}

		expect(commands).toEqual(["action-hard-archive", "action-archive"]);
	});

	it("opens dashboard action hints from the command palette", () => {
		if (typeof window === "undefined") return;
		let openEventCount = 0;
		const listener = () => {
			openEventCount += 1;
		};
		window.addEventListener(DASHBOARD_ACTION_HINTS_OPEN_EVENT, listener);
		const command = actionsProvider
			.provide(commandContext("/native/devin"))
			.find((candidate) => candidate.id === "actions.showDashboardActionHints");

		command?.run?.(commandContext("/native/devin"));
		window.removeEventListener(DASHBOARD_ACTION_HINTS_OPEN_EVENT, listener);

		expect(openEventCount).toBe(1);
	});

	it("opens the dashboard keyboard guide from the command palette", () => {
		if (typeof window === "undefined") return;
		let openEventCount = 0;
		const listener = () => {
			openEventCount += 1;
		};
		window.addEventListener("dashboard-keyboard-help-open", listener);
		const command = actionsProvider
			.provide(commandContext("/native/devin"))
			.find(
				(candidate) => candidate.id === "actions.showDashboardKeyboardGuide",
			);

		command?.run?.(commandContext("/native/devin"));
		window.removeEventListener("dashboard-keyboard-help-open", listener);

		expect(openEventCount).toBe(1);
	});

	it("opens the dashboard keyboard overlay from dashboard routes", () => {
		if (typeof window === "undefined") return;
		let openEventCount = 0;
		const listener = () => {
			openEventCount += 1;
		};
		window.addEventListener("dashboard-keyboard-help-open", listener, {
			once: true,
		});
		const command = actionsProvider
			.provide(commandContext("/native/devin"))
			.find((candidate) => candidate.id === "actions.showShortcuts");

		command?.run?.(commandContext("/native/devin"));
		window.removeEventListener("dashboard-keyboard-help-open", listener);

		expect(openEventCount).toBe(1);
	});

	it("falls back to the keyboard settings page from settings routes", () => {
		const navigated: string[] = [];
		const context = {
			...commandContext("/settings/account"),
			navigate: (path: string) => navigated.push(path),
		};

		for (const commandId of [
			"actions.showShortcuts",
			"actions.showDashboardKeyboardGuide",
		]) {
			const command = actionsProvider
				.provide(context)
				.find((candidate) => candidate.id === commandId);

			command?.run?.(context);
		}

		expect(navigated).toEqual(["/settings/keyboard", "/settings/keyboard"]);
	});
});
