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
					keys: ["Esc"],
					label: "Return focus to sidebar",
					description:
						"Recover navigation focus from browsers, terminals, native agents, and workspace views",
				},
				{
					keys: ["?"],
					label: "Show this overlay in Vim mode",
					description:
						"Open this guide from the dashboard shell or embedded browser pages",
				},
				{
					keys: ["Backspace"],
					label: "Back inside control plane",
					description:
						"Return from a nested command-palette frame when the search box is empty",
				},
				{
					hotkeyId: "SHOW_DASHBOARD_ACTION_HINTS",
					label: "Show action hints",
					description:
						"Label visible dashboard or embedded-page actions by key",
				},
				{
					keys: ["f"],
					label: "Show action hints in Vim mode",
					description:
						"Label visible actions without leaving Vim navigation mode",
				},
				{
					keys: ["H"],
					label: "Toggle sidebar in Vim mode",
					description:
						"Show or hide the navigation shell from embedded browsers and dashboard views",
				},
				{
					hotkeyId: "OPEN_UNREAD_NATIVE_REPLY",
					label: "Open unread native reply",
					description:
						"Jump to the newest unread Capy or Devin response from any dashboard view",
				},
				{
					hotkeyId: "MARK_LATEST_NATIVE_REPLY_READ",
					label: "Mark latest native reply read",
					description:
						"Acknowledge the newest unread Capy or Devin response from any dashboard view",
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
					hotkeyId: "OPEN_WORKSPACES",
					label: "Open workspaces",
					description: "Jump to the workspace overview",
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
					keys: ["g", "w"],
					label: "Open workspaces in Vim mode",
					description:
						"Jump to the workspace overview without leaving Vim mode",
				},
				{
					keys: ["g", "c"],
					label: "Open Capy in Vim mode",
					description: "Jump to the Capy native inbox",
				},
				{
					keys: ["g", "d"],
					label: "Open Devin in Vim mode",
					description: "Jump to the Devin native inbox",
				},
				{
					keys: ["g", "g"],
					label: "Open Chrome in Vim mode",
					description: "Jump to the embedded Chrome tab set",
				},
				{
					keys: ["⌥", "C", "1"],
					label: "Open Capy thread 1",
					description: "Use the visible sidebar number after the Capy chord",
				},
				{
					keys: ["⌥", "C", "n"],
					label: "Create Capy thread",
					description:
						"Create a new Capy thread after the Capy chord, even from browsers",
				},
				{
					keys: ["⌥", "D", "1"],
					label: "Open Devin session 1",
					description: "Use the visible sidebar number after the Devin chord",
				},
				{
					keys: ["⌥", "D", "n"],
					label: "Create Devin session",
					description:
						"Create a new Devin session after the Devin chord, even from browsers",
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
					keys: ["."],
					label: "Show selected item actions",
					description:
						"Open a keyboard-navigable action menu for the focused session or folder",
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
					keys: ["g", "g", "Home"],
					label: "Jump to top",
					description:
						"Press g twice in Vim mode, or use Home from sidebar focus",
				},
				{
					keys: ["G", "End"],
					label: "Jump to bottom",
					description: "Use Shift+G in Vim mode, or End from sidebar focus",
				},
				{
					keys: ["H", "L"],
					label: "Collapse or expand",
					description: "Collapse or expand focused folders and sidebar groups",
				},
				{
					keys: ["n"],
					label: "Create from section",
					description: "Create a session, workspace, or tab from focus",
				},
				{
					keys: ["N"],
					label: "Create folder or group",
					description:
						"Create a folder/group for the focused provider, Chrome section, or workspace",
				},
				{
					keys: ["p"],
					label: "Pin or unpin selected",
					description:
						"Toggle selected Capy, Devin, or Chrome sidebar persistence",
				},
				{
					keys: ["e"],
					label: "Rename selected",
					description:
						"Rename the focused workspace, native session, folder, or Chrome tab",
				},
				{
					keys: ["m"],
					label: "Move selected to folder",
					description:
						"Move the focused native session, Chrome tab, or workspace into a folder/group",
				},
				{
					keys: ["F"],
					label: "Remove selected from folder",
					description:
						"Move the focused native session, Chrome tab, or workspace out of its folder/group",
				},
				{
					keys: ["a", "x"],
					label: "Archive selected",
					description:
						"Move the focused native session, Chrome tab, or workspace away from the active sidebar",
				},
				{
					keys: ["c"],
					label: "Color selected folder",
					description: "Change the focused native or Chrome folder color",
				},
				{
					keys: ["d"],
					label: "Delete selected folder",
					description:
						"Open confirmation for the focused native or Chrome folder",
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
					keys: ["q"],
					label: "Close native split",
					description: "Return a split native session to chat-only view",
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
					keys: ["g", "g", "G", "Home", "End"],
					label: "Jump native overview",
					description:
						"Jump to the first or last visible Capy/Devin overview card",
				},
				{
					keys: ["u"],
					label: "Open unread reply",
					description: "Jump to the next unread Capy or Devin response",
				},
				{
					keys: ["U"],
					label: "Mark latest reply read",
					description:
						"Acknowledge the latest Capy or Devin response without opening it",
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
					description:
						"Put the current session into the focused or remembered sidebar folder",
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
					keys: ["N"],
					label: "Create folder",
					description:
						"Create a sidebar folder for the focused native provider",
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
			id: "workspace-panes",
			title: "Workspace Panes",
			entries: [
				{
					keys: ["h", "j", "k", "l"],
					label: "Focus workspace pane in Vim mode",
					description: "Move focus through workspace panes by direction",
				},
				{
					keys: ["H", "J", "K", "L"],
					label: "Swap workspace pane in Vim mode",
					description:
						"Swap the focused workspace pane with a directional neighbor",
				},
				{
					keys: ["s", "[", "]", "=", "x"],
					label: "Control workspace panes in Vim mode",
					description:
						"Split, resize, equalize, or close the focused workspace pane",
				},
				{
					hotkeyId: "SPLIT_RIGHT",
					label: "Split pane right",
					description: "Open a new terminal pane to the right",
				},
				{
					hotkeyId: "SPLIT_DOWN",
					label: "Split pane down",
					description: "Open a new terminal pane below",
				},
				{
					hotkeyId: "NARROW_PANE_SPLIT",
					label: "Narrow focused pane",
					description: "Reduce the focused workspace pane size",
				},
				{
					hotkeyId: "WIDEN_PANE_SPLIT",
					label: "Widen focused pane",
					description: "Increase the focused workspace pane size",
				},
				{
					hotkeyId: "EQUALIZE_PANE_SPLITS",
					label: "Equalize workspace panes",
					description: "Reset all workspace panes to equal sizes",
				},
				{
					hotkeyId: "FOCUS_PANE_LEFT",
					label: "Focus pane left",
					description: "Move workspace focus to the pane on the left",
				},
				{
					hotkeyId: "FOCUS_PANE_RIGHT",
					label: "Focus pane right",
					description: "Move workspace focus to the pane on the right",
				},
				{
					hotkeyId: "FOCUS_PANE_UP",
					label: "Focus pane up",
					description: "Move workspace focus to the pane above",
				},
				{
					hotkeyId: "FOCUS_PANE_DOWN",
					label: "Focus pane down",
					description: "Move workspace focus to the pane below",
				},
				{
					keys: ["⌥", "K"],
					label: "Swap workspace pane",
					description:
						"Use the control plane to swap the focused pane with a neighbor",
				},
				{
					hotkeyId: "CLOSE_PANE",
					label: "Close focused pane",
					description: "Close the focused workspace pane",
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
					keys: ["q"],
					label: "Close Chrome split",
					description: "Return embedded Chrome to a single active tab pane",
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
					keys: ["p"],
					label: "Pin Chrome tab",
					description:
						"Pin or unpin the current embedded Chrome view in the sidebar",
				},
				{
					keys: ["h", "l"],
					label: "Previous or next Chrome tab",
					description: "Move left or right through embedded Chrome tabs",
				},
			],
		},
		{
			id: "root-terminals",
			title: "Root Terminals",
			entries: [
				{
					keys: ["⌥", "K"],
					label: "Open stag kr9",
					description: "Run kr9 in a root terminal from the control plane",
				},
				{
					keys: ["⌥", "K"],
					label: "Open prod kr9",
					description: "Run kr9 in a root terminal from the control plane",
				},
				{
					keys: ["⌥", "K"],
					label: "Open heph kr9",
					description: "Run kr9 in a root terminal from the control plane",
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
