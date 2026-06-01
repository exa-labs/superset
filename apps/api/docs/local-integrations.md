# Local Real Integrations

Use this workflow when you want Linear, GitHub, and Slack to connect to a local Superset checkout with real developer-owned credentials.

## URL Model

Keep ordinary app traffic local:

```bash
NEXT_PUBLIC_API_URL=http://localhost:$API_PORT
NEXT_PUBLIC_WEB_URL=http://localhost:$WEB_PORT
```

Expose only provider callbacks and webhooks through a public HTTPS tunnel to the API port:

```bash
ngrok http "$API_PORT"
# or
cloudflared tunnel --url "http://localhost:$API_PORT"
```

Then set the tunnel as:

```bash
INTEGRATIONS_PUBLIC_API_URL=https://your-tunnel.example
```

Inside `devenv shell`, use:

```bash
superset-use-integrations-url https://your-tunnel.example
```

Restart `superset-dev` after changing `.env`.

## Linear

Env:

```bash
LINEAR_CLIENT_ID=...
LINEAR_CLIENT_SECRET=...
LINEAR_WEBHOOK_SECRET=...
```

Provider URLs:

```text
OAuth callback: https://your-tunnel.example/api/integrations/linear/callback
Webhook:        https://your-tunnel.example/api/integrations/linear/webhook
```

The app requests `read,write,issues:create` during OAuth. The token exchange uses the same callback URL as the authorize request, so `INTEGRATIONS_PUBLIC_API_URL` must match the URL registered in Linear.

## GitHub App

Env:

```bash
GH_APP_ID=...
GH_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GH_APP_SLUG=your-dev-app-slug
GH_WEBHOOK_SECRET=...
```

Provider URLs:

```text
Setup URL: https://your-tunnel.example/api/github/callback
Webhook:   https://your-tunnel.example/api/github/webhook
```

Recommended permissions and events for the current sync implementation:

- Repository permissions: metadata read, pull requests read, checks read.
- Subscribe to events: installation, installation_repositories, pull_request, pull_request_review, check_run.

Install the GitHub App from `/integrations/github`; Superset passes a signed `state` value and stores the returned installation locally.

## Slack

Env:

```bash
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
```

Provider URLs:

```text
OAuth redirect: https://your-tunnel.example/api/integrations/slack/callback
Events:         https://your-tunnel.example/api/integrations/slack/events
Interactivity:  https://your-tunnel.example/api/integrations/slack/interactions
```

Bot scopes requested by Superset:

```text
app_mentions:read,chat:write,reactions:write,channels:history,groups:history,im:history,im:read,im:write,mpim:history,users:read,files:read,assistant:write,links:read,links:write
```

Slack requires the redirect URL configured in Slack to match the redirect URI sent during authorize and token exchange.

## Back To Offline Core Mode

Inside `devenv shell`:

```bash
superset-clear-integrations-url
```

You can keep real credentials in `.env`, but connect flows will fail if the tunnel URL is not reachable. Restore fake placeholders if you want the integration pages to show the local not-configured state.
