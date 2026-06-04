import type { Input } from "electron";
import { isOpenControlPlaneShortcutInput } from "main/lib/control-plane-shortcut";
import {
	type DashboardWebShortcut,
	dashboardWebCreateShortcutFromInput,
	dashboardWebIndexedShortcut,
	dashboardWebPendingDigitIndexFromInput,
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
const SHORTCUT_KEY_DOWN_TYPES = new Set(["char", "keyDown", "rawKeyDown"]);
const MODIFIER_KEYS = new Set(["alt", "control", "ctrl", "meta", "shift"]);

function isPendingDashboardWebChainCancelInput(
	input: ControlPlaneShortcutBridgeInput,
): boolean {
	if (!SHORTCUT_KEY_DOWN_TYPES.has(input.type)) return false;
	if (input.isAutoRepeat) return false;
	const key = input.key.toLowerCase();
	if (MODIFIER_KEYS.has(key)) return false;
	const code = input.code.toLowerCase();
	return !(
		code.startsWith("alt") ||
		code.startsWith("control") ||
		code.startsWith("ctrl") ||
		code.startsWith("meta") ||
		code.startsWith("shift")
	);
}

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
			const createShortcut = dashboardWebCreateShortcutFromInput(
				pending.shortcut,
				input,
			);
			if (createShortcut) {
				clearPending();
				return createShortcut;
			}

			const digitIndex = dashboardWebPendingDigitIndexFromInput(input);
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

			const pendingDashboardWebShortcut = pendingDashboardWebAppShortcut
				? resolveDashboardWebShortcut(input)
				: null;
			if (pendingDashboardWebShortcut) {
				return {
					preventDefault: true,
					shortcut: pendingDashboardWebShortcut,
					type: "dashboard-web-shortcut",
				};
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

			if (
				pendingDashboardWebAppShortcut &&
				isPendingDashboardWebChainCancelInput(input)
			) {
				clearPending();
			}

			return { preventDefault: false, type: "none" };
		},
	};
}
