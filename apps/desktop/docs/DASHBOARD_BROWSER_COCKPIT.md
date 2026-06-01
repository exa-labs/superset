# Dashboard Browser Cockpit

This document is the operating guide for Clankee's retained dashboard browser
surface. It exists because the browser cockpit spans sidebar routing, internal
browser tabs, Electron `webview` lifecycle, persistent Chromium profiles, and
command-palette shortcuts. Changes in any of those areas can accidentally
reload or detach a live browser session.

## Core Invariant

Switching between dashboard web pages, browser-backed Capy/Devin sessions,
internal horizontal browser tabs, command-palette targets, settings routes, or
split view must not reload an existing live `webview` unless the user explicitly
presses reload or a sleeping tab is intentionally restored.

The authoritative proof is:

```bash
bun run --cwd apps/desktop smoke:dashboard-browser
```

The smoke must report stable `webContentsId` and unchanged `loadCount` across
sidebar switches, internal browser-tab switches, command-palette activation,
leaving/returning from settings, split view, and in-page URL changes.

The desktop dev command starts Electron with `RENDERER_REMOTE_DEBUG_PORT=9222`
so the smoke can attach through CDP. If an Electron dev process was already
running before that environment was applied, restart `bun run dev` first.

## Ownership

- `DashboardWebViewDeck` owns top-level retained browser targets.
- `DashboardWebView` owns the internal horizontal browser tabs for one retained
  top-level target.
- `DashboardBrowserWebView` owns one mounted Electron `webview`.
- `dashboard-web-tabs.ts` persists top-level custom browser tabs, folders,
  pinned state, titles, favicons, and exact current URLs.
- `DashboardWebView` persists internal tab state under
  `dashboard-browser-tabs-v1:<top-level-tab-id>`.
- `dashboard-browser-diagnostics.ts` is the runtime source of truth for switch
  latency, load count, reload count, webContents id, warm/sleeping state, and
  recent lifecycle events.

## Retention Rules

Top-level browser targets:

- Active entries stay mounted.
- Pinned entries stay retained beyond the keepalive TTL.
- Inactive unpinned entries stay warm until
  `DASHBOARD_WEB_VIEW_KEEPALIVE_TTL_MS`.
- Inactive entries inside collapsed folders sleep immediately.
- Missing/deleted targets are dropped.

Internal browser tabs:

- Active and split-peer tabs stay mounted.
- Previously active tabs stay warm until
  `DASHBOARD_BROWSER_TAB_KEEPALIVE_TTL_MS`.
- Closed tabs must remove diagnostics and unmount their `webview`.

## Persistent Profile

Dashboard browser webviews must use `DESKTOP_BROWSER_PARTITION`, currently
`persist:superset`, to keep OAuth sessions, cookies, IndexedDB, service workers,
and the pre-rebrand Superset profile intact.

The Clankee rebrand must continue to reuse the legacy Superset `userData` path
when it exists. Do not change the partition or userData profile as part of UI
work unless the cookie restart smoke passes afterward:

```bash
bun run --cwd apps/desktop smoke:dashboard-browser:cookies
```

That smoke intentionally restarts the desktop process, so run it when you can
let the dev Electron process be managed by the script.

## Lifecycle Safety Rules

- Never call `getWebContentsId`, navigation, history, or execute-JS methods
  until the `webview` is attached and `dom-ready` has fired, or catch and record
  a `register-deferred` diagnostic.
- Do not set React `key`s from URLs. Keys must be stable tab ids/cache keys.
- Do not conditionally render the deck inside dashboard-only route contents.
  The authenticated layout owns the deck so browser instances survive route
  changes.
- Do not replace a stored current URL with a prettier URL. Persist the exact
  URL from `did-navigate`/`did-navigate-in-page`.
- Do not use `isLoading` or route transition state as a reason to blank or
  remount a retained `webview`.
- Crashes, failed loads, title updates, favicon updates, and auth redirects
  should update diagnostics/state, not recreate React owners.

## Paths That Must Stay Covered

The main smoke covers:

- Sidebar/browser group switch: Devin -> Capy -> Devin.
- Option+D from a focused guest `webview`.
- Leaving dashboard for settings and returning to the browser route.
- In-page URL change via `history.pushState`, including exact localStorage
  persistence and no new load.
- Internal horizontal browser tab creation, switching, split view, and close.
- Command palette navigation to Capy and Devin browser tabs.
- Collapsed-folder sleeping and restore.
- Option+K from both the host renderer and a focused guest `webview`.
- Diagnostics presence for memory pressure, switch count, and switch latency.

When adding a new route, sidebar action, keyboard shortcut, folder action, or
browser tab state mutation, either keep it inside one of those paths or extend
the smoke with the new path.

## Fast Manual Checks

In the renderer DevTools console:

```js
window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.()
```

For a retained tab, inspect:

- `webContentsId`
- `loadCount`
- `reloadRequestCount`
- `renderGoneCount`
- `lastActivatedAt`
- `retentionState`
- deck `lastSwitchLatencyMs`

Switching tabs should change `lastActivatedAt` and switch latency, but not
`webContentsId` or `loadCount`.
