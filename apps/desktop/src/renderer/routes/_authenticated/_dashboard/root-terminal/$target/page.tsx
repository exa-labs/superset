import "@xterm/xterm/css/xterm.css";
import { Button } from "@superset/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { LuArrowLeft, LuTerminal } from "react-icons/lu";
import {
	attachToContainer,
	createRuntime,
	disposeRuntime,
} from "renderer/lib/terminal/terminal-runtime";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useTerminalAppearance } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/TerminalPane/hooks/useTerminalAppearance";
import {
	type DashboardQuickTerminalId,
	dashboardQuickTerminalCommand,
	dashboardQuickTerminalTitle,
	isDashboardQuickTerminalId,
} from "../../utils/dashboard-quick-terminals";

export const Route = createFileRoute(
	"/_authenticated/_dashboard/root-terminal/$target/",
)({
	component: DashboardRootTerminalPage,
});

function DashboardRootTerminalPage() {
	const navigate = useNavigate();
	const params = Route.useParams();
	const target = isDashboardQuickTerminalId(params.target)
		? params.target
		: null;
	const title = target ? dashboardQuickTerminalTitle(target) : "Terminal";

	return (
		<div
			className="flex min-h-0 flex-1 flex-col bg-background"
			data-terminal-root="true"
		>
			<div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={() => navigate({ to: "/workspace" })}
					aria-label="Back"
				>
					<LuArrowLeft className="size-4" />
				</Button>
				<LuTerminal className="size-4 text-muted-foreground" />
				<div className="min-w-0">
					<div className="truncate text-sm font-medium">{title}</div>
					<div className="truncate text-xs text-muted-foreground">
						{target
							? `${dashboardQuickTerminalCommand(target)} in repo root`
							: "Unknown quick terminal"}
					</div>
				</div>
				<div className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground lg:flex">
					<span className="rounded border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono">
						Esc
					</span>
					<span>sidebar</span>
					<span className="rounded border border-border/70 bg-background/70 px-1.5 py-0.5 font-mono">
						⌥K
					</span>
					<span>commands</span>
				</div>
			</div>
			{target ? (
				<DashboardRootTerminal target={target} />
			) : (
				<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
					Unknown quick terminal target.
				</div>
			)}
		</div>
	);
}

function DashboardRootTerminal({
	target,
}: {
	target: DashboardQuickTerminalId;
}) {
	const appearance = useTerminalAppearance();
	const appearanceRef = useRef(appearance);
	appearanceRef.current = appearance;
	const containerRef = useRef<HTMLDivElement | null>(null);
	const terminalId = useMemo(
		() => `dashboard-root-${target}-${crypto.randomUUID()}`,
		[target],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const runtime = createRuntime(terminalId, appearanceRef.current);
		const syncSize = () => {
			void electronTrpcClient.terminal.resize.mutate({
				paneId: terminalId,
				cols: runtime.terminal.cols,
				rows: runtime.terminal.rows,
			});
		};
		attachToContainer(runtime, container, syncSize);

		const refit = () => {
			if (!containerRef.current) return;
			runtime.fitAddon.fit();
			syncSize();
		};
		const refitTimers = [
			window.setTimeout(refit, 100),
			window.setTimeout(refit, 350),
		];

		const inputDisposable = runtime.terminal.onData((data) => {
			void electronTrpcClient.terminal.write.mutate({
				paneId: terminalId,
				data,
			});
		});

		const subscription = electronTrpcClient.terminal.stream.subscribe(
			terminalId,
			{
				onData: (event) => {
					if (event.type === "data") {
						runtime.terminal.write(event.data);
					}
				},
			},
		);

		void electronTrpcClient.terminal.createRootSession
			.mutate({
				terminalId,
				cols: runtime.terminal.cols,
				rows: runtime.terminal.rows,
			})
			.then(() =>
				electronTrpcClient.terminal.write.mutate({
					paneId: terminalId,
					data: `${dashboardQuickTerminalCommand(target)}\r`,
				}),
			);

		return () => {
			for (const timer of refitTimers) window.clearTimeout(timer);
			inputDisposable.dispose();
			subscription.unsubscribe();
			void electronTrpcClient.terminal.kill.mutate({ paneId: terminalId });
			disposeRuntime(runtime);
		};
	}, [target, terminalId]);

	return (
		<div
			className="min-h-0 flex-1 overflow-hidden p-2"
			data-terminal-root="true"
			title="Root terminal. Press Esc to focus the sidebar. Press Option+K for commands."
		>
			<div
				ref={containerRef}
				className="h-full w-full overflow-hidden rounded-md bg-black"
			/>
		</div>
	);
}
