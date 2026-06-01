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
		expect(commandIds.has("actions.openSettings")).toBe(true);
		expect(commandIds.has("actions.toggleLeftSidebar")).toBe(true);
		expect(commandIds.has("actions.showShortcuts")).toBe(true);
	});

	it("exposes discoverable hotkeys for workspace, settings, and sidebar commands", () => {
		const commands = actionsProvider.provide(commandContext());

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
});
