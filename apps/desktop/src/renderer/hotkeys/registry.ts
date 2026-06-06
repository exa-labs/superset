import type {
	HotkeyCategory,
	HotkeyDefinition,
	Platform,
	PlatformKey,
	ShortcutBinding,
} from "./types";

interface HotkeyRegistryDefinition {
	key: PlatformKey;
	label: string;
	category: HotkeyCategory;
	description?: string;
}

function detectPlatform(): Platform {
	if (typeof navigator === "undefined") return "mac";
	const p = navigator.platform.toLowerCase();
	if (p.includes("mac")) return "mac";
	if (p.includes("win")) return "windows";
	return "linux";
}

export const PLATFORM: Platform = detectPlatform();

/**
 * Mark a printable chord as logical so it follows the labeled key on
 * non-US layouts (e.g. on QWERTZ ⌘Z fires on the key printed "Z" — physical
 * KeyY — instead of physical KeyZ). Honored when `adaptiveLayoutEnabled`
 * is on; falls through to the original chord otherwise (matching physical
 * dispatch). Use bare strings only for chords whose terminal token is a
 * named key (arrows, Enter, Escape, F1–F12, …) — those are layout-stable
 * and `defaultModeForChord` classifies them as "named" automatically.
 */
const L = (chord: string): ShortcutBinding => ({
	version: 2,
	mode: "logical",
	chord,
});

// ---------------------------------------------------------------------------
// Hotkey definitions
// ---------------------------------------------------------------------------

export const HOTKEYS_REGISTRY = {
	// Navigation
	NAVIGATE_BACK: {
		key: {
			mac: L("meta+bracketleft"),
			windows: L("ctrl+shift+bracketleft"),
			linux: L("ctrl+shift+bracketleft"),
		},
		label: "Navigate Back",
		category: "Navigation",
		description: "Go back to the previous page in history",
	},
	NAVIGATE_FORWARD: {
		key: {
			mac: L("meta+bracketright"),
			windows: L("ctrl+shift+bracketright"),
			linux: L("ctrl+shift+bracketright"),
		},
		label: "Navigate Forward",
		category: "Navigation",
		description: "Go forward to the next page in history",
	},
	QUICK_OPEN: {
		key: {
			mac: L("meta+p"),
			windows: L("ctrl+shift+p"),
			linux: L("ctrl+shift+p"),
		},
		label: "Quick Open File",
		category: "Navigation",
		description: "Search and open files in the current workspace",
	},
	SWITCH_DASHBOARD_VIEW_NEXT: {
		key: {
			mac: "alt+tab",
			windows: "ctrl+alt+tab",
			linux: "ctrl+alt+tab",
		},
		label: "Switch MRU View",
		category: "Navigation",
		description: "Switch to the next recently used dashboard view",
	},
	SWITCH_DASHBOARD_VIEW_PREVIOUS: {
		key: {
			mac: "alt+shift+tab",
			windows: "ctrl+alt+shift+tab",
			linux: "ctrl+alt+shift+tab",
		},
		label: "Switch MRU View Back",
		category: "Navigation",
		description: "Switch backward through recently used dashboard views",
	},

	// Web pages
	OPEN_WEB_PAGE_1: {
		key: {
			mac: L("alt+1"),
			windows: L("ctrl+alt+1"),
			linux: L("ctrl+alt+1"),
		},
		label: "Open Overseer",
		category: "Web Pages",
		description: "Open the pinned Overseer page",
	},
	OPEN_WEB_PAGE_2: {
		key: {
			mac: L("alt+2"),
			windows: L("ctrl+alt+2"),
			linux: L("ctrl+alt+2"),
		},
		label: "Open Sulis",
		category: "Web Pages",
		description: "Open the pinned Sulis page",
	},
	OPEN_WEB_PAGE_3: {
		key: {
			mac: L("alt+3"),
			windows: L("ctrl+alt+3"),
			linux: L("ctrl+alt+3"),
		},
		label: "Open Inference Overview",
		category: "Web Pages",
		description: "Open the pinned inference Grafana dashboard",
	},
	OPEN_WEB_PAGE_4: {
		key: {
			mac: L("alt+4"),
			windows: L("ctrl+alt+4"),
			linux: L("ctrl+alt+4"),
		},
		label: "Open Canonical",
		category: "Web Pages",
		description: "Open the pinned canonical search latency dashboard",
	},
	OPEN_WEB_PAGE_5: {
		key: {
			mac: L("alt+5"),
			windows: L("ctrl+alt+5"),
			linux: L("ctrl+alt+5"),
		},
		label: "Open PR",
		category: "Web Pages",
		description: "Open the pinned GitHub pull requests page",
	},
	OPEN_WEB_PAGE_6: {
		key: {
			mac: L("alt+6"),
			windows: L("ctrl+alt+6"),
			linux: L("ctrl+alt+6"),
		},
		label: "Open Linear",
		category: "Web Pages",
		description: "Open the pinned Linear initiative page",
	},
	OPEN_CAPY: {
		key: {
			mac: L("alt+c"),
			windows: L("ctrl+alt+c"),
			linux: L("ctrl+alt+c"),
		},
		label: "Open Capy",
		category: "Web Pages",
		description: "Open Capy threads; press a number next to choose a thread",
	},
	CREATE_CAPY: {
		key: {
			mac: L("alt+shift+c"),
			windows: L("ctrl+alt+shift+c"),
			linux: L("ctrl+alt+shift+c"),
		},
		label: "Create Capy Thread",
		category: "Web Pages",
		description: "Create a new Capy thread from anywhere in the dashboard",
	},
	OPEN_DEVIN: {
		key: {
			mac: L("alt+d"),
			windows: L("ctrl+alt+d"),
			linux: L("ctrl+alt+d"),
		},
		label: "Open Devin",
		category: "Web Pages",
		description: "Open Devin sessions; press a number next to choose a session",
	},
	CREATE_DEVIN: {
		key: {
			mac: L("alt+shift+d"),
			windows: L("ctrl+alt+shift+d"),
			linux: L("ctrl+alt+shift+d"),
		},
		label: "Create Devin Session",
		category: "Web Pages",
		description: "Create a new Devin session from anywhere in the dashboard",
	},
	OPEN_CHROME: {
		key: {
			mac: L("alt+g"),
			windows: L("ctrl+alt+g"),
			linux: L("ctrl+alt+g"),
		},
		label: "Open Chrome",
		category: "Web Pages",
		description: "Open the embedded Chrome tab set",
	},
	OPEN_WORKSPACES: {
		key: {
			mac: L("alt+w"),
			windows: L("ctrl+alt+w"),
			linux: L("ctrl+alt+w"),
		},
		label: "Open Workspaces",
		category: "Web Pages",
		description: "Open the workspace overview",
	},
	OPEN_ROOT_TERMINAL_STAG: {
		key: {
			mac: L("alt+shift+s"),
			windows: L("ctrl+alt+shift+s"),
			linux: L("ctrl+alt+shift+s"),
		},
		label: "Open stag kr9",
		category: "Terminal",
		description: "Open a root terminal and run kr9",
	},
	OPEN_ROOT_TERMINAL_PROD: {
		key: {
			mac: L("alt+shift+p"),
			windows: L("ctrl+alt+shift+p"),
			linux: L("ctrl+alt+shift+p"),
		},
		label: "Open prod kr9",
		category: "Terminal",
		description: "Open a root terminal and run kr9",
	},
	OPEN_ROOT_TERMINAL_HEPH: {
		key: {
			mac: L("alt+shift+h"),
			windows: L("ctrl+alt+shift+h"),
			linux: L("ctrl+alt+shift+h"),
		},
		label: "Open heph kr9",
		category: "Terminal",
		description: "Open a root terminal and run kr9",
	},
	TOGGLE_NATIVE_BROWSER_VIEW: {
		key: {
			mac: L("alt+b"),
			windows: L("ctrl+alt+b"),
			linux: L("ctrl+alt+b"),
		},
		label: "Toggle Native Browser View",
		category: "Web Pages",
		description:
			"Switch the current Capy/Devin session between native chat and browser",
	},
	TOGGLE_NATIVE_SPLIT_VIEW: {
		key: {
			mac: L("alt+s"),
			windows: L("ctrl+alt+s"),
			linux: L("ctrl+alt+s"),
		},
		label: "Toggle Native Split View",
		category: "Web Pages",
		description: "Show or hide the side-by-side native chat/browser view",
	},
	SIDEBAR_ACTION_CREATE: {
		key: { mac: null, windows: null, linux: null },
		label: "Sidebar Create",
		category: "Navigation",
		description:
			"Create from the focused sidebar group; defaults to local n in sidebar/Vim mode",
	},
	SIDEBAR_ACTION_CREATE_FOLDER: {
		key: { mac: null, windows: null, linux: null },
		label: "Sidebar Create Folder",
		category: "Navigation",
		description:
			"Create a folder in the focused sidebar group; defaults to local N in sidebar/Vim mode",
	},
	SIDEBAR_ACTION_MENU: {
		key: {
			mac: L("alt+period"),
			windows: L("ctrl+alt+period"),
			linux: L("ctrl+alt+period"),
		},
		label: "Sidebar Actions Menu",
		category: "Navigation",
		description: "Open the focused sidebar row's action menu from any view",
	},
	SIDEBAR_ACTION_PIN: {
		key: {
			mac: L("alt+p"),
			windows: L("ctrl+alt+p"),
			linux: L("ctrl+alt+p"),
		},
		label: "Sidebar Pin",
		category: "Navigation",
		description: "Pin or unpin the focused sidebar item",
	},
	SIDEBAR_ACTION_ARCHIVE: {
		key: {
			mac: L("alt+a"),
			windows: L("ctrl+alt+a"),
			linux: L("ctrl+alt+a"),
		},
		label: "Sidebar Hide",
		category: "Navigation",
		description: "Move the focused sidebar item away from the active list",
	},
	SIDEBAR_ACTION_HARD_ARCHIVE: {
		key: {
			mac: L("alt+shift+a"),
			windows: L("ctrl+alt+shift+a"),
			linux: L("ctrl+alt+shift+a"),
		},
		label: "Sidebar Archive",
		category: "Navigation",
		description: "Archive the focused native agent sidebar item",
	},
	SIDEBAR_ACTION_MOVE: {
		key: {
			mac: L("alt+m"),
			windows: L("ctrl+alt+m"),
			linux: L("ctrl+alt+m"),
		},
		label: "Sidebar Move to Folder",
		category: "Navigation",
		description: "Move the focused sidebar item into a folder",
	},
	SIDEBAR_ACTION_REMOVE_FROM_FOLDER: {
		key: {
			mac: L("alt+shift+m"),
			windows: L("ctrl+alt+shift+m"),
			linux: L("ctrl+alt+shift+m"),
		},
		label: "Sidebar Remove from Folder",
		category: "Navigation",
		description: "Move the focused sidebar item out of its folder",
	},
	SIDEBAR_ACTION_COLOR: {
		key: { mac: null, windows: null, linux: null },
		label: "Sidebar Folder Color",
		category: "Navigation",
		description:
			"Change the focused folder color; defaults to local c in sidebar/Vim mode",
	},
	SIDEBAR_ACTION_RENAME: {
		key: {
			mac: L("alt+e"),
			windows: L("ctrl+alt+e"),
			linux: L("ctrl+alt+e"),
		},
		label: "Sidebar Rename",
		category: "Navigation",
		description: "Rename the focused sidebar item",
	},
	SIDEBAR_ACTION_REPLY: {
		key: {
			mac: L("alt+shift+r"),
			windows: L("ctrl+alt+shift+r"),
			linux: L("ctrl+alt+shift+r"),
		},
		label: "Sidebar Reply",
		category: "Navigation",
		description: "Reply to the focused native agent sidebar session",
	},
	SIDEBAR_ACTION_OPEN_BROWSER: {
		key: {
			mac: L("alt+o"),
			windows: L("ctrl+alt+o"),
			linux: L("ctrl+alt+o"),
		},
		label: "Sidebar Open Browser",
		category: "Navigation",
		description: "Open the focused sidebar item in its browser view",
	},
	SIDEBAR_ACTION_TOGGLE_BROWSER: {
		key: { mac: null, windows: null, linux: null },
		label: "Sidebar Toggle Native Browser",
		category: "Navigation",
		description:
			"Switch the focused native agent sidebar session between native and browser; defaults to local b in sidebar/Vim mode",
	},
	SIDEBAR_ACTION_MARK_READ: {
		key: {
			mac: L("alt+u"),
			windows: L("ctrl+alt+u"),
			linux: L("ctrl+alt+u"),
		},
		label: "Sidebar Mark Read",
		category: "Navigation",
		description: "Mark the focused native agent reply as read",
	},
	SIDEBAR_ACTION_DELETE: {
		key: { mac: null, windows: null, linux: null },
		label: "Sidebar Delete",
		category: "Navigation",
		description:
			"Delete the focused folder or removable sidebar item; defaults to local d in sidebar/Vim mode",
	},
	BROWSER_NEW_TAB: {
		key: {
			mac: L("alt+t"),
			windows: L("ctrl+alt+t"),
			linux: L("ctrl+alt+t"),
		},
		label: "Chrome New Tab",
		category: "Web Pages",
		description: "Open a new embedded Chrome tab from the current page",
	},
	BROWSER_RELOAD: {
		key: {
			mac: L("alt+r"),
			windows: L("ctrl+alt+r"),
			linux: L("ctrl+alt+r"),
		},
		label: "Chrome Reload",
		category: "Web Pages",
		description: "Reload the active embedded Chrome tab",
	},
	BROWSER_GO_BACK: {
		key: {
			mac: "alt+left",
			windows: "ctrl+alt+left",
			linux: "ctrl+alt+left",
		},
		label: "Chrome Back",
		category: "Web Pages",
		description: "Go back in the active embedded Chrome tab",
	},
	BROWSER_GO_FORWARD: {
		key: {
			mac: "alt+right",
			windows: "ctrl+alt+right",
			linux: "ctrl+alt+right",
		},
		label: "Chrome Forward",
		category: "Web Pages",
		description: "Go forward in the active embedded Chrome tab",
	},
	BROWSER_PREVIOUS_TAB: {
		key: {
			mac: "alt+shift+left",
			windows: "ctrl+alt+shift+left",
			linux: "ctrl+alt+shift+left",
		},
		label: "Chrome Previous Tab",
		category: "Web Pages",
		description: "Move left through embedded Chrome tabs",
	},
	BROWSER_NEXT_TAB: {
		key: {
			mac: "alt+shift+right",
			windows: "ctrl+alt+shift+right",
			linux: "ctrl+alt+shift+right",
		},
		label: "Chrome Next Tab",
		category: "Web Pages",
		description: "Move right through embedded Chrome tabs",
	},
	BROWSER_CLOSE_TAB: {
		key: {
			mac: L("alt+shift+w"),
			windows: L("ctrl+alt+shift+w"),
			linux: L("ctrl+alt+shift+w"),
		},
		label: "Chrome Close Tab",
		category: "Web Pages",
		description: "Close the active embedded Chrome tab",
	},
	BROWSER_TOGGLE_PIN: {
		key: {
			mac: L("alt+shift+i"),
			windows: L("ctrl+alt+shift+i"),
			linux: L("ctrl+alt+shift+i"),
		},
		label: "Chrome Pin Tab",
		category: "Web Pages",
		description: "Pin or unpin the active embedded Chrome tab in the sidebar",
	},
	BROWSER_OPEN_EXTERNAL: {
		key: {
			mac: L("alt+shift+o"),
			windows: L("ctrl+alt+shift+o"),
			linux: L("ctrl+alt+shift+o"),
		},
		label: "Chrome Open External",
		category: "Web Pages",
		description: "Open the active embedded Chrome page in the system browser",
	},
	BROWSER_TOGGLE_SPLIT: {
		key: {
			mac: L("alt+shift+b"),
			windows: L("ctrl+alt+shift+b"),
			linux: L("ctrl+alt+shift+b"),
		},
		label: "Chrome Toggle Split",
		category: "Web Pages",
		description: "Open or close side-by-side embedded Chrome tabs",
	},
	BROWSER_CLOSE_SPLIT: {
		key: {
			mac: L("alt+shift+x"),
			windows: L("ctrl+alt+shift+x"),
			linux: L("ctrl+alt+shift+x"),
		},
		label: "Chrome Close Split",
		category: "Web Pages",
		description: "Return embedded Chrome to one visible pane",
	},
	BROWSER_SWAP_SPLIT: {
		key: {
			mac: L("alt+shift+f"),
			windows: L("ctrl+alt+shift+f"),
			linux: L("ctrl+alt+shift+f"),
		},
		label: "Chrome Swap Split",
		category: "Web Pages",
		description: "Move focus between embedded Chrome split panes",
	},
	BROWSER_NARROW_SPLIT: {
		key: {
			mac: L("alt+shift+comma"),
			windows: L("ctrl+alt+shift+comma"),
			linux: L("ctrl+alt+shift+comma"),
		},
		label: "Chrome Narrow Split",
		category: "Web Pages",
		description: "Narrow the active embedded Chrome split pane",
	},
	BROWSER_WIDEN_SPLIT: {
		key: {
			mac: L("alt+shift+period"),
			windows: L("ctrl+alt+shift+period"),
			linux: L("ctrl+alt+shift+period"),
		},
		label: "Chrome Widen Split",
		category: "Web Pages",
		description: "Widen the active embedded Chrome split pane",
	},
	BROWSER_EQUALIZE_SPLIT: {
		key: {
			mac: L("alt+shift+0"),
			windows: L("ctrl+alt+shift+0"),
			linux: L("ctrl+alt+shift+0"),
		},
		label: "Chrome Equalize Split",
		category: "Web Pages",
		description: "Reset embedded Chrome split panes to equal widths",
	},

	// Workspace switching
	JUMP_TO_WORKSPACE_1: {
		key: {
			mac: L("meta+1"),
			windows: L("ctrl+shift+1"),
			linux: L("ctrl+shift+1"),
		},
		label: "Switch to Workspace 1",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_2: {
		key: {
			mac: L("meta+2"),
			windows: L("ctrl+shift+2"),
			linux: L("ctrl+shift+2"),
		},
		label: "Switch to Workspace 2",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_3: {
		key: {
			mac: L("meta+3"),
			windows: L("ctrl+shift+3"),
			linux: L("ctrl+shift+3"),
		},
		label: "Switch to Workspace 3",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_4: {
		key: {
			mac: L("meta+4"),
			windows: L("ctrl+shift+4"),
			linux: L("ctrl+shift+4"),
		},
		label: "Switch to Workspace 4",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_5: {
		key: {
			mac: L("meta+5"),
			windows: L("ctrl+shift+5"),
			linux: L("ctrl+shift+5"),
		},
		label: "Switch to Workspace 5",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_6: {
		key: {
			mac: L("meta+6"),
			windows: L("ctrl+shift+6"),
			linux: L("ctrl+shift+6"),
		},
		label: "Switch to Workspace 6",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_7: {
		key: {
			mac: L("meta+7"),
			windows: L("ctrl+shift+7"),
			linux: L("ctrl+shift+7"),
		},
		label: "Switch to Workspace 7",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_8: {
		key: {
			mac: L("meta+8"),
			windows: L("ctrl+shift+8"),
			linux: L("ctrl+shift+8"),
		},
		label: "Switch to Workspace 8",
		category: "Workspace",
	},
	JUMP_TO_WORKSPACE_9: {
		key: {
			mac: L("meta+9"),
			windows: L("ctrl+shift+9"),
			linux: L("ctrl+shift+9"),
		},
		label: "Switch to Workspace 9",
		category: "Workspace",
	},
	PREV_WORKSPACE: {
		key: {
			mac: "meta+alt+up",
			windows: "ctrl+shift+alt+up",
			linux: "ctrl+shift+alt+up",
		},
		label: "Previous Workspace",
		category: "Workspace",
		description: "Navigate to the previous workspace in the sidebar",
	},
	NEXT_WORKSPACE: {
		key: {
			mac: "meta+alt+down",
			windows: "ctrl+shift+alt+down",
			linux: "ctrl+shift+alt+down",
		},
		label: "Next Workspace",
		category: "Workspace",
		description: "Navigate to the next workspace in the sidebar",
	},
	CLOSE_WORKSPACE: {
		key: {
			mac: "meta+shift+backspace",
			windows: "ctrl+shift+backspace",
			linux: "ctrl+shift+backspace",
		},
		label: "Close Workspace",
		category: "Workspace",
		description: "Close or delete the current workspace",
	},
	NEW_WORKSPACE: {
		key: {
			mac: L("meta+n"),
			windows: L("ctrl+shift+n"),
			linux: L("ctrl+shift+n"),
		},
		label: "New Workspace",
		category: "Workspace",
		description: "Open the new workspace modal",
	},
	QUICK_CREATE_WORKSPACE: {
		key: {
			mac: L("meta+shift+n"),
			windows: L("ctrl+shift+alt+n"),
			linux: L("ctrl+shift+alt+n"),
		},
		label: "Quick Create Workspace",
		category: "Workspace",
		description: "Quickly create a workspace in the current project",
	},
	RUN_WORKSPACE_COMMAND: {
		key: {
			mac: L("meta+g"),
			windows: L("ctrl+shift+g"),
			linux: L("ctrl+shift+g"),
		},
		label: "Run Workspace Command",
		category: "Workspace",
		description: "Start or stop the workspace run command",
	},
	FOCUS_TASK_SEARCH: {
		key: {
			mac: L("meta+f"),
			windows: L("ctrl+shift+f"),
			linux: L("ctrl+shift+f"),
		},
		label: "Focus Task Search",
		category: "Workspace",
		description: "Focus the search input in the tasks view",
	},
	OPEN_PROJECT: {
		key: {
			mac: L("meta+shift+o"),
			windows: L("ctrl+shift+alt+o"),
			linux: L("ctrl+shift+alt+o"),
		},
		label: "Open Project",
		category: "Workspace",
		description: "Open an existing project folder",
	},
	OPEN_PR: {
		key: {
			mac: L("meta+shift+p"),
			windows: L("ctrl+shift+alt+p"),
			linux: L("ctrl+shift+alt+p"),
		},
		label: "Open Pull Request",
		category: "Workspace",
		description: "Open existing PR or create a new one on GitHub",
	},

	// Layout
	TOGGLE_SIDEBAR: {
		key: {
			mac: L("meta+l"),
			windows: L("ctrl+shift+l"),
			linux: L("ctrl+shift+l"),
		},
		label: "Toggle Changes Tab",
		category: "Layout",
	},
	OPEN_DIFF_VIEWER: {
		key: {
			mac: L("meta+shift+l"),
			windows: L("ctrl+shift+alt+l"),
			linux: L("ctrl+shift+alt+l"),
		},
		label: "Open Diff Viewer",
		category: "Layout",
		description:
			"Open the diff viewer in a new tab, or focus the existing diff viewer",
	},
	TOGGLE_WORKSPACE_SIDEBAR: {
		key: {
			mac: L("meta+b"),
			windows: L("ctrl+shift+b"),
			linux: L("ctrl+shift+b"),
		},
		label: "Toggle Workspaces Sidebar",
		category: "Layout",
	},
	SPLIT_RIGHT: {
		key: {
			mac: L("meta+d"),
			windows: L("ctrl+shift+d"),
			linux: L("ctrl+shift+d"),
		},
		label: "Split Right",
		category: "Layout",
		description: "Split the current pane to the right",
	},
	SPLIT_DOWN: {
		key: {
			mac: L("meta+shift+d"),
			windows: L("ctrl+shift+alt+d"),
			linux: L("ctrl+shift+alt+d"),
		},
		label: "Split Down",
		category: "Layout",
		description: "Split the current pane downward",
	},
	SPLIT_AUTO: {
		key: {
			mac: L("meta+e"),
			windows: L("ctrl+shift+e"),
			linux: L("ctrl+shift+e"),
		},
		label: "Split Pane Auto",
		category: "Layout",
		description: "Split the current pane along its longer side",
	},
	SPLIT_WITH_CHAT: {
		key: {
			mac: L("meta+shift+e"),
			windows: L("ctrl+alt+e"),
			linux: L("ctrl+alt+e"),
		},
		label: "Split with New Chat",
		category: "Layout",
		description: "Split the current pane and open a new chat pane",
	},
	SPLIT_WITH_BROWSER: {
		key: {
			mac: L("meta+shift+s"),
			windows: L("ctrl+shift+alt+s"),
			linux: L("ctrl+shift+alt+s"),
		},
		label: "Split with New Browser",
		category: "Layout",
		description: "Split the current pane and open a new browser pane",
	},
	EQUALIZE_PANE_SPLITS: {
		key: {
			mac: L("meta+shift+0"),
			windows: L("ctrl+shift+0"),
			linux: L("ctrl+shift+0"),
		},
		label: "Equalize Pane Splits",
		category: "Layout",
		description: "Make all panes equal size",
	},
	NARROW_PANE_SPLIT: {
		key: {
			mac: L("meta+alt+bracketleft"),
			windows: L("ctrl+shift+alt+bracketleft"),
			linux: L("ctrl+shift+alt+bracketleft"),
		},
		label: "Narrow Focused Pane",
		category: "Layout",
		description: "Reduce the size of the focused pane",
	},
	WIDEN_PANE_SPLIT: {
		key: {
			mac: L("meta+alt+bracketright"),
			windows: L("ctrl+shift+alt+bracketright"),
			linux: L("ctrl+shift+alt+bracketright"),
		},
		label: "Widen Focused Pane",
		category: "Layout",
		description: "Increase the size of the focused pane",
	},
	CLOSE_PANE: {
		key: {
			mac: L("meta+w"),
			windows: L("ctrl+shift+w"),
			linux: L("ctrl+shift+w"),
		},
		label: "Close Pane",
		category: "Layout",
		description: "Close the current pane",
	},

	// Terminal
	FIND_IN_TERMINAL: {
		key: {
			mac: L("meta+f"),
			windows: L("ctrl+shift+f"),
			linux: L("ctrl+shift+f"),
		},
		label: "Find in Terminal",
		category: "Terminal",
		description: "Search text in the active terminal",
	},
	FIND_IN_FILE_VIEWER: {
		key: {
			mac: L("meta+f"),
			windows: L("ctrl+shift+f"),
			linux: L("ctrl+shift+f"),
		},
		label: "Find in File Viewer",
		category: "Terminal",
		description: "Search text in the rendered file viewer",
	},
	FIND_IN_CHAT: {
		key: {
			mac: L("meta+f"),
			windows: L("ctrl+shift+f"),
			linux: L("ctrl+shift+f"),
		},
		label: "Find in Chat",
		category: "Terminal",
		description: "Search text in the active chat",
	},
	NEW_GROUP: {
		key: {
			mac: L("meta+t"),
			windows: L("ctrl+shift+t"),
			linux: L("ctrl+shift+t"),
		},
		label: "New Terminal",
		category: "Terminal",
	},
	NEW_CHAT: {
		key: {
			mac: L("meta+shift+t"),
			windows: L("ctrl+shift+alt+t"),
			linux: L("ctrl+shift+alt+t"),
		},
		label: "New Chat",
		category: "Terminal",
	},
	REOPEN_TAB: {
		key: {
			mac: L("meta+shift+r"),
			windows: L("ctrl+shift+alt+r"),
			linux: L("ctrl+shift+alt+r"),
		},
		label: "Reopen Closed Tab",
		category: "Terminal",
	},
	NEW_BROWSER: {
		key: {
			mac: L("meta+shift+b"),
			windows: L("ctrl+shift+alt+b"),
			linux: L("ctrl+shift+alt+b"),
		},
		label: "New Browser",
		category: "Terminal",
	},
	CLOSE_TERMINAL: {
		key: {
			mac: L("meta+w"),
			windows: L("ctrl+shift+w"),
			linux: L("ctrl+shift+w"),
		},
		label: "Close Terminal",
		category: "Terminal",
	},
	CLOSE_TAB: {
		key: {
			mac: L("meta+shift+w"),
			windows: L("ctrl+shift+alt+w"),
			linux: L("ctrl+shift+alt+w"),
		},
		label: "Close Tab",
		category: "Terminal",
		description: "Close the current tab",
	},
	CLEAR_TERMINAL: {
		key: {
			mac: L("meta+k"),
			windows: L("ctrl+shift+k"),
			linux: L("ctrl+shift+k"),
		},
		label: "Clear Terminal",
		category: "Terminal",
	},
	SCROLL_TO_BOTTOM: {
		key: {
			mac: "meta+shift+down",
			windows: "ctrl+end",
			linux: "ctrl+end",
		},
		label: "Scroll to Bottom",
		category: "Terminal",
		description: "Scroll the active terminal to the bottom",
	},
	PREV_TAB_ALT: {
		key: {
			mac: "ctrl+shift+tab",
			windows: "ctrl+shift+tab",
			linux: "ctrl+shift+tab",
		},
		label: "Previous Tab (Alt)",
		category: "Terminal",
	},
	NEXT_TAB_ALT: {
		key: { mac: "ctrl+tab", windows: "ctrl+tab", linux: "ctrl+tab" },
		label: "Next Tab (Alt)",
		category: "Terminal",
	},
	PREV_TAB: {
		key: {
			mac: "meta+alt+left",
			windows: "ctrl+shift+alt+left",
			linux: "ctrl+shift+alt+left",
		},
		label: "Previous Tab",
		category: "Terminal",
		description: "Focus the previous tab in the active workspace",
	},
	NEXT_TAB: {
		key: {
			mac: "meta+alt+right",
			windows: "ctrl+shift+alt+right",
			linux: "ctrl+shift+alt+right",
		},
		label: "Next Tab",
		category: "Terminal",
		description: "Focus the next tab in the active workspace",
	},
	FOCUS_PANE_LEFT: {
		key: { mac: null, windows: null, linux: null },
		label: "Focus Pane Left",
		category: "Terminal",
		description: "Focus the pane to the left of the active pane",
	},
	FOCUS_PANE_RIGHT: {
		key: { mac: null, windows: null, linux: null },
		label: "Focus Pane Right",
		category: "Terminal",
		description: "Focus the pane to the right of the active pane",
	},
	FOCUS_PANE_UP: {
		key: { mac: null, windows: null, linux: null },
		label: "Focus Pane Up",
		category: "Terminal",
		description: "Focus the pane above the active pane",
	},
	FOCUS_PANE_DOWN: {
		key: { mac: null, windows: null, linux: null },
		label: "Focus Pane Down",
		category: "Terminal",
		description: "Focus the pane below the active pane",
	},
	JUMP_TO_TAB_1: {
		key: {
			mac: L("meta+alt+1"),
			windows: L("ctrl+shift+alt+1"),
			linux: L("ctrl+shift+alt+1"),
		},
		label: "Switch to Tab 1",
		category: "Terminal",
	},
	JUMP_TO_TAB_2: {
		key: {
			mac: L("meta+alt+2"),
			windows: L("ctrl+shift+alt+2"),
			linux: L("ctrl+shift+alt+2"),
		},
		label: "Switch to Tab 2",
		category: "Terminal",
	},
	JUMP_TO_TAB_3: {
		key: {
			mac: L("meta+alt+3"),
			windows: L("ctrl+shift+alt+3"),
			linux: L("ctrl+shift+alt+3"),
		},
		label: "Switch to Tab 3",
		category: "Terminal",
	},
	JUMP_TO_TAB_4: {
		key: {
			mac: L("meta+alt+4"),
			windows: L("ctrl+shift+alt+4"),
			linux: L("ctrl+shift+alt+4"),
		},
		label: "Switch to Tab 4",
		category: "Terminal",
	},
	JUMP_TO_TAB_5: {
		key: {
			mac: L("meta+alt+5"),
			windows: L("ctrl+shift+alt+5"),
			linux: L("ctrl+shift+alt+5"),
		},
		label: "Switch to Tab 5",
		category: "Terminal",
	},
	JUMP_TO_TAB_6: {
		key: {
			mac: L("meta+alt+6"),
			windows: L("ctrl+shift+alt+6"),
			linux: L("ctrl+shift+alt+6"),
		},
		label: "Switch to Tab 6",
		category: "Terminal",
	},
	JUMP_TO_TAB_7: {
		key: {
			mac: L("meta+alt+7"),
			windows: L("ctrl+shift+alt+7"),
			linux: L("ctrl+shift+alt+7"),
		},
		label: "Switch to Tab 7",
		category: "Terminal",
	},
	JUMP_TO_TAB_8: {
		key: {
			mac: L("meta+alt+8"),
			windows: L("ctrl+shift+alt+8"),
			linux: L("ctrl+shift+alt+8"),
		},
		label: "Switch to Tab 8",
		category: "Terminal",
	},
	JUMP_TO_TAB_9: {
		key: {
			mac: L("meta+alt+9"),
			windows: L("ctrl+shift+alt+9"),
			linux: L("ctrl+shift+alt+9"),
		},
		label: "Switch to Tab 9",
		category: "Terminal",
	},
	OPEN_PRESET_1: {
		key: { mac: L("ctrl+1"), windows: L("ctrl+1"), linux: L("ctrl+1") },
		label: "Open Preset 1",
		category: "Terminal",
	},
	OPEN_PRESET_2: {
		key: { mac: L("ctrl+2"), windows: L("ctrl+2"), linux: L("ctrl+2") },
		label: "Open Preset 2",
		category: "Terminal",
	},
	OPEN_PRESET_3: {
		key: { mac: L("ctrl+3"), windows: L("ctrl+3"), linux: L("ctrl+3") },
		label: "Open Preset 3",
		category: "Terminal",
	},
	OPEN_PRESET_4: {
		key: { mac: L("ctrl+4"), windows: L("ctrl+4"), linux: L("ctrl+4") },
		label: "Open Preset 4",
		category: "Terminal",
	},
	OPEN_PRESET_5: {
		key: { mac: L("ctrl+5"), windows: L("ctrl+5"), linux: L("ctrl+5") },
		label: "Open Preset 5",
		category: "Terminal",
	},
	OPEN_PRESET_6: {
		key: { mac: L("ctrl+6"), windows: L("ctrl+6"), linux: L("ctrl+6") },
		label: "Open Preset 6",
		category: "Terminal",
	},
	OPEN_PRESET_7: {
		key: { mac: L("ctrl+7"), windows: L("ctrl+7"), linux: L("ctrl+7") },
		label: "Open Preset 7",
		category: "Terminal",
	},
	OPEN_PRESET_8: {
		key: { mac: L("ctrl+8"), windows: L("ctrl+8"), linux: L("ctrl+8") },
		label: "Open Preset 8",
		category: "Terminal",
	},
	OPEN_PRESET_9: {
		key: { mac: L("ctrl+9"), windows: L("ctrl+9"), linux: L("ctrl+9") },
		label: "Open Preset 9",
		category: "Terminal",
	},

	// Chat
	FOCUS_CHAT_INPUT: {
		key: {
			mac: L("meta+j"),
			windows: L("ctrl+shift+j"),
			linux: L("ctrl+shift+j"),
		},
		label: "Focus Chat Input",
		category: "Terminal",
	},
	CHAT_ADD_ATTACHMENT: {
		key: {
			mac: L("meta+u"),
			windows: L("ctrl+shift+u"),
			linux: L("ctrl+shift+u"),
		},
		label: "Add Attachment",
		category: "Terminal",
	},

	// Window
	OPEN_IN_APP: {
		key: {
			mac: L("meta+o"),
			windows: L("ctrl+shift+o"),
			linux: L("ctrl+shift+o"),
		},
		label: "Open in App",
		category: "Window",
		description: "Open workspace in external app (Cursor, VS Code, etc.)",
	},
	COPY_PATH: {
		key: {
			mac: L("meta+shift+c"),
			windows: L("ctrl+shift+alt+c"),
			linux: L("ctrl+shift+alt+c"),
		},
		label: "Copy Path",
		category: "Window",
		description: "Copy the workspace path to the clipboard",
	},

	// Help
	OPEN_SETTINGS: {
		key: {
			mac: L("meta+comma"),
			windows: L("ctrl+comma"),
			linux: L("ctrl+comma"),
		},
		label: "Open Settings",
		category: "Help",
	},
	SHOW_HOTKEYS: {
		key: {
			mac: L("meta+shift+slash"),
			windows: L("ctrl+shift+slash"),
			linux: L("ctrl+shift+slash"),
		},
		label: "Show Keyboard Shortcuts",
		category: "Help",
	},
	SHOW_DASHBOARD_KEYBOARD_HELP: {
		key: {
			mac: L("alt+slash"),
			windows: L("ctrl+alt+slash"),
			linux: L("ctrl+alt+slash"),
		},
		label: "Show Dashboard Keyboard Help",
		category: "Help",
		description:
			"Open the dashboard keyboard overlay from browsers and terminals",
	},
	SHOW_DASHBOARD_ACTION_HINTS: {
		key: {
			mac: L("alt+f"),
			windows: L("ctrl+alt+f"),
			linux: L("ctrl+alt+f"),
		},
		label: "Show Dashboard Action Hints",
		category: "Help",
		description:
			"Label visible dashboard or embedded-page actions with Vim-style keys",
	},
	OPEN_UNREAD_NATIVE_REPLY: {
		key: {
			mac: L("alt+n"),
			windows: L("ctrl+alt+n"),
			linux: L("ctrl+alt+n"),
		},
		label: "Open Unread Native Reply",
		category: "Help",
		description: "Jump to the newest unread Capy or Devin response",
	},
	MARK_LATEST_NATIVE_REPLY_READ: {
		key: {
			mac: L("alt+shift+n"),
			windows: L("ctrl+alt+shift+n"),
			linux: L("ctrl+alt+shift+n"),
		},
		label: "Mark Latest Native Reply Read",
		category: "Help",
		description:
			"Acknowledge the newest unread Capy or Devin response without opening it",
	},
	OPEN_COMMAND_PALETTE: {
		key: {
			mac: L("meta+shift+k"),
			windows: L("ctrl+shift+k"),
			linux: L("ctrl+shift+k"),
		},
		label: "Open Command Palette",
		category: "Help",
		description: "Open the global command palette",
	},
	OPEN_CONTROL_PLANE: {
		key: {
			mac: L("alt+k"),
			windows: L("ctrl+alt+k"),
			linux: L("ctrl+alt+k"),
		},
		label: "Open Control Plane",
		category: "Help",
		description: "Open the dashboard control plane",
	},
	TOGGLE_VIM_MODE: {
		key: {
			mac: L("alt+v"),
			windows: L("ctrl+alt+v"),
			linux: L("ctrl+alt+v"),
		},
		label: "Toggle Vim Mode",
		category: "Help",
		description: "Toggle keyboard-native sidebar navigation",
	},
} as const satisfies Record<string, HotkeyRegistryDefinition>;

export type HotkeyId = keyof typeof HOTKEYS_REGISTRY;

/** Hotkey definitions resolved for the current platform (computed once at import time) */
export const HOTKEYS = Object.fromEntries(
	Object.entries(HOTKEYS_REGISTRY).map(([id, def]) => [
		id,
		{ ...def, key: def.key[PLATFORM] },
	]),
) as Record<HotkeyId, HotkeyDefinition>;
