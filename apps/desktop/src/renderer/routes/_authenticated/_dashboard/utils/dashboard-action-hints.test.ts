import { describe, expect, it } from "bun:test";
import {
	activateDashboardActionHintTarget,
	collectDashboardActionHintTargets,
	DASHBOARD_ACTION_HINTS_OPEN_EVENT,
	dashboardActionHintDisplayTitle,
	dashboardActionHintKeyFromInput,
	dashboardActionHintLabelForIndex,
	dashboardActionHintRootForElement,
	dashboardActionHintSidebarScopeForTargets,
	openDashboardActionHints,
} from "./dashboard-action-hints";

function visibleRect({
	height = 20,
	left = 10,
	top = 10,
	width = 80,
}: Partial<DOMRect> = {}): DOMRect {
	return {
		bottom: top + height,
		height,
		left,
		right: left + width,
		toJSON: () => ({}),
		top,
		width,
		x: left,
		y: top,
	} as DOMRect;
}

function setRect(element: HTMLElement, rect: DOMRect): void {
	element.getBoundingClientRect = () => rect;
}

describe("dashboard action hints", () => {
	it("generates compact vim-style labels", () => {
		expect(dashboardActionHintLabelForIndex(0)).toBe("a");
		expect(dashboardActionHintLabelForIndex(1)).toBe("s");
		expect(dashboardActionHintLabelForIndex(25)).toBe("m");
		expect(dashboardActionHintLabelForIndex(26)).toBe("aa");
		expect(dashboardActionHintLabelForIndex(27)).toBe("as");
		expect(dashboardActionHintLabelForIndex(-1)).toBe("");
	});

	it("normalizes action hint key input while preserving global shortcuts", () => {
		const baseInput = {
			altKey: false,
			ctrlKey: false,
			defaultPrevented: false,
			key: "A",
			metaKey: false,
		};

		expect(dashboardActionHintKeyFromInput(baseInput)).toBe("a");
		expect(
			dashboardActionHintKeyFromInput({ ...baseInput, key: "Escape" }),
		).toBe("escape");
		expect(
			dashboardActionHintKeyFromInput({ ...baseInput, key: "Enter" }),
		).toBe("enter");
		expect(
			dashboardActionHintKeyFromInput({
				...baseInput,
				key: "N",
				shiftKey: true,
			}),
		).toBe("N");
		expect(dashboardActionHintKeyFromInput({ ...baseInput, key: "Tab" })).toBe(
			null,
		);
		expect(
			dashboardActionHintKeyFromInput({ ...baseInput, altKey: true, key: "k" }),
		).toBe(null);
		expect(
			dashboardActionHintKeyFromInput({
				...baseInput,
				defaultPrevented: true,
				key: "f",
			}),
		).toBe(null);
	});

	it("collects only visible enabled dashboard action targets", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		const visibleButton = document.createElement("button");
		visibleButton.setAttribute("aria-label", "Refresh");
		setRect(visibleButton, visibleRect());
		const hiddenButton = document.createElement("button");
		setRect(hiddenButton, visibleRect({ height: 0, width: 0 }));
		const disabledButton = document.createElement("button");
		disabledButton.disabled = true;
		setRect(disabledButton, visibleRect());
		const link = document.createElement("a");
		link.href = "https://example.com";
		link.textContent = "Open";
		setRect(link, visibleRect({ top: 40 }));
		const screenReaderOnlyButton = document.createElement("button");
		screenReaderOnlyButton.className = "sr-only";
		setRect(screenReaderOnlyButton, visibleRect({ top: 80, width: 1 }));
		const explicitlyExcludedButton = document.createElement("button");
		explicitlyExcludedButton.setAttribute(
			"data-dashboard-action-hint-exclude",
			"true",
		);
		setRect(explicitlyExcludedButton, visibleRect({ top: 100 }));
		const excluded = document.createElement("button");
		setRect(excluded, visibleRect());
		const excludedParent = document.createElement("div");
		excludedParent.setAttribute("data-dashboard-keyboard-help", "true");
		excludedParent.append(excluded);

		root.append(
			visibleButton,
			hiddenButton,
			disabledButton,
			link,
			screenReaderOnlyButton,
			explicitlyExcludedButton,
			excludedParent,
		);

		const targets = collectDashboardActionHintTargets(root);

		expect(targets.map((target) => target.element)).toEqual([
			visibleButton,
			link,
		]);
		expect(targets.map((target) => target.label)).toEqual(["a", "s"]);
		expect(targets.map((target) => target.displayLabel)).toEqual(["a", "s"]);
		expect(targets.map((target) => target.title)).toEqual(["Refresh", "Open"]);
	});

	it("uses semantic sidebar shortcuts for scoped row action hints", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		const row = document.createElement("button");
		row.setAttribute("data-native-agent-session-row-id", "session-1");
		row.textContent = "Session";
		setRect(row, visibleRect());
		const menu = document.createElement("button");
		menu.setAttribute("data-dashboard-sidebar-action", "menu");
		menu.setAttribute("aria-label", "Show actions");
		setRect(menu, visibleRect({ top: 40 }));
		const pin = document.createElement("button");
		pin.setAttribute("data-dashboard-sidebar-action", "pin");
		pin.setAttribute("aria-label", "Pin");
		setRect(pin, visibleRect({ top: 70 }));
		const createFolder = document.createElement("button");
		createFolder.setAttribute("data-dashboard-sidebar-action", "create-folder");
		createFolder.setAttribute("aria-label", "New folder");
		setRect(createFolder, visibleRect({ top: 100 }));
		const archive = document.createElement("button");
		archive.setAttribute("data-dashboard-sidebar-action", "archive");
		archive.setAttribute("aria-label", "Move to overview");
		setRect(archive, visibleRect({ top: 130 }));
		root.append(row, menu, pin, createFolder, archive);

		const targets = collectDashboardActionHintTargets(root);

		expect(targets.map((target) => target.label)).toEqual([
			"enter",
			".",
			"p",
			"N",
			"x",
		]);
		expect(targets.map((target) => target.displayLabel)).toEqual([
			"↵",
			".",
			"p",
			"N",
			"x",
		]);
		expect(targets.map(dashboardActionHintDisplayTitle)).toEqual([
			"Open",
			"Actions",
			"Pin or unpin",
			"New folder",
			"Move to overview",
		]);
	});

	it("uses explicit action hint labels and titles for custom controls", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		const browserButton = document.createElement("button");
		browserButton.setAttribute("data-dashboard-action-hint-label", "b");
		browserButton.setAttribute(
			"data-dashboard-action-hint-title",
			"Show browser view",
		);
		browserButton.textContent = "Browser";
		setRect(browserButton, visibleRect());
		root.append(browserButton);

		const targets = collectDashboardActionHintTargets(root);

		expect(targets.map((target) => target.label)).toEqual(["b"]);
		expect(targets.map((target) => target.displayLabel)).toEqual(["b"]);
		expect(targets.map(dashboardActionHintDisplayTitle)).toEqual([
			"Show browser view",
		]);
	});

	it("skips native session header controls so hints stay focused on content", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		root.setAttribute("data-native-agent-view-root", "");
		const header = document.createElement("header");
		header.setAttribute("data-dashboard-action-hint-exclude", "true");
		const browserButton = document.createElement("button");
		browserButton.textContent = "Browser";
		setRect(browserButton, visibleRect());
		const refreshButton = document.createElement("button");
		refreshButton.setAttribute("aria-label", "Refresh");
		setRect(refreshButton, visibleRect({ left: 90 }));
		header.append(browserButton, refreshButton);
		const bodyAction = document.createElement("button");
		bodyAction.textContent = "Open attachment";
		setRect(bodyAction, visibleRect({ top: 60 }));
		root.append(header, bodyAction);

		const targets = collectDashboardActionHintTargets(root);

		expect(targets.map((target) => target.element)).toEqual([bodyAction]);
		expect(targets.map((target) => target.title)).toEqual(["Open attachment"]);
	});

	it("scopes action hints to the focused sidebar row when available", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		const focusedRow = document.createElement("div");
		focusedRow.setAttribute("data-dashboard-sidebar-action-scope", "true");
		const focusedButton = document.createElement("button");
		focusedRow.append(focusedButton);
		const otherRow = document.createElement("div");
		otherRow.setAttribute("data-dashboard-sidebar-action-scope", "true");
		root.append(focusedRow, otherRow);

		expect(dashboardActionHintRootForElement(focusedButton, root)).toBe(
			focusedRow,
		);
		expect(dashboardActionHintRootForElement(null, root)).toBe(null);
	});

	it("uses the sidebar keyboard focus marker before showing whole-app hints", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		const focusedRow = document.createElement("div");
		focusedRow.setAttribute("data-dashboard-sidebar-action-scope", "true");
		const focusedButton = document.createElement("button");
		focusedButton.setAttribute("data-dashboard-sidebar-keyboard-focus", "true");
		focusedRow.append(focusedButton);
		const otherButton = document.createElement("button");
		root.append(focusedRow, otherButton);

		expect(dashboardActionHintRootForElement(null, root)).toBe(focusedRow);
	});

	it("scopes action hints to the active native agent view", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		const nativeView = document.createElement("div");
		nativeView.setAttribute("data-native-agent-view-root", "");
		const browserButton = document.createElement("button");
		browserButton.textContent = "Browser";
		nativeView.append(browserButton);
		root.append(nativeView);

		expect(dashboardActionHintRootForElement(browserButton, root)).toBe(
			nativeView,
		);
	});

	it("recognizes sidebar scoped action hint panels", () => {
		if (typeof document === "undefined") return;
		const root = document.createElement("div");
		root.setAttribute("data-dashboard-sidebar-action-scope", "true");
		const row = document.createElement("button");
		row.setAttribute("data-native-agent-session-row-id", "session-1");
		setRect(row, visibleRect());
		const menu = document.createElement("button");
		menu.setAttribute("data-dashboard-sidebar-action", "menu");
		setRect(menu, visibleRect({ top: 40 }));
		root.append(row, menu);

		const targets = collectDashboardActionHintTargets(root);

		expect(dashboardActionHintSidebarScopeForTargets(targets)).toBe(root);
	});

	it("focuses and clicks the selected target", () => {
		if (typeof document === "undefined") return;
		const button = document.createElement("button");
		let clicked = false;
		button.addEventListener("click", () => {
			clicked = true;
		});
		document.body.append(button);

		activateDashboardActionHintTarget(button);

		expect(document.activeElement).toBe(button);
		expect(clicked).toBe(true);
		button.remove();
	});

	it("dispatches an open event for the dashboard hint overlay", () => {
		if (typeof window === "undefined") return;
		let openEventCount = 0;
		const listener = () => {
			openEventCount += 1;
		};
		window.addEventListener(DASHBOARD_ACTION_HINTS_OPEN_EVENT, listener);

		const opened = openDashboardActionHints();

		window.removeEventListener(DASHBOARD_ACTION_HINTS_OPEN_EVENT, listener);
		expect(opened).toBe(true);
		expect(openEventCount).toBe(1);
	});
});
