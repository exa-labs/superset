import { describe, expect, it } from "bun:test";
import {
	dashboardVimGlobalActionFromKey,
	dashboardVimNavigationActionFromSequence,
	nextDashboardVimSequence,
	setDashboardVimModeEnabled,
	shouldHandleDashboardVimKey,
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
		expect(nextDashboardVimSequence("g", "d")).toEqual({
			pendingPrefix: null,
			sequence: "g d",
		});
		expect(nextDashboardVimSequence("g", "g")).toEqual({
			pendingPrefix: null,
			sequence: "g g",
		});
		expect(nextDashboardVimSequence("g", "x")).toEqual({
			pendingPrefix: null,
			sequence: null,
		});
	});

	it("maps global vim actions", () => {
		expect(dashboardVimGlobalActionFromKey("H")).toBe("toggle-sidebar");
		expect(dashboardVimGlobalActionFromKey("h")).toBe("none");
		expect(dashboardVimGlobalActionFromKey("p")).toBe("none");
	});

	it("maps g-prefixed jumps to dashboard navigation actions", () => {
		expect(dashboardVimNavigationActionFromSequence("g c")).toBe("open-capy");
		expect(dashboardVimNavigationActionFromSequence("g d")).toBe("open-devin");
		expect(dashboardVimNavigationActionFromSequence("g g")).toBe("open-chrome");
		expect(dashboardVimNavigationActionFromSequence(null)).toBe("none");
	});
});
