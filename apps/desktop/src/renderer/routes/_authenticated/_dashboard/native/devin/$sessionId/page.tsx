import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "renderer/lib/auth-client";
import { NativeAgentChatView } from "../../components/NativeAgentChatView";

export const Route = createFileRoute(
	"/_authenticated/_dashboard/native/devin/$sessionId/",
)({
	component: DevinNativeSessionPage,
});

function DevinNativeSessionPage() {
	const { sessionId } = Route.useParams();
	const { data: session } = authClient.useSession();
	return (
		<NativeAgentChatView
			provider="devin"
			selectedId={sessionId}
			userEmail={session?.user.email}
		/>
	);
}
