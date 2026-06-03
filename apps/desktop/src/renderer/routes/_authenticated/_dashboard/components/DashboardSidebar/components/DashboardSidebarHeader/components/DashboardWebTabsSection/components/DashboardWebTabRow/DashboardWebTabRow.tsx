import { cn } from "@superset/ui/utils";
import { useEffect, useRef, useState } from "react";
import { LuPencil, LuPin, LuX } from "react-icons/lu";
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
				"group flex min-h-7 items-center gap-1 rounded-md pr-1 transition-colors",
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
				className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-xs"
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
			<button
				type="button"
				data-dashboard-sidebar-action="pin"
				aria-label={
					tab.isPinned
						? `Unpin ${tab.title} from browser retention`
						: `Pin ${tab.title} for browser retention`
				}
				title={tab.isPinned ? "Unpin" : "Pin"}
				onClick={(event) => {
					event.stopPropagation();
					onPinnedChange(tab.id, !tab.isPinned);
				}}
				className={cn(
					"flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-[10px] font-medium leading-none transition hover:bg-accent hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100",
					tab.isPinned
						? "border border-border/70 bg-background/70 text-foreground opacity-100"
						: "text-muted-foreground/70 opacity-0",
				)}
			>
				<LuPin className={cn("size-3", tab.isPinned && "fill-current")} />
				{tab.isPinned && <span>Unpin</span>}
			</button>
			<button
				type="button"
				data-dashboard-sidebar-action="rename"
				aria-label={`Rename ${tab.title}`}
				onClick={() => setIsEditing(true)}
				className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition hover:bg-accent group-hover:opacity-100 group-focus-within:opacity-100"
			>
				<LuPencil className="size-3" />
			</button>
			<button
				type="button"
				data-dashboard-sidebar-action="archive"
				aria-label={`Close ${tab.title}`}
				onClick={(event) => {
					event.stopPropagation();
					onClose(tab.id);
				}}
				className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
			>
				<LuX className="size-3" />
			</button>
		</li>
	);
}
