# Native Capy and Devin Cockpit Plan

## Context

Clankee currently embeds Capy and Devin as retained browser sessions. Keep that browser path intact, but add first-class native surfaces:

- **Capy Native**: list projects, list threads/tasks, create/start a thread, view messages, send messages, stop threads/tasks, manage tags where useful.
- **Devin Native**: list Devin sessions, create sessions, view session details/output/messages where available, send messages, terminate sessions.

API credentials must stay local to this machine and must not be committed, bundled into renderer code, or written to repo-tracked files.

This is additive. The existing browser-backed Capy and Devin tabs remain available as the escape hatch for anything the native APIs do not expose yet.

## API Surfaces

### Capy

- Base URL: `https://capy.ai/api/v1`
- Auth: `Authorization: Bearer <capy token>`
- Core endpoints:
  - `GET /projects`
  - `GET /projects/{projectId}`
  - `GET /threads?projectId=...`
  - `GET /threads/{threadId}`
  - `POST /threads`
  - `GET /threads/{threadId}/messages`
  - `POST /threads/{threadId}/message`
  - `POST /threads/{threadId}/stop`
  - `GET /tasks`
  - `GET /tasks/{taskId}`
  - `POST /tasks`
  - `POST /tasks/{taskId}/message`
  - `POST /tasks/{taskId}/start`
  - `POST /tasks/{taskId}/stop`
  - `GET /tags`
  - `PUT /threads/{threadId}/tags`

Capy list endpoints are cursor-paginated. The client should normalize `items`, `nextCursor`, and `hasMore` into one shared pagination shape for the renderer.

### Devin

- First implementation target: legacy v1 API at `https://api.devin.ai/v1`, because the current local key shape is a legacy personal key.
- Migration target: current organization API at `https://api.devin.ai/v3/organizations/{orgId}` once a service-user token and org id are configured.
- Auth: `Authorization: Bearer <devin token>`
- v1 core endpoints:
  - `GET /sessions`
  - `POST /sessions`
  - `GET /sessions/{session_id}`
  - `POST /sessions/{session_id}/message`
  - file upload and tag update endpoints if needed by the UI

The Devin client should be an adapter, not hardcoded directly into renderer-facing procedures:

- `DevinLegacyV1Client` supports `apk_user_*` / `apk_*` keys and flat `/v1` routes.
- `DevinOrganizationV3Client` supports `cog_*` service-user tokens and org-scoped `/v3/organizations/{orgId}` routes.
- The renderer only sees normalized sessions, messages, create inputs, and status values.

## Local Secret Handling

Do not store the provided tokens in the repo, examples, localStorage, renderer state dumps, screenshots, or command-palette history.

Implementation options, in order:

1. Use an existing Electron main-process secret/settings store if one already exists.
2. Otherwise store encrypted secret records below `app.getPath("userData")`, with Electron `safeStorage` when available.
3. Allow bootstrap from local-only environment variables:
   - `CLANKEE_CAPY_API_KEY`
   - `CLANKEE_DEVIN_API_KEY`
   - optional `CLANKEE_DEVIN_API_FLAVOR=v1|v3`
   - optional `CLANKEE_DEVIN_ORG_ID` for v3
4. Renderer can test whether a credential exists, but cannot read the raw value.
5. Main-process logs and tRPC errors must redact bearer tokens and token-like substrings.

## Architecture

1. Add main-process API clients under `apps/desktop/src/main/lib/native-agents/`.
   - `capy-client.ts`
   - `devin-client.ts`
   - shared HTTP helper with timeout, JSON parsing, redacted errors, and typed error result.

2. Store API keys in local desktop app data, not the repo.
   - Use Electron `app.getPath("userData")` or existing local settings storage.
   - Add migration/seed path for the locally provided keys without exposing them to renderer bundles.
   - Renderer can only call tRPC procedures; it cannot read raw tokens.

3. Add tRPC router namespace, for example `nativeAgents`.
   - `credentials.getStatus`
   - `credentials.save`
   - `credentials.delete`
   - `capy.listProjects`
   - `capy.getProject`
   - `capy.listThreads`
   - `capy.getThread`
   - `capy.createThread`
   - `capy.listMessages`
   - `capy.sendMessage`
   - `capy.stopThread`
   - `capy.listTasks`
   - `capy.createTask`
   - `capy.sendTaskMessage`
   - `capy.stopTask`
   - `devin.listSessions`
   - `devin.createSession`
   - `devin.getSession`
   - `devin.sendMessage`
   - `devin.updateTags`

4. Add dashboard routes and retained native state.
   - `/native/capy`
   - `/native/devin`
   - Use React Query with short polling only for active sessions/threads.
   - Keep selected project/session/thread, list filters, and draft prompts in localStorage.
   - Do not poll inactive routes aggressively.
   - Preserve current browser webviews in the retained webview deck while native routes are open.

5. Add sidebar entries without removing browser entries.
   - Existing `Capy` and `Devin` remain browser-backed.
   - New `Capy Native` and `Devin Native` appear as separate sidebar items.
   - Command palette actions:
     - Go to Capy Native
     - Create Capy thread
     - Go to Devin Native
     - Create Devin session

6. Native UI requirements.
   - Dense split layout: list on left, messages/details on right.
   - Create modal/drawer with prompt, title/tags, project selection, repo/branch where supported.
   - Message composer with optimistic pending state.
   - Status pills for running/waiting/blocked/finished/archived.
   - External-link action to open the original Capy/Devin browser page.

7. Native data model.
   - `NativeAgentProvider = "capy" | "devin"`
   - `NativeAgentThread`: provider, id, title, status, url, project id, tags, created/updated timestamps.
   - `NativeAgentMessage`: provider, thread/session id, external id, role, body, created timestamp, attachments.
   - `NativeAgentDraft`: provider, target id, prompt, metadata, local updated timestamp.
   - Normalize provider-specific status values before they hit the UI.

8. Performance expectations.
   - Native lists should render cached data immediately, then refresh in the background.
   - Active sessions poll on a short interval; inactive sessions refresh on focus/selection.
   - Creating/sending messages uses optimistic pending state.
   - Native polling must not cause browser-backed Capy/Devin tabs to reload or remount.

## Work Breakdown

### Slice 1: Credentials and Connectivity

- Add local credential save/status/delete flows for Capy and Devin.
- Bootstrap from `CLANKEE_CAPY_API_KEY` and `CLANKEE_DEVIN_API_KEY` only in the main process.
- Prove renderer code never receives raw tokens.
- Add redaction tests for request failures and logged provider errors.

### Slice 2: Capy Native MVP

- List Capy projects and persist the selected project locally.
- List threads/tasks for the selected project with cached-first rendering.
- Open a thread/task detail view with messages.
- Create a new thread/task from the command palette and sidebar action.
- Send follow-up messages and stop active work.
- Include an external-link action back to the browser-backed Capy page.

### Slice 3: Devin Native MVP

- List Devin sessions with status, title, updated time, and original URL.
- Open a session detail view with messages/output available from the API.
- Create a new Devin session from the command palette and sidebar action.
- Send follow-up messages to an existing session.
- Support the current v1 personal-key path first, with the v3 organization client behind credential flavor detection.
- Include an external-link action back to the browser-backed Devin page.

### Slice 4: Cockpit UX Integration

- Add `Capy Native` and `Devin Native` sidebar entries below the browser-backed Capy/Devin groups.
- Add Option+K actions for going to native views and creating new native sessions.
- Keep native views dense: list/filter column, detail/messages column, composer, status controls.
- Preserve browser-backed Capy/Devin webviews while native views are open.

### Slice 5: Reliability and Speed

- Cache native list/detail state so route switches are instant.
- Poll only active running sessions/threads; refresh inactive items on focus or selection.
- Add retryable error states for provider failures.
- Add smoke coverage that native polling does not reload or remount retained browser tabs.

## Safety

- Never log bearer tokens.
- Redact token-like strings from errors.
- Keep network failures visible in the UI with retry actions.
- Do not remove or degrade the embedded browser feature.
- Do not create sessions on initial load; creation must be explicit user action.

## Verification

- Unit tests for URL construction, auth header insertion, redacted error handling, and response normalization.
- Unit tests for Devin v1/v3 adapter selection.
- Renderer tests for native command palette actions and route state where practical.
- Main-process tests that renderer procedures never expose raw tokens.
- Manual/dev smoke:
  - save credential and confirm status without revealing token
  - list Capy projects
  - list Capy threads for a selected project
  - create Capy thread and send follow-up message
  - list Devin sessions
  - create Devin session and send follow-up message
  - create flow opens confirmation and does not fire accidentally
  - browser Capy/Devin sessions still work and still retain webviews without reloads

## Milestones

1. Main-process clients and local secret storage.
2. tRPC procedures with tests and redacted errors.
3. Capy Native MVP: projects, threads, messages, create/send.
4. Devin Native MVP: sessions, details, create/send.
5. Sidebar and command palette integration.
6. Browser fallback links and non-regression checks.
7. Runtime smoke and polish.

## References

- Capy API reference: https://docs.capy.ai/api-reference/overview
- Devin legacy v1 API overview: https://docs.devin.ai/api-reference/v1/overview
- Devin current teams quickstart / v3 API: https://docs.devin.ai/api-reference/getting-started/teams-quickstart
