import { describe, expect, it, mock } from "bun:test";
import type { CommandContext } from "../../core/types";

mock.module("../../ui/RecentlyViewed/RecentlyViewedFrame", () => ({
	RecentlyViewedFrame: () => null,
}));

mock.module("../../ui/WorkspaceList", () => ({
	WorkspaceListFrame: () => null,
}));

mock.module("../settings/commands", () => ({
	settingsTabCommands: [],
}));

const { navigationProvider } = await import("./commands");

function commandContext(
	navigate: (path: string) => void = () => {},
): CommandContext {
	return {
		activeHostUrl: null,
		activeOrganizationId: null,
		activeOrganizationName: null,
		hostServiceStatus: "running",
		localMachineId: null,
		navigate,
		notificationSoundsMuted: false,
		route: { params: {}, pathname: "/native/capy" },
		workspace: null,
	};
}

describe("navigation command provider", () => {
	it("does not register duplicate command ids", () => {
		const commands = navigationProvider.provide(commandContext());
		const commandIds = commands.map((command) => command.id);

		expect(new Set(commandIds).size).toBe(commandIds.length);
	});

	it("exposes workspace picker and direct workspace overview commands", () => {
		const commands = navigationProvider.provide(commandContext());
		const commandIds = new Set(commands.map((command) => command.id));
		const overview = commands.find(
			(command) => command.id === "nav.workspaceOverview",
		);

		expect(commandIds.has("nav.workspaces")).toBe(true);
		expect(overview?.hotkeyId).toBe("OPEN_WORKSPACES");
		expect(overview?.title).toBe("Open workspace overview");
	});

	it("navigates directly to the workspace overview", () => {
		const navigated: string[] = [];
		const context = commandContext((path) => navigated.push(path));
		const command = navigationProvider
			.provide(context)
			.find((candidate) => candidate.id === "nav.workspaceOverview");

		command?.run?.(context);

		expect(navigated).toEqual(["/v2-workspaces"]);
	});
});
