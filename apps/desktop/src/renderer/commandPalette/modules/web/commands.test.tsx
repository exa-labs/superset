import { describe, expect, it } from "bun:test";
import {
	NATIVE_AGENT_FOLDER_COLORS,
	NATIVE_AGENT_FOLDERS_STORAGE_KEY,
	NATIVE_AGENT_RECENT_FOLDER_COLORS_STORAGE_KEY,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-folders";
import {
	NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY,
	NATIVE_AGENT_READ_STATE_STORAGE_KEY,
} from "renderer/routes/_authenticated/_dashboard/native/utils/native-agent-notifications";
import {
	createDashboardWebTab,
	createDashboardWebTabFolder,
	getDashboardWebTab,
	resetDashboardWebTabsForTests,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";
import type { CommandContext } from "../../core/types";
import { orderCommandsByPriority } from "../../core/useActiveCommands";
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

function activeOrderedCommandIds(context: CommandContext): string[] {
	return orderCommandsByPriority(
		webProvider
			.provide(context)
			.filter((command) => !command.when || command.when(context)),
	).map((command) => command.id);
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
		expect(commandIds.has("native.current.narrowSplit")).toBe(true);
		expect(commandIds.has("native.current.widenSplit")).toBe(true);
		expect(commandIds.has("native.current.equalizeSplit")).toBe(true);
		expect(commandIds.has("native.current.toggleDiagnostics")).toBe(true);
		expect(commandIds.has("native.folder.create")).toBe(true);
		expect(commandIds.has("native.folder.rename")).toBe(true);
		expect(commandIds.has("native.folder.color")).toBe(true);
		expect(commandIds.has("native.folder.delete")).toBe(true);
		expect(commandIds.has("native.folder.moveCurrent")).toBe(true);
		expect(commandIds.has("native.folder.removeCurrent")).toBe(true);
	});

	it("shows shortcut paths for primary native create actions", () => {
		const commands = webProvider.provide(commandContext("/native/capy"));
		const shortcutById = new Map(
			commands.map((command) => [command.id, command.shortcutLabel] as const),
		);

		expect(shortcutById.get("native.capy.create")).toBe("⌥C n");
		expect(shortcutById.get("native.devin.create")).toBe("⌥D n");
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
		expect(shortcutById.get("native.current.reply")).toBe("r/i");
		expect(shortcutById.get("native.current.pin")).toBe("p");
		expect(shortcutById.get("native.current.unpin")).toBe("p");
		expect(shortcutById.get("native.current.rename")).toBe("e");
		expect(shortcutById.get("native.current.hide")).toBe("a/x");
		expect(shortcutById.get("native.current.show")).toBe("p");
		expect(shortcutById.get("native.current.openExternal")).toBe("O");
		expect(shortcutById.get("native.current.toggleBrowser")).toBe("b");
		expect(shortcutById.get("native.current.toggleSplit")).toBe("s");
		expect(shortcutById.get("native.current.closeSplit")).toBe("q");
		expect(shortcutById.get("native.current.narrowSplit")).toBe("[");
		expect(shortcutById.get("native.current.widenSplit")).toBe("]");
		expect(shortcutById.get("native.current.equalizeSplit")).toBe("=");
		expect(shortcutById.get("native.capy.unread")).toBe("u");
		expect(shortcutById.get("native.devin.unread")).toBe("u");
		expect(shortcutById.get("native.folder.create")).toBe("N");
		expect(shortcutById.get("native.folder.rename")).toBe("e");
		expect(shortcutById.get("native.folder.color")).toBe("c");
		expect(shortcutById.get("native.folder.delete")).toBe("d");
		expect(shortcutById.get("native.folder.moveCurrent")).toBe("m");
		expect(shortcutById.get("native.folder.removeCurrent")).toBe("F");
		expect(
			commands.find((command) => command.id === "native.current.hide")
				?.keywords,
		).toContain("archive");
		expect(
			commands.find((command) => command.id === "native.current.reply")
				?.keywords,
		).toContain("insert");
	});

	it("prioritizes current native session actions above generic native commands", () => {
		withLocalStorage({}, () => {
			const commandIds = activeOrderedCommandIds(
				commandContext("/native/devin/session-1"),
			);

			expect(commandIds.slice(0, 5)).toEqual([
				"native.current.reply",
				"native.current.openBrowser",
				"native.current.openExternal",
				"native.current.pin",
				"native.current.unpin",
			]);
			expect(commandIds.indexOf("native.current.reply")).toBeLessThan(
				commandIds.indexOf("native.current.new"),
			);
			expect(commandIds.indexOf("native.current.hide")).toBeLessThan(
				commandIds.indexOf("native.capy.create"),
			);
		});
	});

	it("prioritizes unread native replies above current-session commands", () => {
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
				const commandIds = activeOrderedCommandIds(
					commandContext("/native/devin/session-1"),
				);

				expect(commandIds.slice(0, 2)).toEqual([
					"native.latestReply.open",
					"native.latestReply.markRead",
				]);
				expect(commandIds.indexOf("native.latestReply.open")).toBeLessThan(
					commandIds.indexOf("native.current.reply"),
				);
				expect(
					webProvider
						.provide(commandContext("/native/devin/session-1"))
						.find((command) => command.id === "native.latestReply.open")
						?.hotkeyId,
				).toBe("OPEN_UNREAD_NATIVE_REPLY");
			},
		);
	});

	it("prioritizes active Chrome tab controls above generic web jumps", () => {
		const commandIds = activeOrderedCommandIds(
			commandContext("/web-tabs/chrome-default"),
		);

		expect(commandIds.slice(0, 8)).toEqual([
			"web.current.reload",
			"web.current.goBack",
			"web.current.goForward",
			"web.current.previousTab",
			"web.current.nextTab",
			"web.current.newFromCurrent",
			"web.current.newGoogle",
			"web.current.newChatGPT",
		]);
		expect(commandIds.indexOf("web.current.reload")).toBeLessThan(
			commandIds.indexOf("web.page.overseer"),
		);
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

	it("registers Chrome tab action commands with keyboard hints", () => {
		withLocalStorage({}, () => {
			resetDashboardWebTabsForTests();
			try {
				const folder = createDashboardWebTabFolder("chrome", "Research");
				const tab = createDashboardWebTab("chrome", {
					title: "Latency dashboard",
					url: "https://grafana.example.test/d/latency",
				});
				const commands = webProvider.provide(
					commandContext(`/web-tabs/${tab.id}`),
				);
				const shortcutById = new Map(
					commands.map(
						(command) => [command.id, command.shortcutLabel] as const,
					),
				);
				const commandIds = new Set(commands.map((command) => command.id));

				expect(commandIds.has(`web.tab.${tab.id}.togglePin`)).toBe(true);
				expect(commandIds.has(`web.tab.${tab.id}.close`)).toBe(true);
				expect(
					commandIds.has(`web.tab.${tab.id}.moveToFolder.${folder.id}`),
				).toBe(true);
				expect(commandIds.has(`web.current.moveToFolder.${folder.id}`)).toBe(
					true,
				);
				expect(shortcutById.get("web.current.pin")).toBe("p");
				expect(commandIds.has("web.current.unpin")).toBe(false);
				expect(shortcutById.get(`web.tab.${tab.id}.togglePin`)).toBe("p");
				expect(shortcutById.get(`web.tab.${tab.id}.close`)).toBe("x");
				expect(
					shortcutById.get(`web.tab.${tab.id}.moveToFolder.${folder.id}`),
				).toBe("m");

				commands
					.find((command) => command.id === "web.current.pin")
					?.run?.(commandContext(`/web-tabs/${tab.id}`));
				expect(getDashboardWebTab(tab.id)?.isPinned).toBe(true);

				const pinnedCommands = webProvider.provide(
					commandContext(`/web-tabs/${tab.id}`),
				);
				expect(
					pinnedCommands.find((command) => command.id === "web.current.unpin")
						?.shortcutLabel,
				).toBe("p");
				pinnedCommands
					.find((command) => command.id === "web.current.unpin")
					?.run?.(commandContext(`/web-tabs/${tab.id}`));
				expect(getDashboardWebTab(tab.id)?.isPinned).toBe(false);

				commands
					.find((command) => command.id === `web.tab.${tab.id}.togglePin`)
					?.run?.(commandContext(`/web-tabs/${tab.id}`));
				expect(getDashboardWebTab(tab.id)?.isPinned).toBe(true);

				commands
					.find(
						(command) =>
							command.id === `web.tab.${tab.id}.moveToFolder.${folder.id}`,
					)
					?.run?.(commandContext(`/web-tabs/${tab.id}`));
				expect(getDashboardWebTab(tab.id)?.folderId).toBe(folder.id);

				const updatedCommands = webProvider.provide(
					commandContext(`/web-tabs/${tab.id}`),
				);
				expect(
					updatedCommands.find(
						(command) => command.id === "web.current.removeFolder",
					)?.shortcutLabel,
				).toBe("F");
				updatedCommands
					.find((command) => command.id === "web.current.removeFolder")
					?.run?.(commandContext(`/web-tabs/${tab.id}`));
				expect(getDashboardWebTab(tab.id)?.folderId).toBeNull();
			} finally {
				resetDashboardWebTabsForTests();
			}
		});
	});

	it("navigates away when a command closes the active Chrome tab", () => {
		withLocalStorage({}, () => {
			resetDashboardWebTabsForTests();
			try {
				const first = createDashboardWebTab("chrome", {
					title: "First",
					url: "https://first.example.test",
				});
				const second = createDashboardWebTab("chrome", {
					title: "Second",
					url: "https://second.example.test",
				});
				const navigations: string[] = [];
				const context = commandContextWithNavigate(
					`/web-tabs/${first.id}`,
					(path) => {
						navigations.push(path);
					},
				);
				const commands = webProvider.provide(context);

				commands
					.find((command) => command.id === `web.tab.${first.id}.close`)
					?.run?.(context);

				expect(navigations).toEqual([`/web-tabs/${second.id}`]);
				expect(getDashboardWebTab(first.id)).toBeNull();
				expect(getDashboardWebTab(second.id)).not.toBeNull();
			} finally {
				resetDashboardWebTabsForTests();
			}
		});
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
		expect(
			commands.find((command) => command.id === "terminal.root.heph")?.title,
		).toBe("Open heph kr9");
		expect(
			commands.find((command) => command.id === "terminal.root.heph")
				?.shortcutLabel,
		).toBeUndefined();
		expect(
			commands.find((command) => command.id === "terminal.root.heph")
				?.description,
		).toBe("Run kr9 in repo root");

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
		expect(commandIds.has("web.current.goBack")).toBe(true);
		expect(commandIds.has("web.current.goForward")).toBe(true);
		expect(commandIds.has("web.current.previousTab")).toBe(true);
		expect(commandIds.has("web.current.nextTab")).toBe(true);
		expect(commandIds.has("web.current.newFromCurrent")).toBe(true);
		expect(commandIds.has("web.current.newGoogle")).toBe(true);
		expect(commandIds.has("web.current.newChatGPT")).toBe(true);
		expect(commandIds.has("web.current.newClaude")).toBe(true);
		expect(commandIds.has("web.current.toggleSplit")).toBe(true);
		expect(commandIds.has("web.current.swapSplit")).toBe(true);
		expect(commandIds.has("web.current.closeSplit")).toBe(true);
		expect(commandIds.has("web.current.narrowActiveSplit")).toBe(true);
		expect(commandIds.has("web.current.widenActiveSplit")).toBe(true);
		expect(commandIds.has("web.current.equalizeSplit")).toBe(true);
		expect(commandIds.has("web.current.close")).toBe(true);
		expect(shortcutById.get("web.current.reload")).toBe("r");
		expect(shortcutById.get("web.current.goBack")).toBe("H");
		expect(shortcutById.get("web.current.goForward")).toBe("L");
		expect(shortcutById.get("web.current.previousTab")).toBe("h");
		expect(shortcutById.get("web.current.nextTab")).toBe("l");
		expect(shortcutById.get("web.current.newFromCurrent")).toBe("n");
		expect(shortcutById.get("web.current.toggleSplit")).toBe("s");
		expect(shortcutById.get("web.current.swapSplit")).toBe("w");
		expect(shortcutById.get("web.current.closeSplit")).toBe("q");
		expect(shortcutById.get("web.current.narrowActiveSplit")).toBe("[");
		expect(shortcutById.get("web.current.widenActiveSplit")).toBe("]");
		expect(shortcutById.get("web.current.equalizeSplit")).toBe("=");
		expect(shortcutById.get("web.current.close")).toBe("x");
		expect(reload?.when?.(webContext)).toBe(true);
		expect(reload?.when?.(nativeContext)).toBe(false);
	});

	it("dispatches Chrome browser actions from the control plane", () => {
		withWindowEvents((events) => {
			const context = commandContext("/web-tabs/chrome-default");
			const commands = webProvider.provide(context);

			commands
				.find((command) => command.id === "web.current.goBack")
				?.run?.(context);
			commands
				.find((command) => command.id === "web.current.goForward")
				?.run?.(context);
			commands
				.find((command) => command.id === "web.current.previousTab")
				?.run?.(context);
			commands
				.find((command) => command.id === "web.current.nextTab")
				?.run?.(context);
			commands
				.find((command) => command.id === "web.current.closeSplit")
				?.run?.(context);

			expect(events).toContainEqual({
				detail: { action: "go-back" },
				type: "dashboard-browser-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "go-forward" },
				type: "dashboard-browser-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "previous-tab" },
				type: "dashboard-browser-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "next-tab" },
				type: "dashboard-browser-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "close-split" },
				type: "dashboard-browser-current-action",
			});
		});
	});

	it("shows current native session commands only on concrete native sessions", () => {
		const sessionContext = commandContext("/native/devin/session-1");
		const overviewContext = commandContext("/native/devin");
		const unrelatedContext = commandContext("/web-tabs/chrome-default");
		const commands = webProvider.provide(sessionContext);

		for (const id of [
			"native.current.reply",
			"native.current.openBrowser",
			"native.current.openExternal",
			"native.current.pin",
			"native.current.unpin",
			"native.current.rename",
			"native.current.hide",
			"native.current.show",
			"native.current.toggleBrowser",
			"native.current.toggleSplit",
			"native.current.narrowSplit",
			"native.current.closeSplit",
			"native.current.widenSplit",
			"native.current.equalizeSplit",
		]) {
			const command = commands.find((candidate) => candidate.id === id);
			expect(command?.when?.(sessionContext)).toBe(true);
			expect(command?.when?.(overviewContext)).toBe(false);
			expect(command?.when?.(unrelatedContext)).toBe(false);
		}

		const shortcutById = new Map(
			commands.map((command) => [command.id, command.shortcutLabel] as const),
		);
		expect(shortcutById.get("native.current.reply")).toBe("r/i");
		expect(shortcutById.get("native.current.openBrowser")).toBe("o");
		expect(shortcutById.get("native.current.openExternal")).toBe("O");
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
			commands
				.find((command) => command.id === "native.current.reply")
				?.run?.(context);
			commands
				.find((command) => command.id === "native.current.openBrowser")
				?.run?.(context);
			commands
				.find((command) => command.id === "native.current.openExternal")
				?.run?.(context);
			commands
				.find((command) => command.id === "native.current.narrowSplit")
				?.run?.(context);
			commands
				.find((command) => command.id === "native.current.swapSplit")
				?.run?.(context);
			commands
				.find((command) => command.id === "native.current.closeSplit")
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
			expect(events).toContainEqual({
				detail: { action: "focus-composer", provider: "devin" },
				type: "dashboard-native-agent-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "open-browser", provider: "devin" },
				type: "dashboard-native-agent-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "open-external", provider: "devin" },
				type: "dashboard-native-agent-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "narrow-native-split", provider: "devin" },
				type: "dashboard-native-agent-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "swap-split", provider: "devin" },
				type: "dashboard-native-agent-current-action",
			});
			expect(events).toContainEqual({
				detail: { action: "close-split", provider: "devin" },
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

	it("registers actionable commands for the latest unread native reply notification", () => {
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
				expect(command?.hotkeyId).toBe("OPEN_UNREAD_NATIVE_REPLY");
				expect(
					webProvider
						.provide(context)
						.find((candidate) => candidate.id === "native.latestReply.markRead")
						?.hotkeyId,
				).toBe("MARK_LATEST_NATIVE_REPLY_READ");
				command?.run?.(context);
				expect(navigatedTo).toEqual(["/native/devin/session-1"]);
				expect(localStorage.getItem(NATIVE_AGENT_READ_STATE_STORAGE_KEY)).toBe(
					JSON.stringify({ "devin:session-1": 1780323000000 }),
				);
				expect(
					webProvider
						.provide(context)
						.some((candidate) => candidate.id === "native.latestReply.open"),
				).toBe(false);
			},
		);
	});

	it("marks the latest native reply read without navigating", () => {
		withLocalStorage(
			{
				[NATIVE_AGENT_LATEST_REPLY_STORAGE_KEY]: JSON.stringify({
					id: "thread-1",
					key: "capy:thread-1",
					latestTime: 1780324000000,
					preview: "Ready",
					provider: "capy",
					title: "Capy task",
				}),
			},
			() => {
				const navigatedTo: string[] = [];
				const context = {
					...commandContext("/native/capy"),
					navigate: (path: string) => {
						navigatedTo.push(path);
					},
				};
				const command = webProvider
					.provide(context)
					.find((candidate) => candidate.id === "native.latestReply.markRead");

				expect(command?.title).toBe("Mark latest Capy reply read");
				expect(command?.hotkeyId).toBe("MARK_LATEST_NATIVE_REPLY_READ");
				command?.run?.(context);

				expect(navigatedTo).toEqual([]);
				expect(localStorage.getItem(NATIVE_AGENT_READ_STATE_STORAGE_KEY)).toBe(
					JSON.stringify({ "capy:thread-1": 1780324000000 }),
				);
			},
		);
	});
});
