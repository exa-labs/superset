import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "renderer/lib/auth-client";
import { NativeAgentChatView } from "../../components/NativeAgentChatView";

export const Route = createFileRoute(
	"/_authenticated/_dashboard/native/capy/$threadId/",
)({
	component: CapyNativeThreadPage,
});

function CapyNativeThreadPage() {
	const { threadId } = Route.useParams();
	const { data: session } = authClient.useSession();
	return (
		<NativeAgentChatView
			provider="capy"
			selectedId={threadId}
			userEmail={session?.user.email}
		/>
	);
}
