import { describe, expect, it } from "bun:test";
import {
	activateDashboardActionHintTarget,
	collectDashboardActionHintTargets,
	dashboardActionHintLabelForIndex,
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
			excludedParent,
		);

		const targets = collectDashboardActionHintTargets(root);

		expect(targets.map((target) => target.element)).toEqual([
			visibleButton,
			link,
		]);
		expect(targets.map((target) => target.label)).toEqual(["a", "s"]);
		expect(targets.map((target) => target.title)).toEqual(["Refresh", "Open"]);
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
});
