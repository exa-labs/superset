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
					hotkeyId: "SHOW_DASHBOARD_KEYBOARD_HELP",
					label: "Show this overlay",
					description:
						"Review the dashboard keyboard map from browsers and terminals",
				},
				{
					keys: ["f"],
					label: "Show action hints",
					description: "Label visible dashboard buttons and links by key",
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
					keys: ["/", "type"],
					label: "Search sidebar",
					description:
						"Filter long workspace, Capy, and Devin lists; typing starts search outside Vim mode",
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
				{
					keys: ["N"],
					label: "Create from section",
					description: "Create a session, folder, workspace, or tab from focus",
				},
				{
					keys: ["P"],
					label: "Pin or unpin selected",
					description: "Toggle selected Capy or Devin sidebar persistence",
				},
				{
					keys: ["E"],
					label: "Rename selected",
					description: "Rename the focused native session or folder",
				},
				{
					keys: ["A", "X"],
					label: "Archive selected",
					description: "Move the focused native session back to overview",
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
					keys: ["b"],
					label: "Native/browser in Vim mode",
					description:
						"Switch the selected native session between chat and browser",
				},
				{
					hotkeyId: "TOGGLE_NATIVE_SPLIT_VIEW",
					label: "Split native/browser",
					description: "Show chat and browser side by side",
				},
				{
					keys: ["s"],
					label: "Split in Vim mode",
					description: "Toggle side-by-side chat and browser for a session",
				},
				{
					keys: ["[", "]"],
					label: "Resize native split",
					description: "Narrow or widen the native chat side of split view",
				},
				{
					keys: ["="],
					label: "Equalize native split",
					description: "Reset native chat and browser panes to equal widths",
				},
				{
					keys: ["r"],
					label: "Reply",
					description: "Focus the active native-agent reply box",
				},
				{
					keys: ["i"],
					label: "Insert reply",
					description: "Focus the composer using a Vim-style insert key",
				},
				{
					keys: ["u"],
					label: "Open unread reply",
					description: "Jump to the next unread Capy or Devin response",
				},
				{
					keys: ["o"],
					label: "Open browser version",
					description: "Open the current agent session in the embedded browser",
				},
				{
					keys: ["O"],
					label: "Open externally",
					description: "Open the current agent session in the system browser",
				},
				{
					keys: ["p"],
					label: "Pin or unpin",
					description: "Keep the current session in the sidebar or let it hide",
				},
				{
					keys: ["x"],
					label: "Archive or hide",
					description: "Move the current session away from the active sidebar",
				},
				{
					keys: ["m"],
					label: "Move to folder",
					description: "Put the current session into a sidebar folder",
				},
				{
					keys: ["F"],
					label: "Remove from folder",
					description: "Return the current session to the main provider list",
				},
				{
					keys: ["e"],
					label: "Rename session",
					description: "Set a local title for the current native-agent session",
				},
				{
					keys: ["R"],
					label: "Refresh native data",
					description: "Reload the active Capy or Devin session list",
				},
				{
					keys: ["c"],
					label: "Cycle folder color",
					description: "Recolor the focused native sidebar folder",
				},
				{
					keys: ["d"],
					label: "Delete folder",
					description:
						"Open confirmation for the focused native sidebar folder",
				},
			],
		},
		{
			id: "browser",
			title: "Browser",
			entries: [
				{
					keys: ["n"],
					label: "Duplicate Chrome tab",
					description: "Create a new embedded Chrome tab from the current URL",
				},
				{
					keys: ["r"],
					label: "Reload Chrome tab",
					description: "Reload the active embedded Chrome tab",
				},
				{
					keys: ["s"],
					label: "Split Chrome view",
					description: "Toggle side-by-side embedded Chrome tabs",
				},
				{
					keys: ["w"],
					label: "Swap Chrome split focus",
					description: "Move focus between embedded Chrome split panes",
				},
				{
					keys: ["[", "]"],
					label: "Resize Chrome split",
					description: "Narrow or widen the active embedded Chrome pane",
				},
				{
					keys: ["="],
					label: "Equalize Chrome split",
					description: "Reset embedded Chrome split panes to equal widths",
				},
				{
					keys: ["x"],
					label: "Close Chrome tab",
					description: "Close the active embedded Chrome tab",
				},
				{
					keys: ["h", "l"],
					label: "Previous or next Chrome tab",
					description: "Move left or right through embedded Chrome tabs",
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
