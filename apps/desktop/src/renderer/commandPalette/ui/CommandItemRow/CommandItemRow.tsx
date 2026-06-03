import { CommandItem, CommandShortcut } from "@superset/ui/command";
import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { useHotkeyDisplay } from "renderer/hotkeys/hooks/useHotkeyDisplay";
import type { Command } from "../../core/types";
import { commandShortcutKeycapsFromLabel } from "./command-shortcut-keycaps";

interface CommandItemRowProps {
	command: Command;
	onSelect: (command: Command) => void;
}

export function CommandItemRow({ command, onSelect }: CommandItemRowProps) {
	const display = useHotkeyDisplay(command.hotkeyId ?? "");
	const Icon = command.icon;
	const shortcutKeys = command.shortcutLabel
		? commandShortcutKeycapsFromLabel(command.shortcutLabel)
		: Boolean(command.hotkeyId) && display.text !== "Unassigned"
			? display.keys
			: [];
	const shortcutText =
		command.shortcutLabel ?? (shortcutKeys.length > 0 ? display.text : null);
	const shortcutOccurrences = new Map<string, number>();
	const shortcutKeycaps = shortcutKeys.map((key) => {
		const occurrence = shortcutOccurrences.get(key) ?? 0;
		shortcutOccurrences.set(key, occurrence + 1);
		return {
			id: `${key}-${occurrence}`,
			label: key,
		};
	});
	return (
		<CommandItem
			data-command-palette-command-id={command.id}
			value={`${command.id} ${command.title} ${(command.keywords ?? []).join(" ")}`}
			onSelect={() => onSelect(command)}
		>
			{command.iconUrl ? (
				<img
					src={command.iconUrl}
					alt=""
					className="size-4 shrink-0 object-contain"
				/>
			) : Icon ? (
				<Icon />
			) : null}
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate">{command.title}</span>
				{command.description ? (
					<span className="truncate text-muted-foreground text-xs">
						{command.description}
					</span>
				) : null}
			</span>
			{shortcutText && shortcutKeys.length > 0 ? (
				<CommandShortcut aria-label={shortcutText} className="tracking-normal">
					<KbdGroup className="justify-end">
						{shortcutKeycaps.map((keycap) => (
							<Kbd
								key={keycap.id}
								className="h-5 min-w-5 bg-background/75 px-1 text-[10px]"
							>
								{keycap.label}
							</Kbd>
						))}
					</KbdGroup>
				</CommandShortcut>
			) : null}
		</CommandItem>
	);
}
