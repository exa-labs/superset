import { describe, expect, it } from "bun:test";
import {
	NATIVE_AGENT_FOLDER_COLORS,
	NATIVE_AGENT_FOLDERS_STORAGE_KEY,
	NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-folders";
import { NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY } from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-notifications";
import type { CommandContext } from "../../core/types";
import { webProvider } from "./commands";

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

function commandContextWithNavigate(
	pathname: string,
	navigate: (path: string) => void,
): CommandContext {
	return {
		...commandContext(pathname),
		navigate,
	};
}

function withLocalStorage(
	values: Record<string, string>,
	run: () => void,
): void {
	const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
	const storage = {
		getItem: (key: string) => values[key] ?? null,
		removeItem: (key: string) => {
			delete values[key];
		},
		setItem: (key: string, value: string) => {
			values[key] = value;
		},
	};

	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: storage,
	});
	try {
		run();
	} finally {
		if (previous) {
			Object.defineProperty(globalThis, "localStorage", previous);
		} else {
			delete (globalThis as { localStorage?: unknown }).localStorage;
		}
	}
}

describe("web command provider", () => {
	function withWindowEvents(
		run: (events: Array<{ detail: unknown; type: string }>) => void,
	) {
		const previousWindow = Object.getOwnPropertyDescriptor(
			globalThis,
			"window",
		);
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
			setTimeout: (callback: () => void) => {
				callback();
				return 0;
			},
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

	it("does not register duplicate command ids", () => {
		const commands = webProvider.provide(
			commandContext("/web-tabs/chrome-default"),
		);
		const commandIds = commands.map((command) => command.id);

		expect(new Set(commandIds).size).toBe(commandIds.length);
	});

	it("registers native control-plane commands for active and unread runs", () => {
		const commandIds = new Set(
			webProvider.provide(commandContext()).map((command) => command.id),
		);

		expect(commandIds.has("native.capy.create")).toBe(true);
		expect(commandIds.has("native.capy.sync")).toBe(true);
		expect(commandIds.has("native.devin.create")).toBe(true);
		expect(commandIds.has("native.capy.all")).toBe(true);
		expect(commandIds.has("native.capy.active")).toBe(true);
		expect(commandIds.has("native.capy.unread")).toBe(true);
		expect(commandIds.has("native.capy.pinned")).toBe(true);
		expect(commandIds.has("native.capy.hidden")).toBe(true);
		expect(commandIds.has("native.capy.finished")).toBe(true);
		expect(commandIds.has("native.devin.all")).toBe(true);
		expect(commandIds.has("native.devin.active")).toBe(true);
		expect(commandIds.has("native.devin.unread")).toBe(true);
		expect(commandIds.has("native.devin.pinned")).toBe(true);
		expect(commandIds.has("native.devin.hidden")).toBe(true);
		expect(commandIds.has("native.devin.finished")).toBe(true);
		expect(commandIds.has("native.current.new")).toBe(true);
		expect(commandIds.has("native.current.refresh")).toBe(true);
		expect(commandIds.has("native.current.pin")).toBe(true);
		expect(commandIds.has("native.current.unpin")).toBe(true);
		expect(commandIds.has("native.current.rename")).toBe(true);
		expect(commandIds.has("native.current.hide")).toBe(true);
		expect(commandIds.has("native.current.show")).toBe(true);
		expect(commandIds.has("native.current.toggleBrowser")).toBe(true);
		expect(commandIds.has("native.current.toggleSplit")).toBe(true);
		expect(commandIds.has("native.current.toggleDiagnostics")).toBe(true);
		expect(commandIds.has("native.folder.create")).toBe(true);
		expect(commandIds.has("native.folder.rename")).toBe(true);
		expect(commandIds.has("native.folder.color")).toBe(true);
		expect(commandIds.has("native.folder.delete")).toBe(true);
		expect(commandIds.has("native.folder.moveCurrent")).toBe(true);
		expect(commandIds.has("native.folder.removeCurrent")).toBe(true);
	});

	it("exposes native browser/split keybindings in the control plane", () => {
		const commands = webProvider.provide(
			commandContext("/native/devin/session-1"),
		);
		const openCapy = commands.find(
			(command) => command.id === "native.capy.open",
		);
		const openDevin = commands.find(
			(command) => command.id === "native.devin.open",
		);
		const toggleBrowser = commands.find(
			(command) => command.id === "native.current.toggleBrowser",
		);
		const toggleSplit = commands.find(
			(command) => command.id === "native.current.toggleSplit",
		);

		expect(openCapy?.hotkeyId).toBe("OPEN_CAPY");
		expect(openDevin?.hotkeyId).toBe("OPEN_DEVIN");
		expect(toggleBrowser?.hotkeyId).toBe("TOGGLE_NATIVE_BROWSER_VIEW");
		expect(toggleSplit?.hotkeyId).toBe("TOGGLE_NATIVE_SPLIT_VIEW");
	});

	it("exposes local native session shortcuts in command palette rows", () => {
		const commands = webProvider.provide(
			commandContext("/native/devin/session-1"),
		);
		const shortcutById = new Map(
			commands.map((command) => [command.id, command.shortcutLabel] as const),
		);

		expect(shortcutById.get("native.current.new")).toBe("n");
		expect(shortcutById.get("native.current.refresh")).toBe("R");
		expect(shortcutById.get("native.current.pin")).toBe("p");
		expect(shortcutById.get("native.current.unpin")).toBe("p");
		expect(shortcutById.get("native.current.rename")).toBe("e");
		expect(shortcutById.get("native.current.hide")).toBe("x");
		expect(shortcutById.get("native.current.show")).toBe("p");
		expect(shortcutById.get("native.current.toggleBrowser")).toBe("b");
		expect(shortcutById.get("native.current.toggleSplit")).toBe("s");
		expect(shortcutById.get("native.capy.unread")).toBe("u");
		expect(shortcutById.get("native.devin.unread")).toBe("u");
		expect(shortcutById.get("native.folder.create")).toBe("n");
		expect(shortcutById.get("native.folder.rename")).toBe("e");
		expect(shortcutById.get("native.folder.color")).toBe("c");
		expect(shortcutById.get("native.folder.delete")).toBe("d");
		expect(shortcutById.get("native.folder.moveCurrent")).toBe("m");
		expect(shortcutById.get("native.folder.removeCurrent")).toBe("F");
	});

	it("registers Chrome creation and tab jump commands", () => {
		const commandIds = new Set(
			webProvider
				.provide(commandContext("/web-tabs/chrome-default"))
				.map((command) => command.id),
		);

		expect(commandIds.has("web.chrome.new")).toBe(true);
		expect(commandIds.has("web.tab.chrome-default")).toBe(true);
		expect(
			webProvider
				.provide(commandContext("/web-tabs/chrome-default"))
				.find((command) => command.id === "web.chrome.new")?.hotkeyId,
		).toBe("OPEN_CHROME");
	});

	it("registers root kr9 terminal commands", () => {
		const navigations: string[] = [];
		const context = commandContextWithNavigate("/native/capy", (path) => {
			navigations.push(path);
		});
		const commands = webProvider.provide(context);
		const commandIds = new Set(commands.map((command) => command.id));

		expect(commandIds.has("terminal.root.stag")).toBe(true);
		expect(commandIds.has("terminal.root.prod")).toBe(true);
		expect(commandIds.has("terminal.root.heph")).toBe(true);

		commands
			.find((command) => command.id === "terminal.root.heph")
			?.run?.(context);

		expect(navigations).toEqual(["/root-terminal/heph"]);
	});

	it("registers current Chrome tab control commands only on web routes", () => {
		const webContext = commandContext("/web-tabs/chrome-default");
		const nativeContext = commandContext("/native/capy");
		const commands = webProvider.provide(webContext);
		const commandIds = new Set(commands.map((command) => command.id));
		const shortcutById = new Map(
			commands.map((command) => [command.id, command.shortcutLabel] as const),
		);
		const reload = commands.find(
			(command) => command.id === "web.current.reload",
		);

		expect(commandIds.has("web.current.reload")).toBe(true);
		expect(commandIds.has("web.current.newFromCurrent")).toBe(true);
		expect(commandIds.has("web.current.newGoogle")).toBe(true);
		expect(commandIds.has("web.current.newChatGPT")).toBe(true);
		expect(commandIds.has("web.current.newClaude")).toBe(true);
		expect(commandIds.has("web.current.toggleSplit")).toBe(true);
		expect(commandIds.has("web.current.close")).toBe(true);
		expect(shortcutById.get("web.current.reload")).toBe("r");
		expect(shortcutById.get("web.current.newFromCurrent")).toBe("n");
		expect(shortcutById.get("web.current.toggleSplit")).toBe("s");
		expect(shortcutById.get("web.current.close")).toBe("x");
		expect(reload?.when?.(webContext)).toBe(true);
		expect(reload?.when?.(nativeContext)).toBe(false);
	});

	it("shows current native session commands only on concrete native sessions", () => {
		const sessionContext = commandContext("/native/devin/session-1");
		const overviewContext = commandContext("/native/devin");
		const unrelatedContext = commandContext("/web-tabs/chrome-default");
		const commands = webProvider.provide(sessionContext);

		for (const id of [
			"native.current.pin",
			"native.current.unpin",
			"native.current.rename",
			"native.current.hide",
			"native.current.show",
			"native.current.toggleBrowser",
			"native.current.toggleSplit",
		]) {
			const command = commands.find((candidate) => candidate.id === id);
			expect(command?.when?.(sessionContext)).toBe(true);
			expect(command?.when?.(overviewContext)).toBe(false);
			expect(command?.when?.(unrelatedContext)).toBe(false);
		}
	});

	it("dispatches provider-scoped native control-plane events", () => {
		withWindowEvents((events) => {
			const context = commandContext("/native/devin/session-1");
			const commands = webProvider.provide(context);

			commands
				.find((command) => command.id === "native.current.new")
				?.run?.(context);
			commands
				.find((command) => command.id === "native.current.toggleDiagnostics")
				?.run?.(context);
			commands
				.find((command) => command.id === "native.current.rename")
				?.run?.(context);

			expect(events).toContainEqual({
				detail: { provider: "devin" },
				type: "dashboard-native-agent-create",
			});
			expect(events).toContainEqual({
				detail: { action: "toggle-diagnostics", provider: "devin" },
				type: "dashboard-native-agent-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "rename", provider: "devin" },
				type: "dashboard-native-agent-current-action",
			});
		});
	});

	it("registers concrete folder commands for the current native provider", () => {
		withLocalStorage(
			{
				[NATIVE_AGENT_FOLDERS_STORAGE_KEY]: JSON.stringify([
					{
						color: "#38bdf8",
						createdAt: 1,
						id: "capy-folder",
						isCollapsed: false,
						provider: "capy",
						title: "Research",
						updatedAt: 1,
					},
					{
						color: "#a78bfa",
						createdAt: 1,
						id: "devin-folder",
						isCollapsed: false,
						provider: "devin",
						title: "Infra",
						updatedAt: 1,
					},
				]),
				[NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY]: JSON.stringify([
					"#123456",
				]),
			},
			() => {
				const context = commandContext("/native/capy/thread-1");
				const commands = webProvider.provide(context);
				const commandIds = new Set(commands.map((command) => command.id));
				const capyMove = commands.find(
					(command) => command.id === "native.folder.capy-folder.moveCurrent",
				);
				const capyRename = commands.find(
					(command) => command.id === "native.folder.capy-folder.rename",
				);
				const capyColor = commands.find(
					(command) => command.id === "native.folder.capy-folder.color",
				);
				const capyDelete = commands.find(
					(command) => command.id === "native.folder.capy-folder.delete",
				);
				const devinMove = commands.find(
					(command) => command.id === "native.folder.devin-folder.moveCurrent",
				);

				expect(commandIds.has("native.folder.capy-folder.rename")).toBe(true);
				expect(commandIds.has("native.folder.capy-folder.color")).toBe(true);
				expect(
					commandIds.has(
						`native.folder.capy-folder.color.${NATIVE_AGENT_FOLDER_COLORS[0].slice(1)}`,
					),
				).toBe(true);
				expect(commandIds.has("native.folder.capy-folder.color.123456")).toBe(
					true,
				);
				expect(commandIds.has("native.folder.capy-folder.delete")).toBe(true);
				expect(capyMove?.title).toBe("Move current session to Research");
				expect(capyMove?.shortcutLabel).toBe("m");
				expect(capyRename?.shortcutLabel).toBe("e");
				expect(capyColor?.shortcutLabel).toBe("c");
				expect(capyDelete?.shortcutLabel).toBe("d");
				expect(capyMove?.when?.(context)).toBe(true);
				expect(devinMove?.when?.(context)).toBe(false);
			},
		);
	});

	it("registers a jump command for the latest native reply notification", () => {
		withLocalStorage(
			{
				[NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY]: JSON.stringify({
					id: "session-1",
					key: "devin:session-1",
					latestTime: 1780323000000,
					preview: "Done",
					provider: "devin",
					title: "Devin task",
				}),
			},
			() => {
				const navigatedTo: string[] = [];
				const context = {
					...commandContext("/native/devin"),
					navigate: (path: string) => {
						navigatedTo.push(path);
					},
				};
				const command = webProvider
					.provide(context)
					.find((candidate) => candidate.id === "native.latestReply.open");

				expect(command?.title).toBe("Open latest Devin reply");
				expect(command?.shortcutLabel).toBe("u");
				command?.run?.(context);
				expect(navigatedTo).toEqual(["/native/devin/session-1"]);
			},
		);
	});
});
