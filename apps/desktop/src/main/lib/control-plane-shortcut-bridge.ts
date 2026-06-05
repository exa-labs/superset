import { app, type WebContents, webContents } from "electron";
import {
	type ControlPlaneShortcutBridgeInputResolver,
	createControlPlaneShortcutBridgeInputResolver,
} from "main/lib/control-plane-shortcut-bridge-resolver";
import { markControlPlaneShortcutEventHandled } from "main/lib/control-plane-shortcut-event";
import type { DashboardWebShortcut } from "main/lib/dashboard-web-shortcut";
import type { GlobalKeyboardAction } from "main/lib/global-keyboard-shortcut";

const attachedWebContentsIds = new Set<number>();
let installed = false;
let inputResolver: ControlPlaneShortcutBridgeInputResolver | null = null;

export function armControlPlaneShortcutBridgeDashboardWebShortcut(
	shortcut: DashboardWebShortcut,
): boolean {
	return inputResolver?.armPendingDashboardWebShortcut(shortcut) ?? false;
}

export function installControlPlaneShortcutBridge(
	onOpenControlPlane: () => void,
	onDashboardWebShortcut?: (shortcut: DashboardWebShortcut) => void,
	onGlobalKeyboardAction?: (action: GlobalKeyboardAction) => void,
): void {
	if (installed) return;
	installed = true;
	inputResolver = createControlPlaneShortcutBridgeInputResolver();

	const attach = (contents: WebContents) => {
		if (contents.isDestroyed() || attachedWebContentsIds.has(contents.id)) {
			return;
		}

		attachedWebContentsIds.add(contents.id);

		contents.on("before-input-event", (event, input) => {
			const result = inputResolver?.resolve(input) ?? {
				preventDefault: false,
				type: "none",
			};
			if (result.type !== "none") {
				markControlPlaneShortcutEventHandled(event);
			}
			if (result.preventDefault) {
				event.preventDefault();
			}

			if (result.type === "open-control-plane") {
				onOpenControlPlane();
				return;
			}

			if (result.type === "global-keyboard-action") {
				onGlobalKeyboardAction?.(result.action);
				return;
			}

			if (result.type === "dashboard-web-shortcut") {
				onDashboardWebShortcut?.(result.shortcut);
			}
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
