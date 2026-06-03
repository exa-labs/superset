import { CommandItem, CommandShortcut } from "@superset/ui/command";
import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { Fragment } from "react";
import { useHotkeyDisplay } from "renderer/hotkeys/hooks/useHotkeyDisplay";
import type { Command } from "../../core/types";
import {
	commandShortcutKeycapGroups,
	commandShortcutSearchText,
} from "./command-shortcut-keycaps";

interface CommandItemRowProps {
	command: Command;
	onSelect: (command: Command) => void;
}

export function CommandItemRow({ command, onSelect }: CommandItemRowProps) {
	const display = useHotkeyDisplay(command.hotkeyId ?? "");
	const Icon = command.icon;
	const hotkeyKeys =
		Boolean(command.hotkeyId) && display.text !== "Unassigned"
			? display.keys
			: [];
	const shortcutGroups = commandShortcutKeycapGroups({
		hotkeyKeys,
		hotkeyLabel: hotkeyKeys.length > 0 ? display.text : null,
		shortcutLabel: command.shortcutLabel,
	});
	const shortcutKeys = shortcutGroups.flatMap((group) => group.keys);
	const shortcutText =
		shortcutGroups.length > 0
			? shortcutGroups.map((group) => group.label).join(" / ")
			: null;
	const shortcutSearchText = commandShortcutSearchText({
		keys: shortcutKeys,
		label: shortcutText,
	});

	return (
		<CommandItem
			data-command-palette-command-id={command.id}
			value={`${command.id} ${command.title} ${(command.keywords ?? []).join(" ")} ${shortcutSearchText}`}
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
			{shortcutText && shortcutGroups.length > 0 ? (
				<CommandShortcut aria-label={shortcutText} className="tracking-normal">
					<KbdGroup className="justify-end gap-1">
						{shortcutGroups.map((group, groupIndex) => (
							<Fragment key={group.id}>
								{groupIndex > 0 && (
									<span className="px-0.5 text-muted-foreground/60 text-[10px]">
										/
									</span>
								)}
								{group.keys.map((key, keyIndex) => (
									<Kbd
										key={`${group.id}-${key}-${keyIndex}`}
										className="h-5 min-w-5 bg-background/75 px-1 text-[10px]"
									>
										{key}
									</Kbd>
								))}
							</Fragment>
						))}
					</KbdGroup>
				</CommandShortcut>
			) : null}
		</CommandItem>
	);
}
