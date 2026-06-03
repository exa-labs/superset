import type { Input } from "electron";
import { isOpenControlPlaneShortcutInput } from "main/lib/control-plane-shortcut";
import {
	type DashboardWebShortcut,
	dashboardWebDigitIndexFromInput,
	dashboardWebIndexedShortcut,
	dashboardWebShortcutFromInput,
} from "main/lib/dashboard-web-shortcut";
import {
	type GlobalKeyboardAction,
	globalKeyboardActionFromInput,
	shouldPreventDefaultForGlobalKeyboardAction,
} from "main/lib/global-keyboard-shortcut";

type ControlPlaneShortcutBridgeInput = Pick<
	Input,
	| "alt"
	| "code"
	| "control"
	| "isAutoRepeat"
	| "key"
	| "meta"
	| "shift"
	| "type"
>;

export type ControlPlaneShortcutBridgeResult =
	| {
			preventDefault: true;
			type: "open-control-plane";
	  }
	| {
			action: GlobalKeyboardAction;
			preventDefault: boolean;
			type: "global-keyboard-action";
	  }
	| {
			preventDefault: true;
			shortcut: DashboardWebShortcut;
			type: "dashboard-web-shortcut";
	  }
	| {
			preventDefault: false;
			type: "none";
	  };

interface ControlPlaneShortcutBridgeResolverOptions {
	clearTimeout?: (timeout: unknown) => void;
	pendingWebAppShortcutMs?: number;
	setTimeout?: (callback: () => void, ms: number) => unknown;
}

interface PendingDashboardWebAppShortcut {
	shortcut: DashboardWebShortcut;
	timeout: unknown;
}

export interface ControlPlaneShortcutBridgeInputResolver {
	clearPending: () => void;
	resolve: (
		input: ControlPlaneShortcutBridgeInput,
	) => ControlPlaneShortcutBridgeResult;
}

const DEFAULT_PENDING_WEB_APP_SHORTCUT_MS = 1500;

export function createControlPlaneShortcutBridgeInputResolver(
	options: ControlPlaneShortcutBridgeResolverOptions = {},
): ControlPlaneShortcutBridgeInputResolver {
	const setTimer =
		options.setTimeout ??
		((callback: () => void, ms: number) => setTimeout(callback, ms));
	const clearTimer =
		options.clearTimeout ??
		((timeout: unknown) =>
			clearTimeout(timeout as ReturnType<typeof setTimeout>));
	const pendingWebAppShortcutMs =
		options.pendingWebAppShortcutMs ?? DEFAULT_PENDING_WEB_APP_SHORTCUT_MS;
	let pendingDashboardWebAppShortcut: PendingDashboardWebAppShortcut | null =
		null;

	const clearPending = () => {
		const pending = pendingDashboardWebAppShortcut;
		if (!pending) return;
		clearTimer(pending.timeout);
		pendingDashboardWebAppShortcut = null;
	};

	const armPending = (shortcut: DashboardWebShortcut) => {
		clearPending();
		pendingDashboardWebAppShortcut = {
			shortcut,
			timeout: setTimer(() => {
				pendingDashboardWebAppShortcut = null;
			}, pendingWebAppShortcutMs),
		};
	};

	const resolveDashboardWebShortcut = (
		input: ControlPlaneShortcutBridgeInput,
	): DashboardWebShortcut | null => {
		const pending = pendingDashboardWebAppShortcut;
		if (pending) {
			const digitIndex = dashboardWebDigitIndexFromInput(input);
			if (digitIndex !== null) {
				clearPending();
				return dashboardWebIndexedShortcut(pending.shortcut, digitIndex);
			}
		}

		const shortcut = dashboardWebShortcutFromInput(input);
		if (shortcut === "OPEN_CAPY" || shortcut === "OPEN_DEVIN") {
			armPending(shortcut);
			return shortcut;
		}

		if (shortcut) clearPending();
		return shortcut;
	};

	return {
		clearPending,
		resolve: (input) => {
			if (isOpenControlPlaneShortcutInput(input)) {
				clearPending();
				return { preventDefault: true, type: "open-control-plane" };
			}

			const globalKeyboardAction = globalKeyboardActionFromInput(input);
			if (globalKeyboardAction) {
				clearPending();
				return {
					action: globalKeyboardAction,
					preventDefault:
						shouldPreventDefaultForGlobalKeyboardAction(globalKeyboardAction),
					type: "global-keyboard-action",
				};
			}

			const dashboardWebShortcut = resolveDashboardWebShortcut(input);
			if (dashboardWebShortcut) {
				return {
					preventDefault: true,
					shortcut: dashboardWebShortcut,
					type: "dashboard-web-shortcut",
				};
			}

			return { preventDefault: false, type: "none" };
		},
	};
}
