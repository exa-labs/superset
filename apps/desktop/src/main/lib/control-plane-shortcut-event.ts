const CONTROL_PLANE_SHORTCUT_EVENT_HANDLED_KEY =
	"__clankeeControlPlaneShortcutHandled";

type ShortcutEventLike = {
	[CONTROL_PLANE_SHORTCUT_EVENT_HANDLED_KEY]?: boolean;
};

export function markControlPlaneShortcutEventHandled(event: object): void {
	(event as ShortcutEventLike)[CONTROL_PLANE_SHORTCUT_EVENT_HANDLED_KEY] = true;
}

export function isControlPlaneShortcutEventHandled(event: object): boolean {
	return (
		(event as ShortcutEventLike)[CONTROL_PLANE_SHORTCUT_EVENT_HANDLED_KEY] ===
		true
	);
}
