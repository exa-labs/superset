import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { LuTerminal } from "react-icons/lu";
import {
	DASHBOARD_QUICK_TERMINALS,
	type DashboardQuickTerminalId,
	dashboardQuickTerminalCommand,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-quick-terminals";

interface DashboardQuickTerminalsGridProps {
	variant: "collapsed" | "expanded";
	onOpenTerminal: (target: DashboardQuickTerminalId) => void;
}

export function DashboardQuickTerminalsGrid({
	variant,
	onOpenTerminal,
}: DashboardQuickTerminalsGridProps) {
	if (variant === "collapsed") {
		return (
			<div className="grid grid-cols-1 gap-1">
				{DASHBOARD_QUICK_TERMINALS.map((terminal) => (
					<Tooltip key={terminal.id} delayDuration={300}>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label={`Open ${terminal.label} terminal`}
								data-testid={`dashboard-quick-terminal-${terminal.id}`}
								onClick={() => onOpenTerminal(terminal.id)}
								className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
							>
								<LuTerminal className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="right">
							{terminal.label} ({dashboardQuickTerminalCommand(terminal.id)})
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-3 gap-1 py-0.5">
			{DASHBOARD_QUICK_TERMINALS.map((terminal) => (
				<Tooltip key={terminal.id} delayDuration={500}>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label={`Open ${terminal.label} terminal`}
							data-testid={`dashboard-quick-terminal-${terminal.id}`}
							onClick={() => onOpenTerminal(terminal.id)}
							className={cn(
								"flex h-7 min-w-0 items-center justify-center gap-1 rounded-md border border-transparent px-1.5 text-xs font-medium transition-colors",
								"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							<LuTerminal className="size-3.5 shrink-0" />
							<span className="min-w-0 truncate">{terminal.label}</span>
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">
						{dashboardQuickTerminalCommand(terminal.id)}
					</TooltipContent>
				</Tooltip>
			))}
		</div>
	);
}
