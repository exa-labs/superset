import { describe, expect, it } from "bun:test";
import {
	NATIVE_AGENT_OVERVIEW_FILTER_SHORTCUTS,
	nativeAgentChatScrollDeltaFromKey,
	nativeAgentCreateVimActionFromKey,
	nativeAgentFolderVimActionFromKey,
	nativeAgentOverviewCardVimActionFromKey,
	nativeAgentOverviewFilterFromKey,
	nativeAgentOverviewFilterShortcutKey,
	nativeAgentOverviewFocusDeltaFromKey,
	nativeAgentOverviewJumpFromKey,
	nativeAgentPlainNavigationKey,
	nativeAgentSearchEscapeResult,
	nativeAgentSelectedSessionVimActionFromKey,
	nativeAgentSidebarCurrentIndex,
	nativeAgentSidebarJumpFromKey,
	nativeAgentSidebarNavigationDeltaFromKey,
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
		expect(nativeAgentSidebarVimActionFromKey("i")).toBe("focus-composer");
		expect(nativeAgentSidebarVimActionFromKey("r")).toBe("focus-composer");
		expect(nativeAgentSidebarVimActionFromKey("o")).toBe("open-browser");
		expect(nativeAgentSidebarVimActionFromKey("b")).toBe("toggle-browser");
		expect(nativeAgentSidebarVimActionFromKey("p")).toBe("pin");
		expect(nativeAgentSidebarVimActionFromKey("e")).toBe("rename");
		expect(nativeAgentSidebarVimActionFromKey("H")).toBe("none");
		expect(nativeAgentSidebarVimActionFromKey("f")).toBe("show-action-hints");
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
		expect(nativeAgentFolderVimActionFromKey("m")).toBe("move-active");
		expect(nativeAgentFolderVimActionFromKey("e")).toBe("rename");
		expect(nativeAgentFolderVimActionFromKey("c")).toBe("color");
		expect(nativeAgentFolderVimActionFromKey("d")).toBe("delete");
		expect(nativeAgentFolderVimActionFromKey("p")).toBe("none");
	});

	it("separates new-session and new-folder vim actions", () => {
		expect(nativeAgentCreateVimActionFromKey("n")).toBe("create-session");
		expect(nativeAgentCreateVimActionFromKey("N")).toBe("create-folder");
		expect(nativeAgentCreateVimActionFromKey("m")).toBe("none");
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

	it("maps native overview top and bottom jump keys", () => {
		expect(
			nativeAgentOverviewJumpFromKey({
				key: "home",
				lastGAt: 1000,
				now: 1200,
			}),
		).toEqual({
			action: "top",
			handled: true,
			nextLastGAt: 0,
		});
		expect(
			nativeAgentOverviewJumpFromKey({
				key: "end",
				lastGAt: 1000,
				now: 1200,
			}),
		).toEqual({
			action: "bottom",
			handled: true,
			nextLastGAt: 0,
		});
		expect(
			nativeAgentOverviewJumpFromKey({
				key: "g",
				lastGAt: 1000,
				now: 1200,
			}),
		).toEqual({
			action: "top",
			handled: true,
			nextLastGAt: 0,
		});
		expect(
			nativeAgentOverviewJumpFromKey({
				key: "G",
				lastGAt: 1000,
				now: 1200,
			}),
		).toEqual({
			action: "bottom",
			handled: true,
			nextLastGAt: 0,
		});
	});

	it("only moves native sidebar rows for arrow and j/k navigation keys", () => {
		expect(
			nativeAgentSidebarNavigationDeltaFromKey({
				eventKey: "ArrowDown",
				vimKey: null,
			}),
		).toBe(1);
		expect(
			nativeAgentSidebarNavigationDeltaFromKey({
				eventKey: "ArrowUp",
				vimKey: null,
			}),
		).toBe(-1);
		expect(
			nativeAgentSidebarNavigationDeltaFromKey({
				eventKey: "j",
				vimKey: "j",
			}),
		).toBe(1);
		expect(
			nativeAgentSidebarNavigationDeltaFromKey({
				eventKey: "k",
				vimKey: "k",
			}),
		).toBe(-1);

		for (const key of ["f", "c", "d", "h", "l", "F"]) {
			expect(
				nativeAgentSidebarNavigationDeltaFromKey({
					eventKey: key,
					vimKey: key,
				}),
			).toBe(0);
		}
	});

	it("prefers focused native sidebar rows over the active route for repeated navigation", () => {
		expect(
			nativeAgentSidebarCurrentIndex({
				activeIndex: 0,
				focusedIndex: 2,
			}),
		).toBe(2);
		expect(
			nativeAgentSidebarCurrentIndex({
				activeIndex: 1,
				focusedIndex: -1,
			}),
		).toBe(1);
		expect(
			nativeAgentSidebarCurrentIndex({
				activeIndex: -1,
				focusedIndex: -1,
			}),
		).toBe(-1);
	});

	it("maps selected-session vim actions", () => {
		expect(nativeAgentSelectedSessionVimActionFromKey("escape")).toBe(
			"focus-navigation-shell",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("r")).toBe(
			"focus-composer",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("i")).toBe(
			"focus-composer",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("R")).toBe("refresh");
		expect(nativeAgentSelectedSessionVimActionFromKey("o")).toBe(
			"open-browser",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("O")).toBe(
			"open-external",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("b")).toBe(
			"toggle-browser",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("e")).toBe("rename");
		expect(nativeAgentSelectedSessionVimActionFromKey("m")).toBe(
			"move-to-folder",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("f")).toBe(
			"show-action-hints",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("F")).toBe(
			"remove-from-folder",
		);
		expect(nativeAgentSelectedSessionVimActionFromKey("p")).toBe("pin");
		expect(nativeAgentSelectedSessionVimActionFromKey("x")).toBe("archive");
		expect(nativeAgentSelectedSessionVimActionFromKey("a")).toBe("archive");
	});

	it("maps overview card vim actions for inbox management", () => {
		expect(nativeAgentOverviewCardVimActionFromKey("p")).toBe("pin");
		expect(nativeAgentOverviewCardVimActionFromKey("e")).toBe("rename");
		expect(nativeAgentOverviewCardVimActionFromKey("m")).toBe("move-to-folder");
		expect(nativeAgentOverviewCardVimActionFromKey("F")).toBe(
			"remove-from-folder",
		);
		expect(nativeAgentOverviewCardVimActionFromKey("a")).toBe("archive");
		expect(nativeAgentOverviewCardVimActionFromKey("x")).toBe("archive");
		expect(nativeAgentOverviewCardVimActionFromKey("j")).toBe("none");
	});

	it("maps native overview filter shortcuts", () => {
		expect(NATIVE_AGENT_OVERVIEW_FILTER_SHORTCUTS).toEqual([
			{ filter: "all", key: "1" },
			{ filter: "active", key: "2" },
			{ filter: "unread", key: "3" },
			{ filter: "pinned", key: "4" },
			{ filter: "hidden", key: "5" },
			{ filter: "finished", key: "6" },
		]);
		expect(nativeAgentOverviewFilterFromKey("1")).toBe("all");
		expect(nativeAgentOverviewFilterFromKey("2")).toBe("active");
		expect(nativeAgentOverviewFilterFromKey("3")).toBe("unread");
		expect(nativeAgentOverviewFilterFromKey("4")).toBe("pinned");
		expect(nativeAgentOverviewFilterFromKey("5")).toBe("hidden");
		expect(nativeAgentOverviewFilterFromKey("6")).toBe("finished");
		expect(nativeAgentOverviewFilterFromKey("7")).toBeNull();
		expect(nativeAgentOverviewFilterShortcutKey("hidden")).toBe("5");
		expect(nativeAgentOverviewFilterShortcutKey("finished")).toBe("6");
	});

	it("maps unread vim action keys", () => {
		expect(nativeAgentUnreadVimActionFromKey("u")).toBe("open-unread");
		expect(nativeAgentUnreadVimActionFromKey("U")).toBe("mark-latest-read");
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
		expect(nativeAgentSplitPaneActionFromKey("q")).toBe("close");
		expect(nativeAgentSplitPaneActionFromKey("w")).toBe("swap");
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
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "Home" }))).toBe(
			"home",
		);
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "End" }))).toBe("end");
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "1" }))).toBe("1");
		expect(nativeAgentPlainNavigationKey(keyEvent({ key: "6" }))).toBe("6");
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
