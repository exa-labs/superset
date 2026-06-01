import { auth } from "@superset/auth/server";
import { findOrgMembership } from "@superset/db/utils";

import { env } from "@/env";
import {
	isSlackConfigured,
	resolveIntegrationPublicApiUrl,
} from "@/lib/integration-config";
import { createSignedState } from "@/lib/oauth-state";

const SLACK_SCOPES = [
	"app_mentions:read",
	"chat:write",
	"reactions:write",
	"channels:history",
	"groups:history",
	"im:history",
	"im:read",
	"im:write",
	"mpim:history",
	"users:read",
	"files:read",
	"assistant:write",
	"links:read",
	"links:write",
].join(",");

export async function GET(request: Request) {
	const url = new URL(request.url);
	const organizationId = url.searchParams.get("organizationId");
	if (!organizationId) {
		return Response.json(
			{ error: "Missing organizationId parameter" },
			{ status: 400 },
		);
	}

	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session?.user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = session.user.id;

	const membership = await findOrgMembership({ userId, organizationId });

	if (!membership) {
		return Response.json(
			{ error: "User is not a member of this organization" },
			{ status: 403 },
		);
	}

	if (
		!isSlackConfigured({
			clientId: env.SLACK_CLIENT_ID,
			clientSecret: env.SLACK_CLIENT_SECRET,
		})
	) {
		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/slack?error=not_configured`,
		);
	}

	const state = createSignedState({
		organizationId,
		userId,
	});

	const publicApiUrl = resolveIntegrationPublicApiUrl({
		integrationsPublicApiUrl: env.INTEGRATIONS_PUBLIC_API_URL,
		nextPublicApiUrl: env.NEXT_PUBLIC_API_URL,
	});
	const redirectUri = `${publicApiUrl}/api/integrations/slack/callback`;

	const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
	slackAuthUrl.searchParams.set("client_id", env.SLACK_CLIENT_ID);
	slackAuthUrl.searchParams.set("redirect_uri", redirectUri);
	slackAuthUrl.searchParams.set("scope", SLACK_SCOPES);
	slackAuthUrl.searchParams.set("state", state);

	return Response.redirect(slackAuthUrl.toString());
}
