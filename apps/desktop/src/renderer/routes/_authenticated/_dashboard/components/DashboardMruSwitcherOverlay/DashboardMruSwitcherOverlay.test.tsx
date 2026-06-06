import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardMruSwitcherOverlay } from "./DashboardMruSwitcherOverlay";

const entries = [
	{ path: "/web/overseer", viewedAt: 3 },
	{ path: "/native/devin/session-1", viewedAt: 2 },
	{ path: "/native/capy/thread-1", viewedAt: 1 },
];

describe("DashboardMruSwitcherOverlay", () => {
	it("renders cycling, reverse, and focus recovery hints", () => {
		const markup = renderToStaticMarkup(
			<DashboardMruSwitcherOverlay
				activeIndex={1}
				direction="next"
				entries={entries}
			/>,
		);

		expect(markup).toContain("Switching view");
		expect(markup).toContain("Option");
		expect(markup).toContain("Tab");
		expect(markup).toContain("next");
		expect(markup).toContain("Shift");
		expect(markup).toContain("previous");
		expect(markup).toContain("Esc");
		expect(markup).toContain("sidebar");
		expect(markup).toContain("Pause to settle");
	});

	it("stays hidden until MRU has another target", () => {
		const markup = renderToStaticMarkup(
			<DashboardMruSwitcherOverlay
				activeIndex={0}
				direction="next"
				entries={[entries[0]]}
			/>,
		);

		expect(markup).toBe("");
	});
});
