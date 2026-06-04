import { useWorkspaceSidebarStore } from "renderer/stores/workspace-sidebar-state";

export function dashboardNavigationSidebarToggleAction(input: {
	isOpen: boolean;
}): "open" | "toggle-collapsed" {
	return input.isOpen ? "toggle-collapsed" : "open";
}

export function toggleDashboardNavigationSidebar() {
	const sidebarState = useWorkspaceSidebarStore.getState();

	if (
		dashboardNavigationSidebarToggleAction({
			isOpen: sidebarState.isOpen,
		}) === "open"
	) {
		sidebarState.setOpen(true);
		return;
	}

	sidebarState.toggleCollapsed();
}
