{ pkgs, ... }:

let
  devTools = import ./nix/dev-tools.nix { inherit pkgs; };
  dockerUnavailableMessage = ''
    Docker is not reachable. Start Docker Desktop or OrbStack, then rerun this command.
  '';
in
{
  packages = devTools;

  env.NEXT_TELEMETRY_DISABLED = "1";
  dotenv.disableHint = true;

  scripts.superset-doctor = {
    description = "Check the local Superset development toolchain.";
    exec = ''
      set -euo pipefail

      echo "Superset dev doctor"
      echo "repo: $(pwd)"

      expected_bun="$(tr -d '[:space:]' < .bun-version 2>/dev/null || true)"
      actual_bun="$(bun --version)"
      if [ -n "$expected_bun" ]; then
        echo "bun: $actual_bun (.bun-version: $expected_bun)"
      else
        echo "bun: $actual_bun"
      fi

      echo "node: $(node --version)"
      echo "caddy: $(caddy version 2>/dev/null | head -n 1)"
      echo "jq: $(jq --version)"
      echo "gh: $(gh --version | head -n 1)"
      echo "psql: $(psql --version)"

      if docker info >/dev/null 2>&1; then
        echo "docker: $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo reachable)"
        echo "docker compose: $(docker compose version 2>/dev/null | head -n 1)"
      else
        echo "docker: unavailable"
        echo "${dockerUnavailableMessage}"
      fi

      if [ -f .env ]; then
        echo ".env: present"
        set -a
        # shellcheck disable=SC1091
        source .env
        set +a
        echo "NEXT_PUBLIC_API_URL: ''${NEXT_PUBLIC_API_URL:-unset}"
        echo "INTEGRATIONS_PUBLIC_API_URL: ''${INTEGRATIONS_PUBLIC_API_URL:-unset}"
      else
        echo ".env: missing; run superset-setup"
      fi

      if [ -f .superset/ports.json ]; then
        echo "ports:"
        jq -r '.ports[] | "  \(.label): \(.port)"' .superset/ports.json
      else
        echo "ports: unallocated; run superset-setup"
      fi
    '';
  };

  scripts.superset-setup = {
    description = "Provision the local Postgres, Electric, env, ports, deps, migrations, and dev account.";
    exec = ''
      set -euo pipefail

      if ! docker info >/dev/null 2>&1; then
        echo "${dockerUnavailableMessage}" >&2
        exit 1
      fi

      exec ./.superset/setup.local.sh "$@"
    '';
  };

  scripts.superset-dev = {
    description = "Start the Superset local development graph.";
    exec = ''
      set -euo pipefail

      if [ ! -f .env ]; then
        echo ".env is missing. Run superset-setup first." >&2
        exit 1
      fi

      exec bun run dev "$@"
    '';
  };

  scripts.superset-use-integrations-url = {
    description = "Set the public API URL used for OAuth callbacks and webhooks.";
    exec = ''
      set -euo pipefail

      if [ "$#" -ne 1 ]; then
        echo "Usage: superset-use-integrations-url https://your-tunnel.example" >&2
        exit 2
      fi

      if [ ! -f .env ]; then
        echo ".env is missing. Run superset-setup first." >&2
        exit 1
      fi

      public_url="$1"
      node -e '
        const value = process.argv[1];
        try {
          const url = new URL(value);
          if (url.protocol !== "https:" && url.protocol !== "http:") {
            throw new Error("URL must be http or https");
          }
        } catch (error) {
          console.error(`Invalid integration public API URL: ''${value}`);
          console.error(error.message);
          process.exit(1);
        }
      ' "$public_url"

      # shellcheck source=/dev/null
      source .superset/lib/common.sh
      {
        echo ""
        echo "# Integration callback/webhook URL (superset-use-integrations-url)"
        write_env_var "INTEGRATIONS_PUBLIC_API_URL" "$public_url"
      } >> .env

      echo "INTEGRATIONS_PUBLIC_API_URL set to $public_url"
      echo "Restart superset-dev after changing this value."
      echo ""
      echo "Linear callback: $public_url/api/integrations/linear/callback"
      echo "Linear webhook:  $public_url/api/integrations/linear/webhook"
      echo "GitHub setup:    $public_url/api/github/callback"
      echo "GitHub webhook:  $public_url/api/github/webhook"
      echo "Slack callback:  $public_url/api/integrations/slack/callback"
      echo "Slack events:    $public_url/api/integrations/slack/events"
      echo "Slack actions:   $public_url/api/integrations/slack/interactions"
    '';
  };

  scripts.superset-clear-integrations-url = {
    description = "Clear the public OAuth/webhook callback URL and fall back to NEXT_PUBLIC_API_URL.";
    exec = ''
      set -euo pipefail

      if [ ! -f .env ]; then
        echo ".env is missing. Run superset-setup first." >&2
        exit 1
      fi

      # shellcheck source=/dev/null
      source .superset/lib/common.sh
      {
        echo ""
        echo "# Integration callback/webhook URL (superset-clear-integrations-url)"
        write_env_var "INTEGRATIONS_PUBLIC_API_URL" ""
      } >> .env

      echo "INTEGRATIONS_PUBLIC_API_URL cleared."
      echo "Integration callbacks now fall back to NEXT_PUBLIC_API_URL."
      echo "Restart superset-dev after changing this value."
    '';
  };

  scripts.superset-reset = {
    description = "Remove the local Docker DB volume, then provision a fresh local workspace.";
    exec = ''
      set -euo pipefail

      ./.superset/teardown.local.sh
      superset-setup "$@"
    '';
  };

  scripts.superset-down = {
    description = "Tear down this workspace's local Docker DB stack.";
    exec = ''
      set -euo pipefail
      exec ./.superset/teardown.local.sh "$@"
    '';
  };

  scripts.superset-trust-caddy = {
    description = "Install Caddy's local CA into the macOS trust store.";
    exec = ''
      set -euo pipefail

      if [ ! -f Caddyfile ]; then
        echo "Caddyfile is missing. Run superset-setup first." >&2
        exit 1
      fi

      if [ -f .env ]; then
        set -a
        # shellcheck disable=SC1091
        source .env
        set +a
      fi

      started_caddy=0
      caddy_log="$(mktemp -t superset-caddy-trust.XXXXXX.log)"

      if ! curl -fsS http://localhost:2019/config/ >/dev/null 2>&1; then
        caddy run --config Caddyfile >"$caddy_log" 2>&1 &
        caddy_pid=$!
        started_caddy=1

        for _ in $(seq 1 30); do
          if curl -fsS http://localhost:2019/config/ >/dev/null 2>&1; then
            break
          fi
          if ! kill -0 "$caddy_pid" >/dev/null 2>&1; then
            echo "Caddy exited before the admin API became ready. Log: $caddy_log" >&2
            exit 1
          fi
          sleep 1
        done

        if ! curl -fsS http://localhost:2019/config/ >/dev/null 2>&1; then
          echo "Timed out waiting for Caddy admin API. Log: $caddy_log" >&2
          exit 1
        fi
      fi

      cleanup() {
        if [ "''${started_caddy:-0}" = "1" ] && [ -n "''${caddy_pid:-}" ]; then
          kill "$caddy_pid" >/dev/null 2>&1 || true
          wait "$caddy_pid" >/dev/null 2>&1 || true
        fi
      }
      trap cleanup EXIT

      caddy trust --config Caddyfile "$@"
    '';
  };

  processes.superset-dev.exec = "superset-dev";

  enterShell = ''
    echo "Superset devenv ready."
    echo "  superset-setup        provision local services and .env"
    echo "  superset-dev          start the dev servers"
    echo "  devenv up             start superset-dev under the process manager"
    echo "  superset-doctor       inspect local tool and service state"
    echo "  superset-use-integrations-url <url>  set OAuth/webhook callback tunnel"

    if ! docker info >/dev/null 2>&1; then
      echo "${dockerUnavailableMessage}"
    fi
  '';
}
