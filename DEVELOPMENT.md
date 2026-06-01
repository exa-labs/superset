# Developing Superset

This guide is for contributors building Superset from source. If you just want to use Superset, [download the macOS app](https://github.com/superset-sh/superset/releases/latest) instead.

## Prerequisites

| Tool | Install |
|:-----|:--------|
| [Bun](https://bun.sh/) (v1.0+) | `curl -fsSL https://bun.sh/install \| bash` |
| [Docker](https://docs.docker.com/get-docker/) | Docker Desktop or OrbStack |
| `jq` | `brew install jq` |
| [Caddy](https://caddyserver.com/docs/install) (optional) | `brew install caddy` (`caddy trust` is only needed for HTTPS proxy testing) |
| Git 2.20+ and [`gh`](https://cli.github.com/) | `brew install gh` |

macOS is the primary supported platform. Windows / Linux are untested.

## Run it (one command)

```bash
git clone https://github.com/superset-sh/superset.git
cd superset
./.superset/setup.local.sh
bun run dev
```

That's it. **You do not need a Neon account, Stripe keys, or any other third-party credentials** — `.env.local.example` ships fake placeholders that pass env validation, and `setup.local.sh` runs everything against a local Docker stack.

## Optional: Nix/devenv workflow

This repo also ships a `devenv.nix` shell for contributors who want the local toolchain carried by the checkout instead of installed globally. It provides Bun, Node 22, Caddy, jq, gh, psql, sqlite, Docker CLI/Compose, and helper scripts that wrap the normal Superset workflow.

```bash
# If devenv is already installed:
devenv shell

# Or without installing devenv globally:
nix run nixpkgs#devenv -- shell

superset-setup
superset-dev
```

You can also run `devenv up` after `superset-setup` to start the dev graph under devenv's process manager. For automatic shell activation with direnv, copy `.envrc.example` to `.envrc`, then run `direnv allow`.

Useful scripts inside the devenv shell:

```bash
superset-doctor        # print tool versions, Docker state, and allocated ports
superset-setup         # run ./.superset/setup.local.sh
superset-dev           # run bun run dev
superset-down          # stop and remove this workspace's local DB stack
superset-reset         # superset-down, then superset-setup
superset-trust-caddy   # optional: trust Caddy's local CA for HTTPS proxy testing
superset-use-integrations-url https://your-tunnel.example
superset-clear-integrations-url
```

### What `setup.local.sh` does

1. Copies `.env.local.example` → `.env`
2. Allocates a per-workspace port range so multiple worktrees don't collide
3. Brings up Postgres + neon-proxy + Electric via `docker compose` (project-scoped to this worktree)
4. Runs `bun install` and `bun run db:migrate`
5. Seeds a `Local Admin` dev account via `bun run db:seed-dev`
6. Writes a gitignored `.superset/config.local.json` overlay so subsequent worktrees automatically use this setup

Re-run the script any time to refresh the workspace. To tear the local DB stack down:

```bash
./.superset/teardown.local.sh
```

### Signing in

After `bun run dev`, open the web app and click the **"Sign in as dev"** button on the sign-in page (also available in the desktop sign-in screen). Or use the credentials directly:

- Email: `admin@local.test`
- Password: `supersetdev`

The dev sign-in button and email/password auth are gated on `NODE_ENV=development` — they don't ship in production.

## Manual setup (advanced)

If you need to point at real Neon / third-party services instead of the local Docker stack:

```bash
cp .env.example .env             # fill in real Neon, Stripe, etc. credentials
cp Caddyfile.example Caddyfile   # HTTPS reverse proxy for Electric streams
bun install
bun run dev
```

The default local setup sends browser and desktop Electric traffic through the Wrangler HTTP proxy. To test the optional Caddy HTTPS/HTTP2 Electric proxy, run `superset-trust-caddy` or `caddy trust`, run `bun run dev:caddy`, then point `NEXT_PUBLIC_ELECTRIC_URL` and `NEXT_PUBLIC_ELECTRIC_PROXY_URL` at `https://localhost:$CADDY_ELECTRIC_PORT`.

## Real integrations in local development

The default `.env` uses fake provider credentials so the app boots without third-party accounts. To test real Linear, GitHub, or Slack integrations, create developer-owned provider apps and put their credentials in `.env`.

Keep `NEXT_PUBLIC_API_URL` on the allocated localhost API, for example `http://localhost:$API_PORT`. If a provider needs to call back into your local API over public HTTPS, start a tunnel to the API port and set:

```bash
INTEGRATIONS_PUBLIC_API_URL=https://your-tunnel.example
```

OAuth callback and webhook URLs then use `INTEGRATIONS_PUBLIC_API_URL`, while the web and desktop apps keep using the faster local API URL.
Inside the devenv shell, `superset-use-integrations-url <url>` appends this value to `.env` and prints the provider URLs; `superset-clear-integrations-url` clears it.

Provider URLs:

- Linear OAuth callback: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/linear/callback`
- Linear webhook: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/linear/webhook`
- GitHub App setup URL: `$INTEGRATIONS_PUBLIC_API_URL/api/github/callback`
- GitHub App webhook: `$INTEGRATIONS_PUBLIC_API_URL/api/github/webhook`
- Slack OAuth redirect URL: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/slack/callback`
- Slack event request URL: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/slack/events`
- Slack interactivity request URL: `$INTEGRATIONS_PUBLIC_API_URL/api/integrations/slack/interactions`

Required env values:

- Linear: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_WEBHOOK_SECRET`
- GitHub: `GH_APP_ID`, `GH_APP_PRIVATE_KEY`, `GH_APP_SLUG`, `GH_WEBHOOK_SECRET`
- Slack: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`

After changing provider credentials or `INTEGRATIONS_PUBLIC_API_URL`, restart `bun run dev` so the API process reloads env.
For provider-specific setup details, see [`apps/api/docs/local-integrations.md`](./apps/api/docs/local-integrations.md).

## Building the desktop app

```bash
bun run build
open apps/desktop/release
```

## Common commands

```bash
bun dev                # Start all dev servers
bun test               # Run tests
bun run lint:fix       # Fix lint + format
bun run typecheck      # Type-check all packages
bun run build          # Build all packages
```

See [`AGENTS.md`](./AGENTS.md) for repo structure, monorepo conventions, and database/migration workflow.

## Troubleshooting

- **Testing the Caddy HTTPS Electric proxy** — run `superset-trust-caddy` or `caddy trust` first. Without trusting Caddy's local CA, Chromium rejects `https://localhost:*` with `ERR_CERT_AUTHORITY_INVALID`. The default local setup uses the HTTP Wrangler proxy to avoid this trust prompt.
- **Port collision** — `setup.local.sh` allocates a fresh port window per worktree. If you ran the script before this change landed, re-run it to migrate.
- **DB connection errors after pulling main** — re-run `./.superset/setup.local.sh`; it's idempotent and will apply any new migrations.
- **Stuck Docker stack** — `./.superset/teardown.local.sh` then re-run setup.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the PR process and code-of-conduct expectations.
