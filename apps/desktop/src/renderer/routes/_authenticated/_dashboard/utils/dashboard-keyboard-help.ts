import { formatHotkeyDisplay, type HotkeyId, PLATFORM } from "renderer/hotkeys";
import { getBinding } from "renderer/hotkeys/hooks/useBinding/useBinding";
import { getEffectiveLayoutMap } from "renderer/hotkeys/stores/keyboardPreferencesStore";
import { bindingToDispatchChord } from "renderer/hotkeys/utils/binding";
import { dashboardBrowserShortcutDescriptors } from "./dashboard-browser-shortcuts";
import {
	DASHBOARD_QUICK_TERMINALS,
	dashboardQuickTerminalHotkeyId,
	dashboardQuickTerminalShortcutLabel,
} from "./dashboard-quick-terminals";
import {
	isDashboardVimEditableTarget,
	isDashboardVimModeEnabled,
} from "./dashboard-vim-mode";
import { DASHBOARD_WEB_PAGES } from "./dashboard-web-pages";

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

const BROWSER_SHORTCUT_DESCRIPTIONS = {
	"close-current-tab": "Close the active embedded Chrome tab",
	"close-split": "Return embedded Chrome to a single active tab pane",
	"equalize-split": "Reset embedded Chrome split panes to equal widths",
	"go-back": "Go backward in the active embedded Chrome tab",
	"go-forward": "Go forward in the active embedded Chrome tab",
	"narrow-active-split": "Narrow the active embedded Chrome pane",
	"new-current-url-tab":
		"Create a new embedded Chrome tab from the current URL",
	"next-tab": "Move right through embedded Chrome tabs",
	"open-external":
		"Open the current embedded Chrome page in the system browser",
	"previous-tab": "Move left through embedded Chrome tabs",
	reload: "Reload the active embedded Chrome tab",
	"swap-split": "Move focus between embedded Chrome split panes",
	"toggle-tab-pin":
		"Pin or unpin the current embedded Chrome view in the sidebar",
	"toggle-split": "Toggle side-by-side embedded Chrome tabs",
	"widen-active-split": "Widen the active embedded Chrome pane",
} satisfies Record<
	ReturnType<typeof dashboardBrowserShortcutDescriptors>[number]["action"],
	string
>;

export function dashboardKeyboardHelpBrowserChromeEntries(): DashboardKeyboardHelpEntry[] {
	const regularShortcuts = dashboardBrowserShortcutDescriptors({
		isSplitView: false,
	});
	const splitShortcuts = dashboardBrowserShortcutDescriptors({
		isSplitView: true,
	}).filter(
		(shortcut) =>
			shortcut.section === "split" && shortcut.action !== "toggle-split",
	);

	return [...regularShortcuts, ...splitShortcuts].map((shortcut) => ({
		keys: [shortcut.key],
		label:
			shortcut.action === "toggle-split"
				? "Open or close Chrome split"
				: `Chrome: ${shortcut.label}`,
		description: BROWSER_SHORTCUT_DESCRIPTIONS[shortcut.action],
	}));
}

export function dashboardKeyboardHelpBrowserHotkeyEntries(): DashboardKeyboardHelpEntry[] {
	return [
		{
			hotkeyId: "BROWSER_NEW_TAB",
			label: "Chrome: New tab",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["new-current-url-tab"],
		},
		{
			hotkeyId: "BROWSER_RELOAD",
			label: "Chrome: Reload",
			description: BROWSER_SHORTCUT_DESCRIPTIONS.reload,
		},
		{
			hotkeyId: "BROWSER_GO_BACK",
			label: "Chrome: Back",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["go-back"],
		},
		{
			hotkeyId: "BROWSER_GO_FORWARD",
			label: "Chrome: Forward",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["go-forward"],
		},
		{
			hotkeyId: "BROWSER_PREVIOUS_TAB",
			label: "Chrome: Previous tab",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["previous-tab"],
		},
		{
			hotkeyId: "BROWSER_NEXT_TAB",
			label: "Chrome: Next tab",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["next-tab"],
		},
		{
			hotkeyId: "BROWSER_CLOSE_TAB",
			label: "Chrome: Close tab",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["close-current-tab"],
		},
		{
			hotkeyId: "BROWSER_TOGGLE_PIN",
			label: "Chrome: Pin tab",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["toggle-tab-pin"],
		},
		{
			hotkeyId: "BROWSER_OPEN_EXTERNAL",
			label: "Chrome: Open externally",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["open-external"],
		},
		{
			hotkeyId: "BROWSER_TOGGLE_SPLIT",
			label: "Chrome: Toggle split",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["toggle-split"],
		},
		{
			hotkeyId: "BROWSER_CLOSE_SPLIT",
			label: "Chrome: Close split",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["close-split"],
		},
		{
			hotkeyId: "BROWSER_SWAP_SPLIT",
			label: "Chrome: Swap split",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["swap-split"],
		},
		{
			hotkeyId: "BROWSER_NARROW_SPLIT",
			label: "Chrome: Narrow split",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["narrow-active-split"],
		},
		{
			hotkeyId: "BROWSER_WIDEN_SPLIT",
			label: "Chrome: Widen split",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["widen-active-split"],
		},
		{
			hotkeyId: "BROWSER_EQUALIZE_SPLIT",
			label: "Chrome: Equalize split",
			description: BROWSER_SHORTCUT_DESCRIPTIONS["equalize-split"],
		},
	];
}

export function dashboardKeyboardHelpBrowserSidebarEntries(): DashboardKeyboardHelpEntry[] {
	return [
		{
			keys: ["j", "k", "G"],
			label: "Browser: Move sidebar focus",
			description:
				"Move through sidebar rows from embedded Chrome in Vim mode without reloading the page",
		},
		{
			keys: ["Enter"],
			label: "Browser: Open focused sidebar item",
			description:
				"Open the focused sidebar row while embedded Chrome keeps focus",
		},
		{
			keys: ["Space"],
			label: "Browser: Toggle focused sidebar item",
			description:
				"Collapse or expand the focused sidebar row while embedded Chrome keeps focus",
		},
		{
			keys: ["←", "→"],
			label: "Browser: Collapse or expand focused sidebar item",
			description:
				"Collapse or expand the focused sidebar row from embedded Chrome in Vim mode",
		},
		{
			keys: ["/"],
			label: "Browser: Search sidebar",
			description: "Jump to sidebar search from embedded Chrome in Vim mode",
		},
		{
			keys: [
				".",
				"n",
				"N",
				"p",
				"r",
				"o",
				"b",
				"m",
				"F",
				"U",
				"X",
				"a",
				"e",
				"c",
				"d",
			],
			label: "Browser: Run sidebar row actions",
			description:
				"Use menu, create, pin, reply, browser, move, read, hide, archive, rename, color, and delete actions from embedded Chrome; lowercase x stays Chrome close-tab, so use X for native archive",
		},
		{
			keys: ["g", "b", "c", "d", "w"],
			label: "Browser: Jump to dashboard sections",
			description:
				"Use Vim destination chords from embedded Chrome for Chrome, Capy, Devin, and workspaces",
		},
	];
}

export function dashboardKeyboardHelpBrowserEntries(): DashboardKeyboardHelpEntry[] {
	return [
		...dashboardKeyboardHelpBrowserHotkeyEntries(),
		...dashboardKeyboardHelpBrowserChromeEntries(),
		...dashboardKeyboardHelpBrowserSidebarEntries(),
	];
}

export function dashboardKeyboardHelpPinnedWebPageEntries(): DashboardKeyboardHelpEntry[] {
	return DASHBOARD_WEB_PAGES.map((page) => ({
		hotkeyId: page.hotkeyId,
		label: `Open ${page.shortLabel}`,
		description: `Jump to the pinned ${page.label} page`,
	}));
}

const DASHBOARD_KEYBOARD_HELP_KEY_ALIASES: Record<string, string[]> = {
	"⌥": ["option", "opt", "alt"],
	"⌘": ["command", "cmd"],
	"⇧": ["shift"],
	"⌃": ["control", "ctrl"],
	"⇥": ["tab"],
	"↵": ["enter", "return"],
	"⌫": ["backspace"],
	"⎋": ["escape", "esc"],
	"↑": ["up", "arrow up", "arrowup"],
	"↓": ["down", "arrow down", "arrowdown"],
	"←": ["left", "arrow left", "arrowleft"],
	"→": ["right", "arrow right", "arrowright"],
	Alt: ["option", "opt", "alt"],
	Cmd: ["command", "cmd", "meta"],
	Command: ["cmd", "meta"],
	Ctrl: ["control", "ctrl"],
	Esc: ["escape"],
	Shift: ["shift"],
	Super: ["super", "meta"],
	Win: ["windows", "win", "meta"],
	alt: ["option", "opt"],
	cmd: ["command", "meta"],
	command: ["cmd", "meta"],
	ctrl: ["control"],
	option: ["alt", "opt"],
	shift: ["shift"],
};

function keysSearchText(keys: string[]) {
	return keys
		.flatMap((key) => [
			key,
			...(DASHBOARD_KEYBOARD_HELP_KEY_ALIASES[key] ?? []),
		])
		.join(" ");
}

function normalizedSearchWords(value: string): string[] {
	return value
		.toLowerCase()
		.split(/[^a-z0-9⌥⌘⇧⌃↑↓←→[\]/.=]+/u)
		.filter(Boolean);
}

function keySearchTokens(keys: string[]): Set<string> {
	return new Set(normalizedSearchWords(keysSearchText(keys)));
}

function hotkeySearchText(hotkeyId: HotkeyId): string {
	const binding = getBinding(hotkeyId);
	const layoutMap = getEffectiveLayoutMap();
	const chord = bindingToDispatchChord(binding, layoutMap);
	const display = formatHotkeyDisplay(chord, PLATFORM, layoutMap);
	const displaySearchText =
		display.text === "Unassigned"
			? ""
			: `${display.text} ${keysSearchText(display.keys)}`;
	return [hotkeyId, chord, displaySearchText].filter(Boolean).join(" ");
}

export function normalizeDashboardKeyboardHelpQuery(query: string): string[] {
	return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function shouldOpenDashboardKeyboardHelpFromQuestionKey(
	event: KeyboardEvent,
): boolean {
	if (isDashboardVimModeEnabled()) return false;
	if (event.defaultPrevented) return false;
	if (event.isComposing) return false;
	if (event.altKey || event.ctrlKey || event.metaKey) return false;
	if (event.key !== "?") return false;
	return !isDashboardVimEditableTarget(event.target);
}

function dashboardKeyboardHelpEntrySearchParts({
	entry,
	section,
}: {
	entry: DashboardKeyboardHelpEntry;
	section: DashboardKeyboardHelpSection;
}) {
	const keysText = entry.keys
		? keysSearchText(entry.keys)
		: hotkeySearchText(entry.hotkeyId);
	const text = [
		section.id,
		section.title,
		entry.label,
		entry.description,
		keysText,
	]
		.join(" ")
		.toLowerCase();

	return {
		keyTokens: entry.keys
			? keySearchTokens(entry.keys)
			: new Set(normalizedSearchWords(keysText)),
		text,
		textTokens: new Set(normalizedSearchWords(text)),
	};
}

function dashboardKeyboardHelpEntryMatchesToken({
	keyTokens,
	text,
	textTokens,
	token,
}: {
	keyTokens: Set<string>;
	text: string;
	textTokens: Set<string>;
	token: string;
}) {
	if (token.length === 1) {
		return keyTokens.has(token) || textTokens.has(token);
	}

	return (
		text.includes(token) ||
		keyTokens.has(token) ||
		Array.from(keyTokens).some((keyToken) => keyToken.includes(token))
	);
}

export function filterDashboardKeyboardHelpSections({
	query,
	sections = DASHBOARD_KEYBOARD_HELP_SECTIONS,
}: {
	query: string;
	sections?: DashboardKeyboardHelpSection[];
}): DashboardKeyboardHelpSection[] {
	const tokens = normalizeDashboardKeyboardHelpQuery(query);

	if (tokens.length === 0) return sections;

	return sections
		.map((section) => ({
			...section,
			entries: section.entries.filter((entry) => {
				const searchParts = dashboardKeyboardHelpEntrySearchParts({
					entry,
					section,
				});

				return tokens.every((token) =>
					dashboardKeyboardHelpEntryMatchesToken({
						...searchParts,
						token,
					}),
				);
			}),
		}))
		.filter((section) => section.entries.length > 0);
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
					label: "Show this overlay from dashboard shell",
					description:
						"Open this guide from dashboard chrome without reaching for Option+/",
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
						"Show or hide the navigation shell from dashboard views; embedded Chrome keeps H/L for history",
				},
				{
					hotkeyId: "OPEN_UNREAD_NATIVE_REPLY",
					label: "Open unread native reply",
					description:
						"Jump to the newest unread Capy or Devin response from any dashboard view",
				},
				{
					keys: ["u"],
					label: "Open unread native reply in Vim mode",
					description:
						"Jump to the newest unread Capy or Devin response without leaving Vim navigation mode",
				},
				{
					hotkeyId: "MARK_LATEST_NATIVE_REPLY_READ",
					label: "Mark latest native reply read",
					description:
						"Acknowledge the newest unread Capy or Devin response from any dashboard view",
				},
				{
					keys: ["U"],
					label: "Mark latest native reply read in Vim mode",
					description:
						"Acknowledge the newest unread Capy or Devin response without leaving Vim navigation mode",
				},
			],
		},
		{
			id: "switching",
			title: "Switching",
			entries: [
				...dashboardKeyboardHelpPinnedWebPageEntries(),
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
					hotkeyId: "CREATE_CAPY",
					label: "Create Capy thread",
					description:
						"Start a new Capy thread directly from browsers, terminals, or native views",
				},
				{
					hotkeyId: "OPEN_DEVIN",
					label: "Open Devin",
					description: "Jump to Devin; chain a number for visible sessions",
				},
				{
					hotkeyId: "CREATE_DEVIN",
					label: "Create Devin session",
					description:
						"Start a new Devin session directly from browsers, terminals, or native views",
				},
				{
					keys: ["g", "b"],
					label: "Open Chrome in Vim mode",
					description: "Jump to the embedded Chrome tab set",
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
					label: "Jump to sidebar top in Vim mode",
					description: "Move keyboard focus to the first visible sidebar item",
				},
				{
					keys: ["⌥", "C", "1"],
					label: "Open Capy thread 1",
					description: "Use the visible sidebar number after the Capy chord",
				},
				{
					keys: ["⌥", "C", "n"],
					label: "Create Capy thread from Capy chord",
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
					label: "Create Devin session from Devin chord",
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
					keys: ["j", "k"],
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
					hotkeyId: "SIDEBAR_ACTION_MENU",
					label: "Show selected item actions from anywhere",
					description:
						"Open the focused sidebar row's action menu from browsers, terminals, and native views",
				},
				{
					keys: ["Space"],
					label: "Toggle selected item",
					description: "Collapse or expand the focused folder or sidebar group",
				},
				{
					keys: ["/", "type"],
					label: "Search sidebar",
					description:
						"Filter long workspace, Capy, and Devin lists from sidebar focus or Vim mode",
				},
				{
					keys: ["⌥K", "type sidebar"],
					label: "Search sidebar from anywhere",
					description:
						"Open the control plane and focus sidebar search from browsers, terminals, settings, and native agents",
				},
				{
					keys: ["type"],
					label: "Typeahead jump",
					description:
						"Type from the app shell or sidebar focus to jump through matching visible rows",
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
					keys: ["←", "→", "h", "l"],
					label: "Collapse or expand",
					description:
						"Collapse or expand focused folders and sidebar groups with arrows or Vim keys",
				},
				{
					keys: ["n"],
					label: "Create from section",
					description: "Create a session, workspace, or tab from focus",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_CREATE",
					label: "Create from selected section from anywhere",
					description:
						"Run the focused sidebar group's create action from trapped focus when assigned, or through the control plane",
				},
				{
					keys: ["N"],
					label: "Create folder or group",
					description:
						"Create a folder/group for the focused provider, Chrome section, or workspace",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_CREATE_FOLDER",
					label: "Create folder from anywhere",
					description:
						"Run the focused sidebar group's create-folder action from trapped focus when assigned, or through the control plane",
				},
				{
					keys: ["p"],
					label: "Pin or unpin selected",
					description:
						"Toggle selected Capy, Devin, or Chrome sidebar persistence",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_PIN",
					label: "Pin or unpin selected from anywhere",
					description:
						"Toggle focused sidebar persistence while focus is trapped in another view",
				},
				{
					keys: ["e"],
					label: "Rename selected",
					description:
						"Rename the focused workspace, native session, folder, or Chrome tab",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_RENAME",
					label: "Rename selected from anywhere",
					description:
						"Rename the focused sidebar item while focus is in a browser, terminal, or native view",
				},
				{
					keys: ["m"],
					label: "Move selected to folder",
					description:
						"Move the focused native session, Chrome tab, or workspace into a folder/group",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_MOVE",
					label: "Move selected to folder from anywhere",
					description:
						"Move the focused sidebar item into a folder without first returning focus to the sidebar",
				},
				{
					keys: ["F"],
					label: "Remove selected from folder",
					description:
						"Move the focused native session, Chrome tab, or workspace out of its folder/group",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_REMOVE_FROM_FOLDER",
					label: "Remove selected from folder from anywhere",
					description:
						"Move the focused sidebar item out of its folder without leaving the current view",
				},
				{
					keys: ["U"],
					label: "Mark selected reply read",
					description:
						"Acknowledge the focused native Capy or Devin sidebar session's latest reply",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_MARK_READ",
					label: "Mark selected reply read from anywhere",
					description:
						"Acknowledge the focused native Capy or Devin sidebar session's latest reply from trapped focus",
				},
				{
					keys: ["a", "x"],
					label: "Move selected away",
					description:
						"Move the focused Chrome tab or workspace away from the active sidebar; native sessions use a to hide and x/X to archive",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_ARCHIVE",
					label: "Move selected away from anywhere",
					description:
						"Hide the focused sidebar item from the active list while focus stays in another view",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_HARD_ARCHIVE",
					label: "Archive selected from anywhere",
					description:
						"Archive the focused native agent sidebar session from trapped focus",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_REPLY",
					label: "Reply to selected from anywhere",
					description:
						"Focus reply for the focused native agent sidebar session from browsers, terminals, or workspace views",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_OPEN_BROWSER",
					label: "Open selected in browser from anywhere",
					description:
						"Open the focused native agent sidebar session in its browser view",
				},
				{
					keys: ["c"],
					label: "Color selected folder",
					description: "Change the focused native or Chrome folder color",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_COLOR",
					label: "Color selected folder from anywhere",
					description:
						"Run the focused folder color action from trapped focus when assigned, or through the control plane",
				},
				{
					keys: ["⌥K", "type color"],
					label: "Color selected folder through control plane",
					description:
						"Open the control plane and run the focused folder color action when focus is trapped in a terminal, editor, or native view",
				},
				{
					keys: ["d"],
					label: "Delete selected folder",
					description:
						"Open confirmation for the focused native or Chrome folder",
				},
				{
					hotkeyId: "SIDEBAR_ACTION_DELETE",
					label: "Delete selected folder from anywhere",
					description:
						"Run the focused folder delete action from trapped focus when assigned, or through the control plane",
				},
				{
					keys: ["⌥K", "type delete folder"],
					label: "Delete selected folder through control plane",
					description:
						"Open the control plane and run the focused folder delete action when focus is trapped in a terminal, editor, or native view",
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
					hotkeyId: "BROWSER_NARROW_SPLIT",
					label: "Narrow native split from anywhere",
					description:
						"Narrow the native chat pane while focus is in the embedded browser or another dashboard surface",
				},
				{
					hotkeyId: "BROWSER_WIDEN_SPLIT",
					label: "Widen native split from anywhere",
					description:
						"Widen the native chat pane while focus is in the embedded browser or another dashboard surface",
				},
				{
					keys: ["="],
					label: "Equalize native split",
					description: "Reset native chat and browser panes to equal widths",
				},
				{
					hotkeyId: "BROWSER_EQUALIZE_SPLIT",
					label: "Equalize native split from anywhere",
					description: "Reset native chat and browser panes from trapped focus",
				},
				{
					hotkeyId: "BROWSER_SWAP_SPLIT",
					label: "Swap native split from anywhere",
					description:
						"Move focus between native split panes from trapped focus",
				},
				{
					keys: ["q"],
					label: "Close native split",
					description: "Return a split native session to chat-only view",
				},
				{
					hotkeyId: "BROWSER_CLOSE_SPLIT",
					label: "Close native split from anywhere",
					description:
						"Return a split native session to chat-only view from trapped focus",
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
					keys: ["f"],
					label: "Show native action hints",
					description:
						"Label visible native-agent session controls with action keys",
				},
				{
					keys: ["g", "g", "G", "Home", "End"],
					label: "Jump native overview",
					description:
						"Jump to the first or last visible Capy/Devin overview card",
				},
				{
					keys: ["g", "g", "G", "Home", "End"],
					label: "Jump selected native chat",
					description:
						"Jump to the top or bottom of the selected Capy/Devin chat",
				},
				{
					keys: ["1", "2", "3", "4", "5", "6"],
					label: "Filter native overview",
					description:
						"Switch Capy or Devin overview between all, active, unread, pinned, archived, and finished",
				},
				{
					keys: ["u"],
					label: "Open unread reply",
					description: "Jump to the next unread Capy or Devin response",
				},
				{
					keys: ["U"],
					label: "Mark current or latest reply read",
					description:
						"Acknowledge the current session's reply, the focused overview card, or the latest unread Capy/Devin response",
				},
				{
					keys: ["o", "b"],
					label: "Open browser version",
					description:
						"Open the current agent session or focused overview card in the embedded browser",
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
					keys: ["a"],
					label: "Hide from sidebar",
					description:
						"Move the current session away from the active sidebar without hard-archiving it",
				},
				{
					keys: ["x", "X"],
					label: "Archive session",
					description: "Hard-archive the current Capy or Devin session",
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
			entries: dashboardKeyboardHelpBrowserEntries(),
		},
		{
			id: "root-terminals",
			title: "Root Terminals",
			entries: [
				{
					keys: ["⌥K", "type kr9"],
					label: "Open root kr9 terminal",
					description:
						"Open the Option+K control plane, type kr9, stag, prod, or heph, then choose a root terminal",
				},
				...DASHBOARD_QUICK_TERMINALS.map((terminal) => ({
					hotkeyId: dashboardQuickTerminalHotkeyId(terminal.id),
					label: `Open ${terminal.label} root kr9`,
					description: `Open ${terminal.label} directly, or use ${dashboardQuickTerminalShortcutLabel(terminal.id)} in the control plane`,
				})),
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
