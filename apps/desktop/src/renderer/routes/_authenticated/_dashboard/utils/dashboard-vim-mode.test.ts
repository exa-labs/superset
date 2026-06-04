import { describe, expect, it } from "bun:test";
import {
	dashboardVimGlobalActionFromKey,
	dashboardVimNavigationActionFromSequence,
	isDashboardLocalVimSequenceScopeActive,
	nextDashboardVimSequence,
	setDashboardVimModeEnabled,
	setDashboardVimPendingPrefix,
	shouldHandleDashboardVimKey,
	useDashboardVimModeStore,
} from "./dashboard-vim-mode";

function keyEvent(
	overrides: Partial<KeyboardEvent> & { target?: EventTarget | null } = {},
) {
	const target = overrides.target ?? null;
	return {
		altKey: false,
		ctrlKey: false,
		defaultPrevented: false,
		isComposing: false,
		key: "j",
		metaKey: false,
		shiftKey: false,
		target,
		...overrides,
	} as KeyboardEvent;
}

describe("dashboard vim mode", () => {
	it("does not handle keys when disabled", () => {
		setDashboardVimModeEnabled(false);
		expect(shouldHandleDashboardVimKey(keyEvent())).toBe(false);
	});

	it("tracks pending Vim chord state and clears it when disabling Vim mode", () => {
		setDashboardVimModeEnabled(true);
		setDashboardVimPendingPrefix("g");
		expect(useDashboardVimModeStore.getState().pendingPrefix).toBe("g");
		setDashboardVimModeEnabled(false);
		expect(useDashboardVimModeStore.getState().pendingPrefix).toBeNull();
	});

	it("guards editable targets and modified chords", () => {
		setDashboardVimModeEnabled(true);
		if (typeof document !== "undefined") {
			const input = document.createElement("input");
			document.body.append(input);
			expect(shouldHandleDashboardVimKey(keyEvent({ target: input }))).toBe(
				false,
			);
			input.remove();
		}
		expect(shouldHandleDashboardVimKey(keyEvent({ metaKey: true }))).toBe(
			false,
		);
		expect(shouldHandleDashboardVimKey(keyEvent())).toBe(true);
	});

	it("guards command palette, terminal, editor, and browser webview targets", () => {
		setDashboardVimModeEnabled(true);
		if (typeof document === "undefined") return;

		const commandInput = document.createElement("input");
		commandInput.setAttribute("data-command-palette-input", "true");
		const browserView = document.createElement("div");
		browserView.setAttribute("data-dashboard-browser-view", "true");
		const terminalRoot = document.createElement("div");
		terminalRoot.setAttribute("data-terminal-root", "true");
		const monacoEditor = document.createElement("div");
		monacoEditor.setAttribute("data-monaco-editor", "true");
		const guardedTargets = [
			commandInput,
			document.createElement("webview"),
			browserView,
			terminalRoot,
			monacoEditor,
		];

		for (const target of guardedTargets) {
			document.body.append(target);
			expect(shouldHandleDashboardVimKey(keyEvent({ target }))).toBe(false);
			target.remove();
		}
	});

	it("parses g-prefixed jumps", () => {
		expect(nextDashboardVimSequence(null, "g")).toEqual({
			pendingPrefix: "g",
			sequence: null,
		});
		expect(nextDashboardVimSequence("g", "c")).toEqual({
			pendingPrefix: null,
			sequence: "g c",
		});
		expect(nextDashboardVimSequence("g", "b")).toEqual({
			pendingPrefix: null,
			sequence: "g b",
		});
		expect(nextDashboardVimSequence("g", "d")).toEqual({
			pendingPrefix: null,
			sequence: "g d",
		});
		expect(nextDashboardVimSequence("g", "g")).toEqual({
			pendingPrefix: null,
			sequence: "g g",
		});
		expect(nextDashboardVimSequence("g", "w")).toEqual({
			pendingPrefix: null,
			sequence: "g w",
		});
		expect(nextDashboardVimSequence("g", "x")).toEqual({
			pendingPrefix: null,
			sequence: null,
		});
	});

	it("lets local Vim scopes own g-prefixed navigation", () => {
		if (typeof document === "undefined") return;

		const sidebar = document.createElement("div");
		sidebar.setAttribute("data-dashboard-sidebar-root", "true");
		const sidebarRow = document.createElement("button");
		sidebar.append(sidebarRow);
		document.body.append(sidebar);

		const nativeView = document.createElement("div");
		nativeView.setAttribute("data-native-agent-view-root", "");
		const nativeButton = document.createElement("button");
		nativeView.append(nativeButton);
		document.body.append(nativeView);

		const ordinaryButton = document.createElement("button");
		document.body.append(ordinaryButton);

		try {
			expect(isDashboardLocalVimSequenceScopeActive(sidebarRow)).toBe(true);
			expect(isDashboardLocalVimSequenceScopeActive(nativeButton)).toBe(true);
			expect(isDashboardLocalVimSequenceScopeActive(ordinaryButton)).toBe(
				false,
			);

			sidebarRow.focus();
			expect(isDashboardLocalVimSequenceScopeActive(null)).toBe(true);
		} finally {
			sidebar.remove();
			nativeView.remove();
			ordinaryButton.remove();
		}
	});

	it("maps global vim actions", () => {
		expect(dashboardVimGlobalActionFromKey("f")).toBe("show-action-hints");
		expect(dashboardVimGlobalActionFromKey("?")).toBe("show-keyboard-help");
		expect(dashboardVimGlobalActionFromKey("H")).toBe("toggle-sidebar");
		expect(dashboardVimGlobalActionFromKey("h")).toBe("none");
		expect(dashboardVimGlobalActionFromKey("p")).toBe("none");
	});

	it("maps g-prefixed jumps to dashboard navigation actions", () => {
		expect(dashboardVimNavigationActionFromSequence("g b")).toBe("open-chrome");
		expect(dashboardVimNavigationActionFromSequence("g c")).toBe("open-capy");
		expect(dashboardVimNavigationActionFromSequence("g d")).toBe("open-devin");
		expect(dashboardVimNavigationActionFromSequence("g g")).toBe(
			"focus-sidebar-first",
		);
		expect(dashboardVimNavigationActionFromSequence("g w")).toBe(
			"open-workspaces",
		);
		expect(dashboardVimNavigationActionFromSequence(null)).toBe("none");
	});
});
