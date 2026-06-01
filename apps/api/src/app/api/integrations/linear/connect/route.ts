import { auth } from "@superset/auth/server";
import { findOrgMembership } from "@superset/db/utils";

import { env } from "@/env";
import {
	isLinearConfigured,
	resolveIntegrationPublicApiUrl,
} from "@/lib/integration-config";
import { createSignedState } from "@/lib/oauth-state";

export async function GET(request: Request) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session?.user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const organizationId = url.searchParams.get("organizationId");

	if (!organizationId) {
		return Response.json(
			{ error: "Missing organizationId parameter" },
			{ status: 400 },
		);
	}

	const membership = await findOrgMembership({
		userId: session.user.id,
		organizationId,
	});

	if (!membership) {
		return Response.json(
			{ error: "User is not a member of this organization" },
			{ status: 403 },
		);
	}

	if (
		!isLinearConfigured({
			clientId: env.LINEAR_CLIENT_ID,
			clientSecret: env.LINEAR_CLIENT_SECRET,
		})
	) {
		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/linear?error=not_configured`,
		);
	}

	const state = createSignedState({
		organizationId,
		userId: session.user.id,
	});

	const linearAuthUrl = new URL("https://linear.app/oauth/authorize");
	const publicApiUrl = resolveIntegrationPublicApiUrl({
		integrationsPublicApiUrl: env.INTEGRATIONS_PUBLIC_API_URL,
		nextPublicApiUrl: env.NEXT_PUBLIC_API_URL,
	});
	linearAuthUrl.searchParams.set("client_id", env.LINEAR_CLIENT_ID);
	linearAuthUrl.searchParams.set(
		"redirect_uri",
		`${publicApiUrl}/api/integrations/linear/callback`,
	);
	linearAuthUrl.searchParams.set("response_type", "code");
	linearAuthUrl.searchParams.set("scope", "read,write,issues:create");
	linearAuthUrl.searchParams.set("state", state);

	return Response.redirect(linearAuthUrl.toString());
}
