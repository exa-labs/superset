import { describe, expect, it } from "bun:test";
import {
	nativeAgentChatScrollDeltaFromKey,
	nativeAgentFolderVimActionFromKey,
	nativeAgentOverviewFocusDeltaFromKey,
	nativeAgentPlainNavigationKey,
	nativeAgentSearchEscapeResult,
	nativeAgentSelectedSessionVimActionFromKey,
	nativeAgentSidebarJumpFromKey,
	nativeAgentSidebarVimActionFromKey,
	nativeAgentSplitPaneActionFromKey,
	nativeAgentUnreadVimActionFromKey,
	nextNativeAgentKeyboardViewMode,
	nextNativeAgentOverviewFocusIndex,
} from "./native-agent-keyboard";

function keyEvent(
	overrides: Partial<KeyboardEvent> & { target?: EventTarget | null } = {},
) {
	return {
		altKey: false,
		ctrlKey: false,
		defaultPrevented: false,
		isComposing: false,
		key: "ArrowDown",
		keyCode: 40,
		metaKey: false,
		target: null,
		...overrides,
	} as KeyboardEvent;
}

describe("native agent keyboard helpers", () => {
	it("clears overview search before blurring it", () => {
		expect(nativeAgentSearchEscapeResult("qes")).toEqual({
			nextSearch: "",
			shouldBlur: false,
		});
		expect(nativeAgentSearchEscapeResult("")).toEqual({
			nextSearch: "",
			shouldBlur: true,
		});
	});

	it("maps native sidebar vim row actions", () => {
		expect(nativeAgentSidebarVimActionFromKey("enter")).toBe("open");
		expect(nativeAgentSidebarVimActionFromKey(" ")).toBe("open");
		expect(nativeAgentSidebarVimActionFromKey("o")).toBe("open");
		expect(nativeAgentSidebarVimActionFromKey("p")).toBe("pin");
		expect(nativeAgentSidebarVimActionFromKey("H")).toBe("none");
		expect(nativeAgentSidebarVimActionFromKey("f")).toBe("move-to-folder");
		expect(nativeAgentSidebarVimActionFromKey("m")).toBe("move-to-folder");
		expect(nativeAgentSidebarVimActionFromKey("F")).toBe("remove-from-folder");
		expect(nativeAgentSidebarVimActionFromKey("a")).toBe("archive");
		expect(nativeAgentSidebarVimActionFromKey("x")).toBe("archive");
		expect(nativeAgentSidebarVimActionFromKey("j")).toBe("none");
	});

	it("maps native folder vim row actions", () => {
		expect(nativeAgentFolderVimActionFromKey("enter")).toBe("toggle");
		expect(nativeAgentFolderVimActionFromKey(" ")).toBe("toggle");
		expect(nativeAgentFolderVimActionFromKey("o")).toBe("toggle");
		expect(nativeAgentFolderVimActionFromKey("h")).toBe("collapse");
		expect(nativeAgentFolderVimActionFromKey("l")).toBe("expand");
		expect(nativeAgentFolderVimActionFromKey("e")).toBe("rename");
		expect(nativeAgentFolderVimActionFromKey("c")).toBe("color");
		expect(nativeAgentFolderVimActionFromKey("d")).toBe("delete");
		expect(nativeAgentFolderVimActionFromKey("p")).toBe("none");
	});

	it("maps native sidebar top and bottom jump keys", () => {
		expect(
			nativeAgentSidebarJumpFromKey({ key: "G", lastGAt: 1000, now: 1200 }),
		).toEqual({
			action: "bottom",
			handled: true,
			nextLastGAt: 0,
		});
		expect(
			nativeAgentSidebarJumpFromKey({ key: "g", lastGAt: 0, now: 1000 }),
		).toEqual({
			action: "none",
			handled: true,
			nextLastGAt: 1000,
		});
		expect(
			nativeAgentSidebarJumpFromKey({ key: "g", lastGAt: 1000, now: 1200 }),
		).toEqual({
			action: "top",
			handled: true,
			nextLastGAt: 0,
		});
		expect(
			nativeAgentSidebarJumpFromKey({ key: "j", lastGAt: 1000, now: 1200 }),
		).toEqual({
			action: "none",
			handled: false,
			nextLastGAt: 1000,
		});
	});

	it("maps selected-session vim actions", () => {
		expect(nativeAgentSelectedSessionVimActionFromKey("r")).toBe(
			"focus-composer",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("R")).toBe("refresh");
		expect(nativeAgentSelectedSessionVimActionFromKey("o")).toBe(
			"open-browser",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("e")).toBe("rename");
		expect(nativeAgentSelectedSessionVimActionFromKey("m")).toBe(
			"move-to-folder",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("f")).toBe(
			"move-to-folder",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("F")).toBe(
			"remove-from-folder",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("x")).toBe("archive");
		expect(nativeAgentSelectedSessionVimActionFromKey("a")).toBe("archive");
		expect(nativeAgentSelectedSessionVimActionFromKey("p")).toBe("none");
	});

	it("maps unread vim action keys", () => {
		expect(nativeAgentUnreadVimActionFromKey("u")).toBe("open-unread");
		expect(nativeAgentUnreadVimActionFromKey("U")).toBe("none");
		expect(nativeAgentUnreadVimActionFromKey("j")).toBe("none");
	});

	it("maps chat vim scroll keys to predictable deltas", () => {
		expect(nativeAgentChatScrollDeltaFromKey("j", 1000)).toBe(96);
		expect(nativeAgentChatScrollDeltaFromKey("k", 1000)).toBe(-96);
		expect(nativeAgentChatScrollDeltaFromKey("J", 1000)).toBe(800);
		expect(nativeAgentChatScrollDeltaFromKey("K", 1000)).toBe(-800);
		expect(nativeAgentChatScrollDeltaFromKey("h", 1000)).toBe(0);
	});

	it("toggles native browser modes only when the selected session has a browser URL", () => {
		expect(
			nextNativeAgentKeyboardViewMode({
				currentMode: "native",
				hasBrowserUrl: true,
				key: "b",
			}),
		).toBe("browser");
		expect(
			nextNativeAgentKeyboardViewMode({
				currentMode: "browser",
				hasBrowserUrl: true,
				key: "b",
			}),
		).toBe("native");
		expect(
			nextNativeAgentKeyboardViewMode({
				currentMode: "native",
				hasBrowserUrl: true,
				key: "s",
			}),
		).toBe("split");
		expect(
			nextNativeAgentKeyboardViewMode({
				currentMode: "split",
				hasBrowserUrl: true,
				key: "s",
			}),
		).toBe("native");
		expect(
			nextNativeAgentKeyboardViewMode({
				currentMode: "native",
				hasBrowserUrl: false,
				key: "b",
			}),
		).toBeNull();
		expect(
			nextNativeAgentKeyboardViewMode({
				currentMode: "native",
				hasBrowserUrl: true,
				key: "x",
			}),
		).toBeNull();
	});

	it("maps native split pane resize keys", () => {
		expect(nativeAgentSplitPaneActionFromKey("[")).toBe("narrow-native");
		expect(nativeAgentSplitPaneActionFromKey("]")).toBe("widen-native");
		expect(nativeAgentSplitPaneActionFromKey("=")).toBe("equalize");
		expect(nativeAgentSplitPaneActionFromKey("s")).toBe("none");
		expect(nativeAgentSplitPaneActionFromKey(null)).toBe("none");
	});

	it("maps plain arrow navigation while guarding editable and sidebar targets", () => {
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "ArrowDown" }))).toBe(
			"j",
		);
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "ArrowUp" }))).toBe(
			"k",
		);
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "ArrowLeft" }))).toBe(
			"h",
		);
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "ArrowRight" }))).toBe(
			"l",
		);
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "Enter" }))).toBe(
			"enter",
		);
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "x" }))).toBeNull();
		expect(
			nativeAgentPlainNavigationKey(
				keyEvent({ key: "ArrowDown", metaKey: true }),
			),
		).toBeNull();

		if (typeof document === "undefined") return;
		const input = document.createElement("input");
		document.body.append(input);
		expect(
			nativeAgentPlainNavigationKey(
				keyEvent({ key: "ArrowDown", target: input }),
			),
		).toBeNull();
		input.remove();

		const sidebarRow = document.createElement("button");
		sidebarRow.setAttribute("data-native-agent-session-row-id", "thread-1");
		document.body.append(sidebarRow);
		expect(
			nativeAgentPlainNavigationKey(
				keyEvent({ key: "ArrowDown", target: sidebarRow }),
			),
		).toBeNull();
		sidebarRow.focus();
		expect(
			nativeAgentPlainNavigationKey(keyEvent({ key: "ArrowDown" })),
		).toBeNull();
		sidebarRow.remove();
	});

	it("maps overview grid movement keys by detected column count", () => {
		expect(nativeAgentOverviewFocusDeltaFromKey("j", 3)).toBe(3);
		expect(nativeAgentOverviewFocusDeltaFromKey("k", 3)).toBe(-3);
		expect(nativeAgentOverviewFocusDeltaFromKey("l", 3)).toBe(1);
		expect(nativeAgentOverviewFocusDeltaFromKey("h", 3)).toBe(-1);
		expect(nativeAgentOverviewFocusDeltaFromKey("x", 3)).toBe(0);
		expect(nativeAgentOverviewFocusDeltaFromKey("j", 0)).toBe(1);
	});

	it("clamps overview focus movement and supports no-current-focus starts", () => {
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: 1,
				itemCount: 8,
				key: "j",
			}),
		).toBe(4);
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: 1,
				itemCount: 8,
				key: "k",
			}),
		).toBe(0);
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: 7,
				itemCount: 8,
				key: "j",
			}),
		).toBe(7);
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: -1,
				itemCount: 8,
				key: "j",
			}),
		).toBe(0);
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: -1,
				itemCount: 8,
				key: "k",
			}),
		).toBe(0);
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: -1,
				itemCount: 8,
				key: "h",
			}),
		).toBe(0);
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: -1,
				itemCount: 8,
				key: "l",
			}),
		).toBe(0);
		expect(
			nextNativeAgentOverviewFocusIndex({
				columnCount: 3,
				currentIndex: 1,
				itemCount: 8,
				key: "x",
			}),
		).toBeNull();
	});
});
