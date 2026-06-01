import { app, type WebContents, webContents } from "electron";
import { isOpenControlPlaneShortcutInput } from "main/lib/control-plane-shortcut";

const attachedWebContentsIds = new Set<number>();
let installed = false;

export function installControlPlaneShortcutBridge(
	onOpenControlPlane: () => void,
): void {
	if (installed) return;
	installed = true;

	const attach = (contents: WebContents) => {
		if (contents.isDestroyed() || attachedWebContentsIds.has(contents.id)) {
			return;
		}

		attachedWebContentsIds.add(contents.id);

		contents.on("before-input-event", (event, input) => {
			if (!isOpenControlPlaneShortcutInput(input)) return;
			event.preventDefault();
			onOpenControlPlane();
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
