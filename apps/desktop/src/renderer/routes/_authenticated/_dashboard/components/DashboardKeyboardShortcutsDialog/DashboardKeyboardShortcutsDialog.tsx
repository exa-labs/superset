import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { LuKeyboard } from "react-icons/lu";
import { type HotkeyId, useHotkeyDisplay } from "renderer/hotkeys";
import {
	DASHBOARD_KEYBOARD_HELP_SECTIONS,
	type DashboardKeyboardHelpEntry,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-keyboard-help";

interface DashboardKeyboardShortcutsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function HotkeyKeycaps({ hotkeyId }: { hotkeyId: HotkeyId }) {
	const { keys, text } = useHotkeyDisplay(hotkeyId);

	if (text === "Unassigned") {
		return (
			<span className="rounded border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
				Unassigned
			</span>
		);
	}

	return (
		<KbdGroup className="justify-end">
			{keys.map((key) => (
				<Kbd key={key}>{key}</Kbd>
			))}
		</KbdGroup>
	);
}

function StaticKeycaps({ keys }: { keys: string[] }) {
	const occurrences = new Map<string, number>();
	const keycaps = keys.map((key) => {
		const occurrence = occurrences.get(key) ?? 0;
		occurrences.set(key, occurrence + 1);
		return {
			id: `${key}-${occurrence}`,
			label: key,
		};
	});

	return (
		<KbdGroup className="justify-end">
			{keycaps.map((key) => (
				<Kbd key={key.id}>{key.label}</Kbd>
			))}
		</KbdGroup>
	);
}

function KeyboardHelpEntryRow({
	entry,
}: {
	entry: DashboardKeyboardHelpEntry;
}) {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/40">
			<div className="min-w-0">
				<div className="truncate text-sm font-medium text-foreground">
					{entry.label}
				</div>
				<div className="truncate text-xs text-muted-foreground">
					{entry.description}
				</div>
			</div>
			<div className="flex min-w-[4.5rem] justify-end">
				{entry.hotkeyId ? (
					<HotkeyKeycaps hotkeyId={entry.hotkeyId} />
				) : (
					<StaticKeycaps keys={entry.keys} />
				)}
			</div>
		</div>
	);
}

export function DashboardKeyboardShortcutsDialog({
	open,
	onOpenChange,
}: DashboardKeyboardShortcutsDialogProps) {
	const navigate = useNavigate();

	const handleOpenSettings = () => {
		onOpenChange(false);
		void navigate({ to: "/settings/keyboard" });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				data-dashboard-keyboard-help="true"
				className={cn(
					"max-h-[calc(100vh-4rem)] max-w-[840px] gap-0 overflow-hidden p-0",
					"border-border/90 bg-background/95 shadow-2xl backdrop-blur",
				)}
			>
				<DialogHeader className="border-b border-border px-5 py-4">
					<div className="flex items-start justify-between gap-4 pr-8">
						<div className="min-w-0">
							<DialogTitle className="flex items-center gap-2 text-base">
								<LuKeyboard className="size-4 text-primary" />
								Keyboard control plane
							</DialogTitle>
							<DialogDescription className="mt-1">
								Primary dashboard actions, Vim navigation, and native-agent
								shortcuts.
							</DialogDescription>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleOpenSettings}
							className="shrink-0"
						>
							Customize
						</Button>
					</div>
				</DialogHeader>
				<div className="grid max-h-[calc(100vh-11rem)] gap-4 overflow-y-auto p-4 md:grid-cols-2">
					{DASHBOARD_KEYBOARD_HELP_SECTIONS.map((section) => (
						<section key={section.id} className="min-w-0">
							<h3 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
								{section.title}
							</h3>
							<div className="space-y-0.5">
								{section.entries.map((entry) => (
									<KeyboardHelpEntryRow
										key={`${section.id}-${entry.label}`}
										entry={entry}
									/>
								))}
							</div>
						</section>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
