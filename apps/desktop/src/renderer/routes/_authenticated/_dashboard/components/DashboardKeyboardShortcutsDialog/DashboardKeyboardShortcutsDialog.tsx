import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Input } from "@superset/ui/input";
import { Kbd, KbdGroup } from "@superset/ui/kbd";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuKeyboard, LuSearch } from "react-icons/lu";
import { type HotkeyId, useHotkeyDisplay } from "renderer/hotkeys";
import {
	type DashboardKeyboardHelpEntry,
	filterDashboardKeyboardHelpSections,
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
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");

	const filteredSections = useMemo(
		() => filterDashboardKeyboardHelpSections({ query }),
		[query],
	);
	const visibleShortcutCount = filteredSections.reduce(
		(count, section) => count + section.entries.length,
		0,
	);

	useEffect(() => {
		if (!open) return;

		setQuery("");
		const timeoutId = window.setTimeout(() => {
			searchInputRef.current?.focus();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [open]);

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
					<div className="flex flex-col gap-3 pr-8 md:flex-row md:items-start md:justify-between">
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
						<div className="flex shrink-0 items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleOpenSettings}
							>
								Customize
							</Button>
						</div>
					</div>
					<div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
						<div className="relative min-w-0 flex-1">
							<LuSearch className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-3.5 text-muted-foreground" />
							<Input
								ref={searchInputRef}
								data-dashboard-keyboard-help-search="true"
								aria-label="Search dashboard shortcuts"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search shortcuts, actions, or keys..."
								className="h-9 border-border/80 bg-muted/15 pl-8"
							/>
						</div>
						<div className="shrink-0 text-xs text-muted-foreground">
							{visibleShortcutCount} shortcut
							{visibleShortcutCount === 1 ? "" : "s"}
							{query.trim() ? " found" : ""}
						</div>
					</div>
				</DialogHeader>
				<div className="grid max-h-[calc(100vh-11rem)] gap-4 overflow-y-auto p-4 md:grid-cols-2">
					{filteredSections.length > 0 ? (
						filteredSections.map((section) => (
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
						))
					) : (
						<div className="col-span-full flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 text-center">
							<div className="text-sm font-medium text-foreground">
								No matching shortcuts
							</div>
							<div className="mt-1 max-w-sm text-xs text-muted-foreground">
								Try an action like reply, split, folder, Chrome, Vim, or a key
								like option.
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
