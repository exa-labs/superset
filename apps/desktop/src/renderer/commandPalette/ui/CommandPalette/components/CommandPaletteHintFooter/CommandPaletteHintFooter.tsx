import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { getCommandPaletteFooterHints } from "./command-palette-hints";

interface CommandPaletteHintFooterProps {
	depth: number;
	query: string;
}

export function CommandPaletteHintFooter({
	depth,
	query,
}: CommandPaletteHintFooterProps) {
	const hints = getCommandPaletteFooterHints({ depth, query });

	return (
		<div
			className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-border/80 border-t px-3 py-1.5 text-muted-foreground text-xs"
			data-command-palette-hint-footer="true"
		>
			<span className="sr-only">Command palette keyboard hints</span>
			{hints.map((hint) => (
				<div
					key={`${hint.label}-${hint.keys.join("-")}`}
					className="flex items-center gap-1.5"
				>
					<KbdGroup>
						{hint.keys.map((key) => (
							<Kbd key={key} className="h-4 min-w-4 px-1 text-[10px]">
								{key}
							</Kbd>
						))}
					</KbdGroup>
					<span>{hint.label}</span>
				</div>
			))}
		</div>
	);
}
