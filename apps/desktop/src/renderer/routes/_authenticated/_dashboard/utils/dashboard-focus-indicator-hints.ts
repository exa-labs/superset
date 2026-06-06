import type { DashboardFocusScopeId } from "./dashboard-focus-scope";

interface DashboardFocusIndicatorHintOptions {
	hints?: string[];
	vimModeEnabled?: boolean;
}

const GLOBAL_NAV_HINT = "⌥K/Tab/1-6/C/D/G/V";

const HINTS_BY_SCOPE: Record<DashboardFocusScopeId, string[]> = {
	app: ["Esc", GLOBAL_NAV_HINT, "?"],
	browser: ["Esc", GLOBAL_NAV_HINT, "j/k /", "h/l/r/s/p/x/u/U/f/?"],
	"command-palette": ["type", "↑↓", "↵", "Esc"],
	editor: ["Esc", GLOBAL_NAV_HINT],
	"keyboard-help": ["type", "Esc"],
	"native-agent": ["Esc", GLOBAL_NAV_HINT, "⌥N/⌥⇧N", "j/k/gg/G/actions/?"],
	sidebar: [
		GLOBAL_NAV_HINT,
		"↑↓ /",
		"↵/Space/h/l",
		"n/N/p/m/F/e/U/a/x/X/c/d/?",
	],
	terminal: ["Esc", GLOBAL_NAV_HINT],
};

const GLOBAL_ROW_ACTIONS_HINT = "⌥./P/A/M/E";
const GLOBAL_ROW_ACTIONS_HINT_SCOPES = new Set<DashboardFocusScopeId>([
	"app",
	"browser",
	"editor",
	"native-agent",
	"terminal",
]);

const VIM_ONLY_HINTS = new Set([
	"?",
	"f",
	"f/?",
	"gg/gc/gd/gw",
	"h/l/r/s/p/x/u/U/f/?",
	"j/k /",
	"j/k/gg/G/actions/?",
	"m/e",
	"n/r",
	"n/N",
	"b/p/x",
	"o/O/b",
	"r/o/b/m/e",
	"r/o/b/m/e/u/U/x/X/f/?",
	"r/o/b/m/F/e/u/U/x/X/f/?",
	"r/o/b/p/m/F/e/u/U/a/x/X/f/?",
	"r",
	"r/u/U",
	"s/b",
	"s/q",
	"s/w/[/]/=",
	"u/U",
	"u/U/x/X/f/?",
	"x/X",
	"x/X/f/?",
]);

export function dashboardFocusIndicatorHints(
	scopeId: DashboardFocusScopeId,
	options: DashboardFocusIndicatorHintOptions = {},
): string[] {
	const hints = HINTS_BY_SCOPE[scopeId];
	if (options.vimModeEnabled !== false) return hints;
	const visibleHints = hints.filter((hint) => !VIM_ONLY_HINTS.has(hint));
	if (GLOBAL_ROW_ACTIONS_HINT_SCOPES.has(scopeId)) {
		return [...visibleHints, GLOBAL_ROW_ACTIONS_HINT];
	}
	return visibleHints;
}

function visibleDashboardFocusHintLabel(hint: string): string | null {
	if (hint === "type") return "type Search";
	if (hint === "Esc") return "Esc Sidebar";
	if (hint === "↑↓") return "↑↓ Move";
	if (hint === "↑↓ /") return "↑↓ Move · / Search";
	if (hint === "↵") return "↵ Open";
	if (hint === "↵/Space") return "↵ Open · Space Toggle";
	if (hint === "↵/Space/h/l") return "↵ Open · Space Toggle · h/l Expand";
	if (hint === "h/l") return "h/l Collapse";
	if (hint === "n/p/x/?") return "n New, p Pin, x Hide, ? Map";
	if (hint === "n/N/p/m/e/a/x/?") {
		return "n New, N Folder, p Pin, m Move, e Rename, a/x Away, ? Map";
	}
	if (hint === "n/N/p/m/F/e/U/a/x/X/c/d/?") {
		return "n New, N Folder, p Pin, m/F Folder, e Rename, U Read, a Away, x/X Archive, c/d Folder, ? Map";
	}
	if (hint === "n/N/p/m/e/x/?") {
		return "n New, N Folder, p Pin, m Move, e Rename, x Hide, ? Map";
	}
	if (hint === ".") return ". Actions";
	if (hint === "p/x") return "p Pin, x Hide";
	if (hint === "r") return "r Reply";
	if (hint === "r/o/b/m/e") {
		return "r Reply, o Browser, b View, m Move, e Rename";
	}
	if (hint === "r/o/b/m/e/u/U/x/X/f/?") {
		return "r Reply, o Browser, b View, m Move, e Rename, u Unread, U Read, x/X Archive, f Hints, ? Map";
	}
	if (hint === "r/o/b/m/F/e/u/U/x/X/f/?") {
		return "r Reply, o Browser, b View, m/F Folder, e Rename, u Unread, U Read, x/X Archive, f Hints, ? Map";
	}
	if (hint === "r/o/b/p/m/F/e/u/U/a/x/X/f/?") {
		return "r Reply, o Browser, b View, p Pin, m/F Folder, e Rename, u Unread, U Read, a Hide, x/X Archive, f Hints, ? Map";
	}
	if (hint === "j/k/gg/G/actions/?") {
		return "j/k Move · gg/G Jump · f Map";
	}
	if (hint === "r/u/U") return "r Reply, u Unread, U Read";
	if (hint === "b/p/x") return "b View, p Pin, x Hide";
	if (hint === "⌥N/⌥⇧N") return "⌥N Unread, ⌥⇧N Read";
	if (hint === GLOBAL_ROW_ACTIONS_HINT) return "⌥. Actions · ⌥P/A/M/E";
	if (hint === "u/U") return "u Open unread, U Mark read";
	if (hint === "u/U/x/X/f/?") {
		return "u Unread, U Read, x/X Archive, f Hints, ? Map";
	}
	if (hint === "x/X") return "x/X Archive";
	if (hint === "x/X/f/?") return "x/X Archive, f Hints, ? Map";
	if (hint === "f") return "f Hints";
	if (hint === "f/?") return "f Hints, ? Map";
	if (hint === "h/l/r/s/p/x/u/U/f/?") {
		return "h/l Tabs, r Reload, s Split, p/x Tab, u/U Unread, f Map";
	}
	if (hint === "j/k /") return "j/k Move, / Search";
	return null;
}

function dashboardFocusHintIncludesKeyboardMap(hint: string): boolean {
	return hint.includes("?");
}

export function dashboardFocusIndicatorVisibleHintLabels(
	hints: string[],
	options: DashboardFocusIndicatorHintOptions = {},
): string[] {
	const showCommandsHint = hints.some(
		(hint) =>
			hint === "⌥K" ||
			hint === "⌥K/Tab" ||
			hint === "⌥K/Tab/V" ||
			hint === GLOBAL_NAV_HINT,
	);
	const showMruHint = hints.some(
		(hint) =>
			hint === "⌥Tab" ||
			hint === "⌥K/Tab" ||
			hint === "⌥K/Tab/V" ||
			hint === GLOBAL_NAV_HINT,
	);
	const showVimToggleHint =
		hints.includes("⌥K/Tab/V") || hints.includes(GLOBAL_NAV_HINT);
	const showFastSwitcherHint = hints.includes(GLOBAL_NAV_HINT);
	const showVimShortcutsHint = hints.includes("?");
	const hasLocalKeyboardMapHint = hints.some(
		dashboardFocusHintIncludesKeyboardMap,
	);
	const showOptionShortcutsHint =
		options.vimModeEnabled === false &&
		showCommandsHint &&
		!hasLocalKeyboardMapHint;
	const localHintLabels = hints
		.map(visibleDashboardFocusHintLabel)
		.filter((hint): hint is string => hint !== null);

	return [
		showCommandsHint
			? showMruHint
				? showVimToggleHint
					? showFastSwitcherHint
						? "⌥K Commands · ⌥Tab MRU · ⌥1-6/C/D/G Fast · ⌥V Vim"
						: "⌥K Commands · ⌥Tab MRU · ⌥V Vim"
					: "⌥K Commands · ⌥Tab MRU"
				: "⌥K Commands"
			: null,
		...localHintLabels,
		showVimShortcutsHint ? "? Shortcuts" : null,
		!showVimShortcutsHint && showOptionShortcutsHint ? "⌥/ Shortcuts" : null,
	].filter((hint): hint is string => hint !== null);
}

function readableDashboardFocusHint(hint: string): string {
	if (hint === "⌥K") return "Option+K";
	if (hint === "⌥K/Tab") return "Option+K/Option+Tab";
	if (hint === "⌥K/Tab/V") return "Option+K/Option+Tab/Option+V";
	if (hint === GLOBAL_NAV_HINT) {
		return "Option+K, Option+Tab, Option+1-6, Option+C/D/G, Option+V";
	}
	if (hint === "⌥/") return "Option+/";
	if (hint === "↑↓") return "Up/Down";
	if (hint === "↑↓ /") return "Up/Down, /";
	if (hint === "↵") return "Enter";
	if (hint === "↵/Space") return "Enter/Space";
	if (hint === "↵/Space/h/l") return "Enter/Space/h/l";
	if (hint === "b/p/x") return "b, p, x";
	if (hint === "h/l") return "h/l";
	if (hint === "n/p/x/?") return "n, p, x, ?";
	if (hint === "n/N/p/m/e/a/x/?") return "n, N, p, m, e, a/x, ?";
	if (hint === "n/N/p/m/F/e/U/a/x/X/c/d/?") {
		return "n, N, p, m, F, e, U, a, x, X, c, d, ?";
	}
	if (hint === "n/N/p/m/e/x/?") return "n, N, p, m, e, x, ?";
	if (hint === "p/x") return "p, x";
	if (hint === "f/?") return "f, ?";
	if (hint === "h/l/r/s/p/x/u/U/f/?") {
		return "h/l, r, s, p, x, u, U, f, ?";
	}
	if (hint === "j/k /") return "j/k, /";
	if (hint === "j/k/gg/G/actions/?") {
		return "j/k, gg/G, action keys, ?";
	}
	if (hint === "r/o/b/m/e") return "r, o, b, m, e";
	if (hint === "r/o/b/m/e/u/U/x/X/f/?") {
		return "r, o, b, m, e, u, U, x, X, f, ?";
	}
	if (hint === "r/o/b/m/F/e/u/U/x/X/f/?") {
		return "r, o, b, m, F, e, u, U, x, X, f, ?";
	}
	if (hint === "r/o/b/p/m/F/e/u/U/a/x/X/f/?") {
		return "r, o, b, p, m, F, e, u, U, a, x, X, f, ?";
	}
	if (hint === "r/u/U") return "r, u, U";
	if (hint === "⌥N/⌥⇧N") return "Option+N/Option+Shift+N";
	if (hint === GLOBAL_ROW_ACTIONS_HINT) {
		return "Option+period actions menu and Option+P/A/M/E row actions";
	}
	if (hint === "u/U") return "u, U";
	if (hint === "u/U/x/X/f/?") return "u, U, x, X, f, ?";
	if (hint === "x/X") return "x, X";
	if (hint === "x/X/f/?") return "x, X, f, ?";
	return hint;
}

export function dashboardFocusIndicatorShortcutTitle(
	scopeDescription: string,
	options: DashboardFocusIndicatorHintOptions = {},
): string {
	const hasLocalKeyboardMapHint =
		options.hints?.some(dashboardFocusHintIncludesKeyboardMap) ?? false;
	const shortcut =
		options.vimModeEnabled === false && !hasLocalKeyboardMapHint
			? "Option+/"
			: "?";
	const hints = options.hints
		?.map(readableDashboardFocusHint)
		.filter((hint) => hint.trim().length > 0);
	const hintsText = hints?.length ? ` Keys: ${hints.join(", ")}.` : "";
	return `${scopeDescription}.${hintsText} Press ${shortcut} for full keyboard shortcuts.`;
}
