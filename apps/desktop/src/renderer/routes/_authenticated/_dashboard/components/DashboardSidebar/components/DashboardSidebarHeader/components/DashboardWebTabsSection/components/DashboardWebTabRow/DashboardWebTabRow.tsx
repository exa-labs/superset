import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { useEffect, useRef, useState } from "react";
import { LuEllipsis, LuPencil, LuPin, LuX } from "react-icons/lu";
import { DashboardWebPageIcon } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarHeader/components/DashboardWebPagesGrid/components/DashboardWebPageIcon";
import {
	cancelDashboardWebUrlWarmup,
	warmDashboardWebUrl,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-preloader";
import {
	type DashboardWebTab,
	getDashboardWebTabFavicon,
	renameDashboardWebTab,
} from "renderer/routes/_authenticated/_dashboard/utils/dashboard-web-tabs";

interface DashboardWebTabRowProps {
	tab: DashboardWebTab;
	isActive: boolean;
	shortcutLabel: string | null;
	onOpen: (tabId: string) => void;
	onClose: (tabId: string) => void;
	onPinnedChange: (tabId: string, isPinned: boolean) => void;
}

const WEB_TAB_ROW_KEY_HINTS = [
	{ key: ".", title: "Actions" },
	{ key: "p", title: "Pin" },
	{ key: "e", title: "Rename" },
	{ key: "x", title: "Close" },
];

function WebTabRowKeyHints({ visible }: { visible: boolean }) {
	return (
		<div
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute top-1 right-[4.5rem] flex max-w-[5rem] items-center gap-0.5 overflow-hidden rounded-md border border-border/70 bg-background/90 px-1 py-0.5 shadow-sm backdrop-blur-sm transition-opacity",
				visible
					? "opacity-100"
					: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
			)}
		>
			{WEB_TAB_ROW_KEY_HINTS.map((hint) => (
				<span
					key={hint.key}
					title={hint.title}
					className="flex h-4 min-w-4 items-center justify-center rounded border border-border/70 bg-muted/45 px-1 font-mono text-[9px] leading-none text-muted-foreground"
				>
					{hint.key}
				</span>
			))}
		</div>
	);
}

export function DashboardWebTabRow({
	tab,
	isActive,
	shortcutLabel,
	onOpen,
	onClose,
	onPinnedChange,
}: DashboardWebTabRowProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [draftTitle, setDraftTitle] = useState(tab.title);
	const secondaryTitle =
		tab.browserTitle && tab.browserTitle !== tab.title
			? tab.browserTitle
			: null;

	useEffect(() => {
		if (!isEditing) setDraftTitle(tab.title);
	}, [isEditing, tab.title]);

	useEffect(() => {
		if (!isEditing) return;
		inputRef.current?.focus();
		inputRef.current?.select();
	}, [isEditing]);

	const commitRename = () => {
		renameDashboardWebTab(tab.id, draftTitle);
		setIsEditing(false);
	};

	const cancelRename = () => {
		setDraftTitle(tab.title);
		setIsEditing(false);
	};
	const togglePinned = () => onPinnedChange(tab.id, !tab.isPinned);
	const closeTab = () => onClose(tab.id);

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				value={draftTitle}
				onChange={(event) => setDraftTitle(event.target.value)}
				onBlur={commitRename}
				onKeyDown={(event) => {
					if (event.key === "Enter") commitRename();
					if (event.key === "Escape") cancelRename();
				}}
				className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none ring-1 ring-ring"
			/>
		);
	}

	return (
		<li
			data-dashboard-sidebar-action-scope
			draggable
			onDragStart={(event) => {
				event.dataTransfer.setData("application/x-dashboard-web-tab", tab.id);
				event.dataTransfer.effectAllowed = "move";
			}}
			className={cn(
				"group relative flex min-h-8 items-center gap-1 rounded-md pr-1 transition-colors",
				isActive
					? "bg-accent/70 text-foreground"
					: "text-muted-foreground hover:bg-accent/35 hover:text-foreground",
			)}
		>
			<button
				type="button"
				data-dashboard-sidebar-active={isActive ? "true" : undefined}
				data-dashboard-web-tab-row-button={tab.id}
				onFocus={() => warmDashboardWebUrl(tab.url)}
				onMouseEnter={() => warmDashboardWebUrl(tab.url)}
				onMouseLeave={cancelDashboardWebUrlWarmup}
				onClick={() => onOpen(tab.id)}
				onDoubleClick={() => setIsEditing(true)}
				title={secondaryTitle ?? tab.title}
				className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 pr-16 text-xs"
			>
				<DashboardWebPageIcon
					src={getDashboardWebTabFavicon(tab)}
					fallbackLabel={tab.title}
					className="size-3.5 opacity-90"
				/>
				<span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
					<span className="min-w-0 truncate">{tab.title}</span>
					{secondaryTitle && (
						<span className="min-w-0 truncate text-[10px] text-muted-foreground/70">
							{secondaryTitle}
						</span>
					)}
				</span>
				{shortcutLabel && (
					<span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
						{shortcutLabel}
					</span>
				)}
			</button>
			<div
				className={cn(
					"absolute right-1 top-1 flex w-16 shrink-0 items-center justify-end gap-0.5 rounded-md bg-background/90 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
					(tab.isPinned || menuOpen) && "opacity-100",
				)}
			>
				<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							data-dashboard-sidebar-action="menu"
							aria-keyshortcuts="."
							aria-label={`Show actions for ${tab.title}`}
							title="Show actions (.)"
							className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition hover:bg-accent hover:text-foreground"
						>
							<LuEllipsis className="size-3" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="right" align="start" className="w-52">
						<DropdownMenuItem onSelect={() => onOpen(tab.id)}>
							Open
							<DropdownMenuShortcut>Enter</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => setIsEditing(true)}>
							Rename
							<DropdownMenuShortcut>e</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={togglePinned}>
							{tab.isPinned ? "Unpin" : "Pin"}
							<DropdownMenuShortcut>p</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={closeTab}>
							Close tab
							<DropdownMenuShortcut>x</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<button
					type="button"
					data-dashboard-sidebar-action="pin"
					aria-keyshortcuts="p"
					aria-label={
						tab.isPinned
							? `Unpin ${tab.title} from browser retention`
							: `Pin ${tab.title} for browser retention`
					}
					title={tab.isPinned ? "Unpin (p)" : "Pin (p)"}
					onClick={(event) => {
						event.stopPropagation();
						togglePinned();
					}}
					className={cn(
						"flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition hover:bg-accent hover:text-foreground",
						tab.isPinned && "text-foreground",
					)}
				>
					<LuPin className={cn("size-3", tab.isPinned && "fill-current")} />
				</button>
				<button
					type="button"
					data-dashboard-sidebar-action="rename"
					aria-keyshortcuts="e"
					aria-label={`Rename ${tab.title}`}
					title="Rename (e)"
					onClick={() => setIsEditing(true)}
					className="sr-only"
				>
					<LuPencil className="size-3" />
				</button>
				<button
					type="button"
					data-dashboard-sidebar-action="archive"
					aria-keyshortcuts="a x"
					aria-label={`Close ${tab.title}`}
					title="Close (x)"
					onClick={(event) => {
						event.stopPropagation();
						closeTab();
					}}
					className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition hover:bg-accent hover:text-foreground"
				>
					<LuX className="size-3" />
				</button>
			</div>
			<WebTabRowKeyHints visible={menuOpen} />
		</li>
	);
}
