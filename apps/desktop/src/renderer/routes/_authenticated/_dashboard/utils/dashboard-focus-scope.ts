export type DashboardFocusScopeId =
	| "app"
	| "browser"
	| "command-palette"
	| "editor"
	| "keyboard-help"
	| "native-agent"
	| "sidebar"
	| "terminal";

export interface DashboardFocusScope {
	description: string;
	id: DashboardFocusScopeId;
	label: string;
}

const FOCUS_SCOPE_BY_ID: Record<DashboardFocusScopeId, DashboardFocusScope> = {
	app: {
		description: "App shell focus",
		id: "app",
		label: "App",
	},
	browser: {
		description: "Embedded browser focus",
		id: "browser",
		label: "Browser",
	},
	"command-palette": {
		description: "Command palette focus",
		id: "command-palette",
		label: "Command",
	},
	editor: {
		description: "Editor focus",
		id: "editor",
		label: "Editor",
	},
	"keyboard-help": {
		description: "Keyboard help focus",
		id: "keyboard-help",
		label: "Help",
	},
	"native-agent": {
		description: "Native Capy or Devin focus",
		id: "native-agent",
		label: "Native",
	},
	sidebar: {
		description: "Navigation sidebar focus",
		id: "sidebar",
		label: "Sidebar",
	},
	terminal: {
		description: "Terminal focus",
		id: "terminal",
		label: "Terminal",
	},
};

function closest(element: Element, selector: string): Element | null {
	return element.closest(selector);
}

function isWebviewElement(element: Element): boolean {
	return element.tagName.toLowerCase() === "webview";
}

export function dashboardFocusScopeForElement(
	element: Element | null,
): DashboardFocusScope {
	if (!element) return FOCUS_SCOPE_BY_ID.app;
	if (
		closest(
			element,
			"[data-command-palette-input], [data-command-palette-command-id]",
		)
	) {
		return FOCUS_SCOPE_BY_ID["command-palette"];
	}
	if (closest(element, "[data-dashboard-keyboard-help]")) {
		return FOCUS_SCOPE_BY_ID["keyboard-help"];
	}
	if (closest(element, "[data-dashboard-sidebar-root]")) {
		return FOCUS_SCOPE_BY_ID.sidebar;
	}
	if (
		isWebviewElement(element) ||
		closest(
			element,
			"webview, [data-dashboard-browser-view], [data-dashboard-web-view-deck-root]",
		)
	) {
		return FOCUS_SCOPE_BY_ID.browser;
	}
	if (closest(element, "[data-native-agent-view-root]")) {
		return FOCUS_SCOPE_BY_ID["native-agent"];
	}
	if (closest(element, "[data-terminal-root], .xterm")) {
		return FOCUS_SCOPE_BY_ID.terminal;
	}
	if (closest(element, "[data-monaco-editor], .monaco-editor")) {
		return FOCUS_SCOPE_BY_ID.editor;
	}
	return FOCUS_SCOPE_BY_ID.app;
}

export function dashboardFocusScopeForDocument(
	documentRef: Pick<Document, "activeElement"> | null,
): DashboardFocusScope {
	const activeElement = documentRef?.activeElement;
	return dashboardFocusScopeForElement(
		typeof Element !== "undefined" && activeElement instanceof Element
			? activeElement
			: null,
	);
}
