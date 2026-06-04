import { describe, expect, it } from "bun:test";
import { dashboardNavigationSidebarToggleAction } from "./dashboard-navigation-sidebar-toggle";

describe("toggleDashboardNavigationSidebar", () => {
	it("reopens a hidden sidebar before touching collapsed width", () => {
		expect(dashboardNavigationSidebarToggleAction({ isOpen: false })).toBe(
			"open",
		);
	});

	it("routes visible sidebars through the collapsed-width toggle", () => {
		expect(dashboardNavigationSidebarToggleAction({ isOpen: true })).toBe(
			"toggle-collapsed",
		);
	});
});
