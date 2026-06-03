import { app, type WebContents, webContents } from "electron";
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
} from "main/lib/global-keyboard-shortcut";

const attachedWebContentsIds = new Set<number>();
let installed = false;
let pendingDashboardWebAppShortcut: {
	shortcut: DashboardWebShortcut;
	timeout: NodeJS.Timeout;
} | null = null;

function clearPendingDashboardWebAppShortcut(): void {
	const pending = pendingDashboardWebAppShortcut;
	if (!pending) return;
	clearTimeout(pending.timeout);
	pendingDashboardWebAppShortcut = null;
}

function armPendingDashboardWebAppShortcut(
	shortcut: DashboardWebShortcut,
): void {
	clearPendingDashboardWebAppShortcut();
	pendingDashboardWebAppShortcut = {
		shortcut,
		timeout: setTimeout(() => {
			pendingDashboardWebAppShortcut = null;
		}, 1500),
	};
}

function resolveDashboardWebShortcut(
	input: Parameters<typeof dashboardWebShortcutFromInput>[0],
): DashboardWebShortcut | null {
	const pending = pendingDashboardWebAppShortcut;
	if (pending) {
		const digitIndex = dashboardWebDigitIndexFromInput(input);
		if (digitIndex !== null) {
			clearPendingDashboardWebAppShortcut();
			return dashboardWebIndexedShortcut(pending.shortcut, digitIndex);
		}
	}

	const shortcut = dashboardWebShortcutFromInput(input);
	if (shortcut === "OPEN_CAPY" || shortcut === "OPEN_DEVIN") {
		armPendingDashboardWebAppShortcut(shortcut);
		return shortcut;
	}

	if (shortcut) clearPendingDashboardWebAppShortcut();
	return shortcut;
}

export function installControlPlaneShortcutBridge(
	onOpenControlPlane: () => void,
	onDashboardWebShortcut?: (shortcut: DashboardWebShortcut) => void,
	onGlobalKeyboardAction?: (action: GlobalKeyboardAction) => void,
): void {
	if (installed) return;
	installed = true;

	const attach = (contents: WebContents) => {
		if (contents.isDestroyed() || attachedWebContentsIds.has(contents.id)) {
			return;
		}

		attachedWebContentsIds.add(contents.id);

		contents.on("before-input-event", (event, input) => {
			if (isOpenControlPlaneShortcutInput(input)) {
				event.preventDefault();
				onOpenControlPlane();
				return;
			}

			const globalKeyboardAction = globalKeyboardActionFromInput(input);
			if (globalKeyboardAction) {
				event.preventDefault();
				onGlobalKeyboardAction?.(globalKeyboardAction);
				return;
			}

			const dashboardWebShortcut = resolveDashboardWebShortcut(input);
			if (!dashboardWebShortcut) return;
			event.preventDefault();
			onDashboardWebShortcut?.(dashboardWebShortcut);
		});

		contents.once("destroyed", () => {
			attachedWebContentsIds.delete(contents.id);
		});
	};

	for (const contents of webContents.getAllWebContents()) {
		attach(contents);
	}

	app.on("web-contents-created", (_event, contents) => {
		attach(contents);
	});
}
