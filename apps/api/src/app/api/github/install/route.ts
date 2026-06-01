import { auth } from "@superset/auth/server";
import { findOrgMembership } from "@superset/db/utils";

import { env } from "@/env";
import {
	isGitHubAppConfigured,
	resolveIntegrationPublicApiUrl,
} from "@/lib/integration-config";
import { createSignedState } from "@/lib/oauth-state";

export async function GET(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });

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
		!isGitHubAppConfigured({
			appId: env.GH_APP_ID,
			privateKey: env.GH_APP_PRIVATE_KEY,
			appSlug: env.GH_APP_SLUG,
		})
	) {
		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/github?error=not_configured`,
		);
	}

	const state = createSignedState({
		organizationId,
		userId: session.user.id,
	});

	const installUrl = new URL(
		`https://github.com/apps/${env.GH_APP_SLUG}/installations/new`,
	);
	const publicApiUrl = resolveIntegrationPublicApiUrl({
		integrationsPublicApiUrl: env.INTEGRATIONS_PUBLIC_API_URL,
		nextPublicApiUrl: env.NEXT_PUBLIC_API_URL,
	});
	installUrl.searchParams.set("state", state);
	installUrl.searchParams.set(
		"redirect_url",
		`${publicApiUrl}/api/github/callback`,
	);

	return Response.redirect(installUrl.toString());
}
