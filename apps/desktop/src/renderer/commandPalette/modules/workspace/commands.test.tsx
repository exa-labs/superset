import { describe, expect, it, mock } from "bun:test";
import type { CommandContext } from "../../core/types";

mock.module("renderer/commandPalette/ui/QuickOpen/quickOpenStore", () => ({
	useQuickOpenStore: {
		getState: () => ({ openFor: () => undefined }),
	},
}));

mock.module("renderer/stores/delete-workspace-intent", () => ({
	useDeleteWorkspaceIntent: {
		getState: () => ({ request: () => undefined }),
	},
}));

mock.module("renderer/stores/new-workspace-modal", () => ({
	useNewWorkspaceModalStore: {
		getState: () => ({ openModal: () => undefined }),
	},
}));

mock.module("renderer/stores/remove-workspace-from-sidebar-intent", () => ({
	useRemoveFromSidebarIntent: {
		getState: () => ({ request: () => undefined }),
	},
}));

mock.module("../../ui/LinkTask/LinkTaskFrame", () => ({
	LinkTaskFrame: () => null,
}));

const { DASHBOARD_WORKSPACE_PANE_ACTION_EVENT } = await import(
	"renderer/routes/_authenticated/_dashboard/utils/dashboard-workspace-pane-actions"
);
const { workspaceProvider } = await import("./commands");

function commandContext(workspace = true): CommandContext {
	return {
		activeHostUrl: null,
		activeOrganizationId: null,
		activeOrganizationName: null,
		hostServiceStatus: "running",
		localMachineId: null,
		navigate: () => {},
		notificationSoundsMuted: false,
		route: { params: {}, pathname: "/workspace/workspace-1" },
		workspace: workspace
			? {
					id: "workspace-1",
					name: "Test workspace",
					projectId: "project-1",
					workspaceType: "worktree",
				}
			: null,
	};
}

function withWindowEvents(
	run: (events: Array<{ detail: unknown; type: string }>) => void,
): void {
	const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
	const target = new EventTarget();
	const events: Array<{ detail: unknown; type: string }> = [];
	const windowLike = {
		addEventListener: target.addEventListener.bind(target),
		dispatchEvent: (event: Event) => {
			events.push({
				detail: event instanceof CustomEvent ? event.detail : null,
				type: event.type,
			});
			return target.dispatchEvent(event);
		},
		removeEventListener: target.removeEventListener.bind(target),
	};

	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: windowLike,
	});
	try {
		run(events);
	} finally {
		if (previousWindow) {
			Object.defineProperty(globalThis, "window", previousWindow);
		} else {
			delete (globalThis as { window?: unknown }).window;
		}
	}
}

describe("workspace command provider", () => {
	it("does not register commands without an active workspace", () => {
		expect(workspaceProvider.provide(commandContext(false))).toEqual([]);
	});

	it("does not register duplicate command ids", () => {
		const commands = workspaceProvider.provide(commandContext());
		const commandIds = commands.map((command) => command.id);

		expect(new Set(commandIds).size).toBe(commandIds.length);
	});

	it("registers discoverable pane split commands", () => {
		const commands = workspaceProvider.provide(commandContext());
		const hotkeyById = new Map(
			commands.map((command) => [command.id, command.hotkeyId] as const),
		);
		const commandIds = new Set(commands.map((command) => command.id));

		expect(hotkeyById.get("workspace.pane.splitAuto")).toBe("SPLIT_AUTO");
		expect(hotkeyById.get("workspace.pane.splitRight")).toBe("SPLIT_RIGHT");
		expect(hotkeyById.get("workspace.pane.splitDown")).toBe("SPLIT_DOWN");
		expect(hotkeyById.get("workspace.pane.splitChat")).toBe("SPLIT_WITH_CHAT");
		expect(hotkeyById.get("workspace.pane.splitBrowser")).toBe(
			"SPLIT_WITH_BROWSER",
		);
		expect(hotkeyById.get("workspace.pane.equalize")).toBe(
			"EQUALIZE_PANE_SPLITS",
		);
		expect(hotkeyById.get("workspace.pane.narrow")).toBe("NARROW_PANE_SPLIT");
		expect(hotkeyById.get("workspace.pane.widen")).toBe("WIDEN_PANE_SPLIT");
		expect(hotkeyById.get("workspace.pane.close")).toBe("CLOSE_PANE");
		expect(hotkeyById.get("workspace.pane.focusLeft")).toBe("FOCUS_PANE_LEFT");
		expect(hotkeyById.get("workspace.pane.focusRight")).toBe(
			"FOCUS_PANE_RIGHT",
		);
		expect(hotkeyById.get("workspace.pane.focusUp")).toBe("FOCUS_PANE_UP");
		expect(hotkeyById.get("workspace.pane.focusDown")).toBe("FOCUS_PANE_DOWN");
		expect(commandIds.has("workspace.pane.swapLeft")).toBe(true);
		expect(commandIds.has("workspace.pane.swapRight")).toBe(true);
		expect(commandIds.has("workspace.pane.swapUp")).toBe(true);
		expect(commandIds.has("workspace.pane.swapDown")).toBe(true);
	});

	it("dispatches workspace pane action events", () => {
		withWindowEvents((events) => {
			const commands = workspaceProvider.provide(commandContext());

			commands
				.find((command) => command.id === "workspace.pane.splitRight")
				?.run?.(commandContext());
			commands
				.find((command) => command.id === "workspace.pane.splitBrowser")
				?.run?.(commandContext());
			commands
				.find((command) => command.id === "workspace.pane.close")
				?.run?.(commandContext());
			commands
				.find((command) => command.id === "workspace.pane.narrow")
				?.run?.(commandContext());
			commands
				.find((command) => command.id === "workspace.pane.widen")
				?.run?.(commandContext());
			commands
				.find((command) => command.id === "workspace.pane.focusLeft")
				?.run?.(commandContext());
			commands
				.find((command) => command.id === "workspace.pane.swapRight")
				?.run?.(commandContext());

			expect(events).toContainEqual({
				detail: { action: "split-right" },
				type: DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			});
			expect(events).toContainEqual({
				detail: { action: "split-browser" },
				type: DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			});
			expect(events).toContainEqual({
				detail: { action: "close-pane" },
				type: DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			});
			expect(events).toContainEqual({
				detail: { action: "narrow-pane" },
				type: DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			});
			expect(events).toContainEqual({
				detail: { action: "widen-pane" },
				type: DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			});
			expect(events).toContainEqual({
				detail: { action: "focus-left" },
				type: DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			});
			expect(events).toContainEqual({
				detail: { action: "swap-right" },
				type: DASHBOARD_WORKSPACE_PANE_ACTION_EVENT,
			});
		});
	});
});
