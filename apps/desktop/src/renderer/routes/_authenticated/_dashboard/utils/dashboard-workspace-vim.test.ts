import { describe, expect, it } from "bun:test";
import { dashboardWorkspacePaneVimActionFromKey } from "./dashboard-workspace-vim";

describe("dashboard workspace vim", () => {
	it("maps pane focus, swap, resize, split, and close keys", () => {
		expect(dashboardWorkspacePaneVimActionFromKey("h")).toBe("focus-left");
		expect(dashboardWorkspacePaneVimActionFromKey("j")).toBe("focus-down");
		expect(dashboardWorkspacePaneVimActionFromKey("k")).toBe("focus-up");
		expect(dashboardWorkspacePaneVimActionFromKey("l")).toBe("focus-right");
		expect(dashboardWorkspacePaneVimActionFromKey("H")).toBe("swap-left");
		expect(dashboardWorkspacePaneVimActionFromKey("J")).toBe("swap-down");
		expect(dashboardWorkspacePaneVimActionFromKey("K")).toBe("swap-up");
		expect(dashboardWorkspacePaneVimActionFromKey("L")).toBe("swap-right");
		expect(dashboardWorkspacePaneVimActionFromKey("[")).toBe("narrow-pane");
		expect(dashboardWorkspacePaneVimActionFromKey("]")).toBe("widen-pane");
		expect(dashboardWorkspacePaneVimActionFromKey("=")).toBe("equalize");
		expect(dashboardWorkspacePaneVimActionFromKey("s")).toBe("split-auto");
		expect(dashboardWorkspacePaneVimActionFromKey("x")).toBe("close-pane");
		expect(dashboardWorkspacePaneVimActionFromKey("g")).toBe("none");
	});
});
