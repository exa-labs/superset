import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "renderer/lib/auth-client";
import { NativeAgentChatView } from "../components/NativeAgentChatView";

export const Route = createFileRoute("/_authenticated/_dashboard/native/capy/")(
	{
		component: CapyNativePage,
	},
);

function CapyNativePage() {
	const { data: session } = authClient.useSession();
	return (
		<NativeAgentChatView provider="capy" userEmail={session?.user.email} />
	);
}
