import { describe, expect, it } from "bun:test";
import { dashboardBrowserShortcutDescriptors } from "./dashboard-browser-shortcuts";

describe("dashboardBrowserShortcutDescriptors", () => {
	it("surfaces the browser keyboard controls with human-readable labels", () => {
		expect(dashboardBrowserShortcutDescriptors({ isSplitView: false })).toEqual(
			[
				{ action: "go-back", key: "H", label: "Back", section: "navigation" },
				{
					action: "go-forward",
					key: "L",
					label: "Forward",
					section: "navigation",
				},
				{
					action: "open-external",
					key: "O",
					label: "Open externally",
					section: "navigation",
				},
				{
					action: "reload",
					key: "r",
					label: "Reload",
					section: "navigation",
				},
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
			],
		);
	});

	it("adds split-specific controls when a split pane is open", () => {
		expect(
			dashboardBrowserShortcutDescriptors({ isSplitView: true }).filter(
				(shortcut) => shortcut.section === "split",
			),
		).toEqual([
			{
				action: "toggle-split",
				key: "s",
				label: "Close split view",
				section: "split",
			},
			{
				action: "close-split",
				key: "q",
				label: "Close split",
				section: "split",
			},
			{
				action: "swap-split",
				key: "w",
				label: "Swap panes",
				section: "split",
			},
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
		]);
	});
});
