import type { HotkeyId } from "renderer/hotkeys";

export const DASHBOARD_KEYBOARD_HELP_OPEN_EVENT =
	"dashboard-keyboard-help-open";

export type DashboardKeyboardHelpEntry =
	| {
			description: string;
			hotkeyId: HotkeyId;
			keys?: never;
			label: string;
	  }
	| {
			description: string;
			hotkeyId?: never;
			keys: string[];
			label: string;
	  };

export interface DashboardKeyboardHelpSection {
	entries: DashboardKeyboardHelpEntry[];
	id: string;
	title: string;
}

export const DASHBOARD_KEYBOARD_HELP_SECTIONS: DashboardKeyboardHelpSection[] =
	[
		{
			id: "global",
			title: "Global",
			entries: [
				{
					hotkeyId: "OPEN_CONTROL_PLANE",
					label: "Open control plane",
					description:
						"Create sessions, switch views, and run workspace actions",
				},
				{
					hotkeyId: "TOGGLE_VIM_MODE",
					label: "Toggle Vim mode",
					description: "Enable keyboard-native dashboard navigation",
				},
				{
					hotkeyId: "SHOW_HOTKEYS",
					label: "Show this overlay",
					description:
						"Review the dashboard keyboard map without leaving context",
				},
			],
		},
		{
			id: "switching",
			title: "Switching",
			entries: [
				{
					hotkeyId: "SWITCH_DASHBOARD_VIEW_NEXT",
					label: "Switch recent view",
					description: "Cycle through recently used dashboard views",
				},
				{
					hotkeyId: "SWITCH_DASHBOARD_VIEW_PREVIOUS",
					label: "Switch recent view back",
					description: "Cycle backward through recently used dashboard views",
				},
				{
					hotkeyId: "OPEN_CHROME",
					label: "Open Chrome",
					description: "Jump to the embedded Chrome tab set",
				},
				{
					hotkeyId: "OPEN_CAPY",
					label: "Open Capy",
					description: "Jump to Capy; chain a number for visible threads",
				},
				{
					hotkeyId: "OPEN_DEVIN",
					label: "Open Devin",
					description: "Jump to Devin; chain a number for visible sessions",
				},
				{
					keys: ["⌥", "C", "1"],
					label: "Open Capy thread 1",
					description: "Use the visible sidebar number after the Capy chord",
				},
				{
					keys: ["⌥", "D", "1"],
					label: "Open Devin session 1",
					description: "Use the visible sidebar number after the Devin chord",
				},
			],
		},
		{
			id: "sidebar",
			title: "Sidebar",
			entries: [
				{
					keys: ["↑", "↓"],
					label: "Move selection",
					description: "Move through visible sidebar items",
				},
				{
					keys: ["J", "K"],
					label: "Move in Vim mode",
					description: "Move through visible sidebar items without arrow keys",
				},
				{
					keys: ["Enter"],
					label: "Open selected item",
					description: "Activate the focused sidebar item",
				},
				{
					keys: ["Space"],
					label: "Toggle selected item",
					description: "Open, collapse, or expand the focused item",
				},
				{
					keys: ["/"],
					label: "Search sidebar",
					description: "Filter long workspace, Capy, and Devin lists",
				},
				{
					keys: ["G", "G"],
					label: "Jump to top",
					description: "Press g twice quickly in Vim mode",
				},
				{
					keys: ["G"],
					label: "Jump to bottom",
					description: "Use Shift+G in Vim mode",
				},
				{
					keys: ["H", "L"],
					label: "Collapse or expand",
					description: "Collapse or expand focused folders and sidebar groups",
				},
			],
		},
		{
			id: "native-agents",
			title: "Native Agents",
			entries: [
				{
					hotkeyId: "TOGGLE_NATIVE_BROWSER_VIEW",
					label: "Native/browser",
					description:
						"Switch a Capy or Devin session between native and browser",
				},
				{
					hotkeyId: "TOGGLE_NATIVE_SPLIT_VIEW",
					label: "Split native/browser",
					description: "Show chat and browser side by side",
				},
				{
					keys: ["R"],
					label: "Reply",
					description: "Focus the active native-agent reply box",
				},
				{
					keys: ["O"],
					label: "Open browser version",
					description: "Open the current agent session in the embedded browser",
				},
				{
					keys: ["P"],
					label: "Pin or unpin",
					description: "Keep the current session in the sidebar or let it hide",
				},
				{
					keys: ["X"],
					label: "Archive or hide",
					description: "Move the current session away from the active sidebar",
				},
				{
					keys: ["M"],
					label: "Move to folder",
					description: "Put the current session into a sidebar folder",
				},
			],
		},
	];

export function openDashboardKeyboardHelp(): boolean {
	if (typeof window === "undefined") return false;
	return window.dispatchEvent(
		new CustomEvent(DASHBOARD_KEYBOARD_HELP_OPEN_EVENT, {
			cancelable: true,
		}),
	);
}
