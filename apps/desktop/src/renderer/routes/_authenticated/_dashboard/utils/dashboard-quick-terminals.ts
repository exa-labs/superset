export const DASHBOARD_QUICK_TERMINAL_EVENT = "dashboard-quick-terminal-launch";
const DASHBOARD_QUICK_TERMINAL_PENDING_STORAGE_KEY =
	"dashboard.quickTerminal.pendingLaunch";
const DASHBOARD_QUICK_TERMINAL_PENDING_TTL_MS = 60_000;

export const DASHBOARD_QUICK_TERMINALS = [
	{ id: "stag", label: "stag" },
	{ id: "prod", label: "prod" },
	{ id: "heph", label: "heph" },
] as const;

export type DashboardQuickTerminal = (typeof DASHBOARD_QUICK_TERMINALS)[number];
export type DashboardQuickTerminalId = DashboardQuickTerminal["id"];

export interface DashboardQuickTerminalEventDetail {
	target: DashboardQuickTerminalId;
}

interface PendingDashboardQuickTerminalLaunch {
	target: DashboardQuickTerminalId;
	workspaceId: string | null;
	createdAt: number;
}

type QuickTerminalStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function getSessionStorage(): QuickTerminalStorage | null {
	if (typeof window === "undefined") return null;
	return window.sessionStorage;
}

export function isDashboardQuickTerminalId(
	value: unknown,
): value is DashboardQuickTerminalId {
	return DASHBOARD_QUICK_TERMINALS.some((terminal) => terminal.id === value);
}

export function dashboardQuickTerminalCommand(
	target: DashboardQuickTerminalId,
): string {
	return `kr9 ${target}`;
}

export function dashboardQuickTerminalTitle(
	target: DashboardQuickTerminalId,
): string {
	return target;
}

export function writePendingDashboardQuickTerminalLaunch(
	target: DashboardQuickTerminalId,
	workspaceId: string | null,
	storage: QuickTerminalStorage | null = getSessionStorage(),
): void {
	storage?.setItem(
		DASHBOARD_QUICK_TERMINAL_PENDING_STORAGE_KEY,
		JSON.stringify({
			target,
			workspaceId,
			createdAt: Date.now(),
		} satisfies PendingDashboardQuickTerminalLaunch),
	);
}

export function consumePendingDashboardQuickTerminalLaunch(
	workspaceId: string,
	storage: QuickTerminalStorage | null = getSessionStorage(),
): DashboardQuickTerminalId | null {
	const raw = storage?.getItem(DASHBOARD_QUICK_TERMINAL_PENDING_STORAGE_KEY);
	if (!raw || !storage) return null;

	let launch: PendingDashboardQuickTerminalLaunch;
	try {
		launch = JSON.parse(raw) as PendingDashboardQuickTerminalLaunch;
	} catch {
		storage.removeItem(DASHBOARD_QUICK_TERMINAL_PENDING_STORAGE_KEY);
		return null;
	}

	if (
		!isDashboardQuickTerminalId(launch.target) ||
		typeof launch.createdAt !== "number" ||
		Date.now() - launch.createdAt > DASHBOARD_QUICK_TERMINAL_PENDING_TTL_MS
	) {
		storage.removeItem(DASHBOARD_QUICK_TERMINAL_PENDING_STORAGE_KEY);
		return null;
	}

	if (launch.workspaceId && launch.workspaceId !== workspaceId) {
		return null;
	}

	storage.removeItem(DASHBOARD_QUICK_TERMINAL_PENDING_STORAGE_KEY);
	return launch.target;
}
