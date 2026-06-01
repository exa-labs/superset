# Clankee Local Development and Integration Iteration Plan

## Goal

Make Clankee pleasant to develop locally as a real desktop/web product, with a stable one-command core loop, an explicit second mode for testing real external integrations such as Linear, GitHub, and Slack, and a native agent cockpit for Capy and Devin.

The core loop should work with no third-party credentials. The integration loop should work with developer-owned OAuth apps/webhook apps, never production credentials. The native agent loop should work with locally stored API keys while preserving the retained browser tabs as a fallback.

## Current Baseline

This branch establishes the local core loop:

- `devenv.nix` provides Bun, Node 22, Caddy, Docker CLI, jq, gh, psql, sqlite, and helper scripts.
- `superset-setup` provisions a per-workspace local stack using Docker Postgres, neon-proxy, Electric, seeded auth data, and generated ports.
- `superset-dev` starts API, web, desktop, and the Wrangler Electric proxy.
- Caddy is now optional. The default local Electric path uses the Wrangler HTTP proxy so Chromium/Electron does not need a trusted Caddy CA.
- The port allocator skips already-listening ranges, so multiple worktrees and unrelated local services do not collide.
- The desktop host service starts for the active organization even if the synced organizations collection has not hydrated yet.
- Next/Turbopack can resolve `@swc/helpers` under Bun's symlink layout because it is now a direct repo dependency.

The current local project is using base port `3020`:

- Web: `http://localhost:3020`
- API: `http://localhost:3021`
- Desktop renderer: `http://localhost:3025`
- Electric: `http://localhost:3029`
- Electric proxy: `http://localhost:3032`
- Postgres: `localhost:3034`

## Operating Modes

### 1. Offline Core Mode

Purpose: daily Clankee product development without external services.

Expected behavior:

- Dev sign-in works with `admin@local.test` / `supersetdev`.
- Desktop launches and owns a workspace-specific app state directory.
- Host service starts for the active organization.
- Repo import creates project/workspace rows locally.
- Electric sync hydrates desktop/web collections.
- Integration pages render, but provider connect buttons report that local credentials are not configured.

This mode uses fake OAuth, Slack, GitHub App, QStash, Stripe, PostHog, and AI provider values only to satisfy env validation.

### 2. Real Integration Mode

Purpose: test Linear, GitHub App, and Slack flows end to end against developer-owned provider apps.

Expected behavior:

- `.env` contains real provider app credentials.
- Provider callback URLs point at the local API through `INTEGRATIONS_PUBLIC_API_URL`.
- Initial sync runs locally without QStash.
- Webhook handlers can be reached by the provider through the same tunnel.
- Synced data lands in local Postgres and then Electric/TanStack collections.

### 3. Production-Like Queue Mode

Purpose: test QStash signatures, retry behavior, and deployed webhook semantics.

Expected behavior:

- QStash credentials are real.
- Queue-triggered job endpoints require valid Upstash signatures.
- The API must be available at a public URL.

This should be opt-in. It is not necessary for normal local development.

### 4. Native Agent Mode

Purpose: test first-class Capy and Devin integrations inside the desktop app without relying on embedded browser tabs for every action.

Expected behavior:

- API keys are stored only in local desktop app data or a main-process secret store.
- Renderer code can check credential status, but cannot read raw API keys.
- Capy Native can list projects/threads/tasks, create threads/tasks, show messages, send messages, and stop active work.
- Devin Native can list sessions, create sessions, show session detail/messages, and send follow-up messages.
- Existing browser-backed Capy and Devin tabs keep working and remain the fallback for unsupported provider features.
- Native polling and cached list refreshes do not trigger browser webview reloads.

This is now part of the main local development plan, not a follow-up idea. Browser-backed Capy/Devin remains the reliable escape hatch, while `Capy Native` and `Devin Native` become the fast daily-driver surfaces.

## Integration Requirements

### Linear

Required local env:

- `LINEAR_CLIENT_ID`
- `LINEAR_CLIENT_SECRET`
- `LINEAR_WEBHOOK_SECRET`
- `INTEGRATIONS_PUBLIC_API_URL`
- `NEXT_PUBLIC_WEB_URL`

Provider URLs:

- OAuth callback: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/linear/callback`
- Webhook: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/linear/webhook`

Local behavior to preserve:

- In development, the callback should call `/api/integrations/linear/jobs/initial-sync` directly instead of publishing to QStash.
- Webhook signature verification should stay real; developers should copy the provider webhook secret into `.env`.

### GitHub

Required local env:

- `GH_APP_ID`
- `GH_APP_PRIVATE_KEY`
- `GH_APP_SLUG`
- `GH_WEBHOOK_SECRET`
- `INTEGRATIONS_PUBLIC_API_URL`
- `NEXT_PUBLIC_WEB_URL`

Provider URLs:

- Setup callback: `$INTEGRATIONS_PUBLIC_API_URL/api/github/callback`
- Webhook: `$INTEGRATIONS_PUBLIC_API_URL/api/github/webhook`

Local behavior to preserve:

- GitHub install URLs must use `GH_APP_SLUG`, not the production app slug.
- In development, the callback should call `/api/github/jobs/initial-sync` directly instead of publishing to QStash.

### Slack

Required local env:

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `INTEGRATIONS_PUBLIC_API_URL`
- `NEXT_PUBLIC_WEB_URL`

Provider URLs:

- OAuth callback: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/slack/callback`
- Events: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/slack/events`
- Interactions: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/slack/interactions`

Local behavior still needed:

- Slack event processing currently publishes async jobs through QStash. Add the same development local-dispatch path used for GitHub/Linear initial sync.
- Generate a local Slack manifest from env so callback/event/interaction URLs do not need manual editing.

### Native Capy and Devin

Detailed plan: `plans/20260531-native-capy-devin-cockpit.md`.

Required local config:

- `CLANKEE_CAPY_API_KEY`
- `CLANKEE_DEVIN_API_KEY`
- optional `CLANKEE_DEVIN_API_FLAVOR=v1|v3`
- optional `CLANKEE_DEVIN_ORG_ID` for Devin v3 service-user auth

Local behavior to add:

- Store keys through a main-process-only credentials path and redact them from logs/errors.
- Add desktop tRPC procedures for Capy/Devin list/create/message actions.
- Add `Capy Native` and `Devin Native` sidebar entries and Option+K actions.
- Keep browser-backed Capy/Devin entries intact and retained.
- Cache list/detail data so native views open instantly and refresh in the background.

## Implementation Plan

### Phase 1: Lock Down Core Dev

1. Keep `bun dev` free of mandatory Caddy/keychain prompts.
2. Keep Caddy as `bun run dev:caddy` for explicit HTTPS/HTTP2 Electric testing.
3. Keep `superset-trust-caddy` as an opt-in helper.
4. Add a `superset-smoke` script that verifies:
   - web responds with a redirect to sign-in,
   - API auth endpoint responds,
   - Wrangler proxy serves Electric shape requests,
   - renderer cache has organization/project/workspace/host rows after desktop starts,
   - host service health is OK for the active organization.

### Phase 2: Make Integration Configuration Explicit

1. Add `.env.integrations.local.example` with only real-provider fields and callback URL notes.
2. Add `superset-integration-doctor`:
   - detects fake provider values,
   - validates private key shape for GitHub App,
   - prints required provider callback/webhook URLs,
   - checks whether `INTEGRATIONS_PUBLIC_API_URL` is localhost or public,
   - verifies tunnel reachability with a lightweight health endpoint.
3. Add a route-level “not configured” response for every connect flow before redirecting to providers.
4. Add a small UI state on integration pages showing whether credentials are configured in this local API process.

### Phase 3: Add a Local Job Dispatcher

1. Create a shared helper for queueable jobs:
   - production: publish to QStash,
   - development: POST directly to the target route.
2. Use it for:
   - GitHub initial sync,
   - Linear initial sync,
   - Slack mention processing,
   - Slack assistant message processing,
   - automation dispatch paths where local iteration matters.
3. Keep QStash signature checks enabled outside development.

### Phase 4: Provider App Setup Workflow

1. Document a recommended tunnel workflow. The scripts should accept a user-provided public URL rather than baking in a specific tunnel vendor.
2. Add `superset-use-integrations-url <url>` to update `INTEGRATIONS_PUBLIC_API_URL` without changing localhost app API traffic.
3. Add `superset-clear-integrations-url` to switch callback/webhook URLs back to the allocated localhost API port.
4. Add a generated Slack manifest command:
   - input: current `.env`,
   - output: `superset-dev-data/slack-manifest.local.json`,
   - substitutes callback/event/interaction URLs from `INTEGRATIONS_PUBLIC_API_URL`.

### Phase 5: Smoke Tests for Integrations

Add smoke scripts that can run with real dev credentials:

- Linear:
  - connect OAuth,
  - sync teams/statuses,
  - create a local task and verify Linear propagation,
  - receive a webhook fixture and verify idempotency.
- GitHub:
  - install app,
  - sync repositories and recent pull requests,
  - receive repository/PR webhook fixtures,
  - verify disconnect behavior.
- Slack:
  - install app,
  - verify event signature,
  - process a mention using the local job dispatcher,
  - verify interactions route.

These should be opt-in and skipped when provider credentials are fake.

### Phase 6: Native Agent Cockpit

1. Add local secret storage and credential status UI for Capy and Devin.
2. Add main-process Capy and Devin API clients with typed response normalization.
3. Add `nativeAgents` tRPC procedures for list/create/message/stop flows.
4. Add native desktop routes for Capy and Devin with dense split-pane UI.
5. Add sidebar entries and Option+K actions:
   - Go to Capy Native
   - Create Capy thread/task
   - Go to Devin Native
   - Create Devin session
6. Add cached list/detail stores so native views open instantly and refresh in the background.
7. Add smoke checks proving native Capy/Devin works without regressing retained browser sessions.

## Developer Workflow

Core product work:

```bash
nix run nixpkgs#devenv -- shell
superset-setup
superset-dev
```

Integration work:

```bash
nix run nixpkgs#devenv -- shell
superset-setup
# start your preferred public tunnel to localhost:$API_PORT
superset-use-integrations-url https://your-tunnel.example
# fill .env with developer-owned Linear/GitHub/Slack credentials
superset-integration-doctor
superset-dev
```

Back to core mode:

```bash
superset-clear-integrations-url
superset-dev
```

## Verification Matrix

Required before merging dev-environment changes:

- `superset-doctor`
- `bun run lint`
- `bun run --cwd apps/desktop tsc --noEmit`
- `curl -I http://localhost:$WEB_PORT`
- `curl http://localhost:$API_PORT/api/auth/get-session`
- `curl -I http://localhost:$WRANGLER_PORT/v1/shape`
- renderer cache row-count check for organizations, v2 projects, v2 workspaces, and v2 hosts
- host service health check for the active local organization

Required before claiming real integration support:

- `superset-integration-doctor` passes
- one successful OAuth callback per provider
- one successful sync per provider
- one webhook/event fixture per provider

Required before claiming native Capy/Devin support:

- credential save/status/delete flow works without exposing raw tokens to renderer
- Capy project/thread/task list succeeds with local credentials
- Capy create/send/stop flow succeeds or returns a provider error with retry
- Devin session list succeeds with local credentials
- Devin create/send flow succeeds or returns a provider error with retry
- browser-backed Capy/Devin webviews still retain URL/cookies and do not reload on native route switches

## Open Decisions

- Pick a default tunnel recommendation for docs, or stay vendor-neutral and only require a public URL.
- Decide whether fake local integration credentials should show disabled connect buttons or enabled buttons that redirect to a clear “not configured” toast.
- Decide whether integration smoke tests should be shell scripts, Playwright flows, or API-level scripts with copied cookies.
- Decide whether Caddy should stay in the default toolchain if it is now optional for the normal dev graph.
- Decide whether Devin Native should ship v1-only first, or include v3 support in the same milestone behind credential flavor detection.
