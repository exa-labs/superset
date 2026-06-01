# Local Auth and Native Agents Runbook

This runbook exists because the desktop app can look broken when only the
Electron renderer is running. The authenticated shell needs the local API,
web app, Electric proxy, and desktop process to agree on the same `.env`
port allocation.

## Start the correct graph

Use the root dev command unless you have a very specific reason not to:

```bash
bun run dev
```

Do not start only `apps/desktop` when testing auth, workspace lists, Electric
collections, native Devin/Capy, or embedded browser routes. Desktop-only
startup leaves the renderer pointing at `NEXT_PUBLIC_API_URL` without an API
server, which shows up as `TypeError: Failed to fetch` in `AuthProvider`.

Expected local endpoints for this worktree are read from `.env`:

- API: `NEXT_PUBLIC_API_URL`, currently `http://localhost:3021`
- Web: `NEXT_PUBLIC_WEB_URL`, currently `http://localhost:3020`
- Desktop renderer: `NEXT_PUBLIC_DESKTOP_URL`, currently `http://localhost:3025`
- Electric proxy: `NEXT_PUBLIC_ELECTRIC_URL`, currently `http://localhost:3032`

## Auth health checklist

Before debugging downstream UI:

1. Confirm the API process is listening on `.env`'s `API_PORT`.
2. Confirm the desktop renderer was built with the same `NEXT_PUBLIC_API_URL`.
3. Open the desktop app and use `Sign in as Local Admin (dev)` if needed.
4. Watch for `[AuthProvider] JWT refresh failed TypeError: Failed to fetch`.
   This usually means the API is not running, not that Devin/Capy/browser code
   is broken.
5. Only continue to browser/native-agent debugging after the authenticated
   layout renders.

Useful checks:

```bash
curl -I http://localhost:3021/api/auth/get-session
ps -axo pid,ppid,command | rg "next dev|electron-vite|wrangler"
```

## Native agent credentials

Native Capy and Devin credentials belong in the encrypted local credential
store under `SUPERSET_HOME_DIR`, not in source files or `.env`.

The credential file is:

```text
superset-dev-data/native-agent-credentials.enc
```

Use `saveNativeAgentCredentials` from `apps/desktop/src/main/lib/native-agents`
to write credentials. Do not print API keys in logs or final answers.

Current expected native-agent setup:

- Capy API key: stored locally, source reports `stored`
- Devin API key: stored locally, source reports `stored`
- Devin API flavor: `v1`
- Devin user email filter: `lakee@exa.ai`
- Capy project: `a275b1f7-318b-49ed-b2c8-5bb31ca7cd97`

Provider smoke checks should print only redacted status and sample ids/titles:

```bash
SUPERSET_HOME_DIR="$PWD/superset-dev-data" bun --conditions=electron - <<'EOF'
const {
  CapyClient,
  DevinClient,
  getEffectiveNativeAgentCredentials,
  getNativeAgentCredentialStatus,
} = await import("./apps/desktop/src/main/lib/native-agents/index.ts");

const status = await getNativeAgentCredentialStatus();
const credentials = await getEffectiveNativeAgentCredentials();
console.log(JSON.stringify(status, null, 2));

if (credentials.devinApiKey) {
  const devin = new DevinClient({
    flavor: credentials.devinApiFlavor,
    orgId: credentials.devinOrgId,
    token: credentials.devinApiKey,
  });
  const sessions = await devin.listSessions({
    limit: 5,
    userEmail: credentials.devinUserEmail,
  });
  console.log(
    JSON.stringify(
      sessions.items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        email: item.requestingUserEmail,
      })),
      null,
      2,
    ),
  );
}

if (credentials.capyApiKey) {
  const capy = new CapyClient(credentials.capyApiKey);
  const projects = await capy.listProjects({ limit: 5 });
  console.log(
    JSON.stringify(
      projects.items.map((item) => ({ id: item.id, name: item.name })),
      null,
      2,
    ),
  );
}
EOF
```

## Native Devin/Capy UI rules

- Devin lists must use `mineOnly` with the stored Devin user email.
- Devin sessions created in Devin UI, Slack, or Clankee should appear as long
  as the API attributes them to the stored email.
- Capy should fail closed for ownership if the API does not return creator or
  owner metadata. Locally created or pinned Capy threads may still be shown.
- Do not reintroduce nested sidebars inside the native chat view. Session lists
  belong in the main left sidebar and provider workspace views.

## Embedded browser checks

Before working on browser reload/performance bugs:

1. Start the full dev graph with `bun run dev`.
2. Confirm the authenticated desktop shell renders.
3. Use the dashboard browser diagnostics handle:

```js
window.__CLANKEE_DASHBOARD_BROWSER_DIAGNOSTICS__?.getSnapshot?.()
```

The checks that matter are `webContentsId`, `mountCount`, `domReadyCount`,
`loadCount`, `reloadRequestCount`, retained deck entries, and slept entries.
Switching sidebar tabs or internal browser tabs should not increase load counts
unless the user explicitly reloads or a sleeping tab is intentionally restored.
