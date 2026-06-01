export function isFakeIntegrationValue(value: string | undefined) {
	if (!value) return true;
	return value.startsWith("fake-") || value === "000000";
}

export function resolveIntegrationPublicApiUrl({
	integrationsPublicApiUrl,
	nextPublicApiUrl,
}: {
	integrationsPublicApiUrl: string | undefined;
	nextPublicApiUrl: string;
}) {
	return integrationsPublicApiUrl ?? nextPublicApiUrl;
}

export function isLinearConfigured({
	clientId,
	clientSecret,
}: {
	clientId: string;
	clientSecret: string;
}) {
	return (
		!isFakeIntegrationValue(clientId) && !isFakeIntegrationValue(clientSecret)
	);
}

export function isSlackConfigured({
	clientId,
	clientSecret,
}: {
	clientId: string;
	clientSecret: string;
}) {
	return (
		!isFakeIntegrationValue(clientId) && !isFakeIntegrationValue(clientSecret)
	);
}

export function isGitHubAppConfigured({
	appId,
	privateKey,
	appSlug,
}: {
	appId: string;
	privateKey: string;
	appSlug: string;
}) {
	return (
		!isFakeIntegrationValue(appId) &&
		!isFakeIntegrationValue(privateKey) &&
		!isFakeIntegrationValue(appSlug)
	);
}
