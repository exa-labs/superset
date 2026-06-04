export type DashboardBrowserShortcutAction =
	| "close-current-tab"
	| "close-split"
	| "equalize-split"
	| "go-back"
	| "go-forward"
	| "narrow-active-split"
	| "new-current-url-tab"
	| "next-tab"
	| "open-external"
	| "previous-tab"
	| "reload"
	| "swap-split"
	| "toggle-tab-pin"
	| "toggle-split"
	| "widen-active-split";

export type DashboardBrowserShortcutSection = "navigation" | "split" | "tabs";

export interface DashboardBrowserShortcutDescriptor {
	action: DashboardBrowserShortcutAction;
	key: string;
	label: string;
	section: DashboardBrowserShortcutSection;
}

const BASE_BROWSER_SHORTCUTS: DashboardBrowserShortcutDescriptor[] = [
	{ action: "go-back", key: "H", label: "Back", section: "navigation" },
	{ action: "go-forward", key: "L", label: "Forward", section: "navigation" },
	{
		action: "open-external",
		key: "O",
		label: "Open externally",
		section: "navigation",
	},
	{ action: "reload", key: "r", label: "Reload", section: "navigation" },
	{
		action: "new-current-url-tab",
		key: "n",
		label: "New tab from current page",
		section: "tabs",
	},
	{
		action: "previous-tab",
		key: "h",
		label: "Previous tab",
		section: "tabs",
	},
	{ action: "next-tab", key: "l", label: "Next tab", section: "tabs" },
	{
		action: "close-current-tab",
		key: "x",
		label: "Close current tab",
		section: "tabs",
	},
	{
		action: "toggle-tab-pin",
		key: "p",
		label: "Pin or unpin sidebar tab",
		section: "tabs",
	},
	{
		action: "toggle-split",
		key: "s",
		label: "Open split view",
		section: "split",
	},
];

const ACTIVE_SPLIT_BROWSER_SHORTCUTS: DashboardBrowserShortcutDescriptor[] = [
	{
		action: "toggle-split",
		key: "s",
		label: "Close split view",
		section: "split",
	},
	{ action: "close-split", key: "q", label: "Close split", section: "split" },
	{ action: "swap-split", key: "w", label: "Swap panes", section: "split" },
	{
		action: "narrow-active-split",
		key: "[",
		label: "Narrow active pane",
		section: "split",
	},
	{
		action: "widen-active-split",
		key: "]",
		label: "Widen active pane",
		section: "split",
	},
	{
		action: "equalize-split",
		key: "=",
		label: "Equalize panes",
		section: "split",
	},
];

export function dashboardBrowserShortcutDescriptors({
	isSplitView,
}: {
	isSplitView: boolean;
}): DashboardBrowserShortcutDescriptor[] {
	const shortcuts = BASE_BROWSER_SHORTCUTS.filter(
		(shortcut) => shortcut.action !== "toggle-split",
	);
	return [
		...shortcuts,
		...(isSplitView
			? ACTIVE_SPLIT_BROWSER_SHORTCUTS
			: BASE_BROWSER_SHORTCUTS.filter(
					(shortcut) => shortcut.action === "toggle-split",
				)),
	];
}
