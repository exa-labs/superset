import { openDashboardKeyboardHelp } from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";
import type { CommandContext } from "./types";

export const KEYBOARD_SETTINGS_PATH = "/settings/keyboard";

export function isSettingsRoute(pathname: string): boolean {
	return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function openCommandPaletteKeyboardHelp(
	context: Pick<CommandContext, "navigate" | "route">,
): boolean {
	if (isSettingsRoute(context.route.pathname)) {
		context.navigate(KEYBOARD_SETTINGS_PATH);
		return true;
	}

	return openDashboardKeyboardHelp();
}
