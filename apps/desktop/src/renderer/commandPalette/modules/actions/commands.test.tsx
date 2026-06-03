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
		getState: () => ({ toggleOpen: () => undefined }),
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
		expect(commandIds.has("actions.openSettings")).toBe(true);
		expect(commandIds.has("actions.toggleLeftSidebar")).toBe(true);
		expect(commandIds.has("actions.focusNavigationShell")).toBe(true);
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
			commands.find((command) => command.id === "actions.focusNavigationShell")
				?.shortcutLabel,
		).toBe("Esc");
		expect(
			commands.find(
				(command) => command.id === "actions.showDashboardActionHints",
			)?.shortcutLabel,
		).toBe("f");
		expect(
			commands.find(
				(command) => command.id === "actions.showDashboardKeyboardGuide",
			)?.hotkeyId,
		).toBe("SHOW_DASHBOARD_KEYBOARD_HELP");
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

	it("runs the dashboard Vim toggle command", () => {
		setDashboardVimModeEnabled(false);
		const command = actionsProvider
			.provide(commandContext())
			.find((candidate) => candidate.id === "actions.toggleDashboardVimMode");

		command?.run?.(commandContext());

		expect(isDashboardVimModeEnabled()).toBe(true);
		setDashboardVimModeEnabled(false);
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
		const command = actionsProvider
			.provide(context)
			.find((candidate) => candidate.id === "actions.showShortcuts");

		command?.run?.(context);

		expect(navigated).toEqual(["/settings/keyboard"]);
	});
});
