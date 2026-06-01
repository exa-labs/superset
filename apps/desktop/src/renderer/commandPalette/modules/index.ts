import { registerProvider } from "../core/registry";
import { actionsProvider } from "./actions/commands";
import { navigationProvider } from "./navigation/commands";
import { openInProvider } from "./openIn/commands";
import { webProvider } from "./web/commands";
import { workspaceProvider } from "./workspace/commands";

export function registerAllModules(): () => void {
	const unregisters = [
		registerProvider(webProvider),
		registerProvider(workspaceProvider),
		registerProvider(actionsProvider),
		registerProvider(openInProvider),
		registerProvider(navigationProvider),
	];
	return () => {
		for (const u of unregisters) u();
	};
}
