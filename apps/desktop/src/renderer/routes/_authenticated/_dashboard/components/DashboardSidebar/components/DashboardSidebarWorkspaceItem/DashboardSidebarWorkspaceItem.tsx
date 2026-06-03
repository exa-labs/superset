import {
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useDiffStats } from "renderer/hooks/host-service/useDiffStats";
import { useOptimisticCollectionActions } from "renderer/routes/_authenticated/hooks/useOptimisticCollectionActions";
import { useDeletingWorkspaces } from "renderer/routes/_authenticated/providers/DeletingWorkspacesProvider";
import { RenameBranchDialog } from "renderer/screens/main/components/WorkspaceSidebar/WorkspaceListItem/components";
import { useV2WorkspaceNotificationStatus } from "renderer/stores/v2-notifications";
import { useDashboardSidebarHover } from "../../providers/DashboardSidebarHoverProvider";
import type { DashboardSidebarWorkspace } from "../../types";
import { DashboardSidebarDeleteDialog } from "../DashboardSidebarDeleteDialog";
import { DashboardSidebarCollapsedWorkspaceButton } from "./components/DashboardSidebarCollapsedWorkspaceButton";
import { DashboardSidebarExpandedWorkspaceRow } from "./components/DashboardSidebarExpandedWorkspaceRow";
import { DashboardSidebarWorkspaceContextMenu } from "./components/DashboardSidebarWorkspaceContextMenu/DashboardSidebarWorkspaceContextMenu";
import { useDashboardSidebarWorkspaceItemActions } from "./hooks/useDashboardSidebarWorkspaceItemActions";

interface DashboardSidebarWorkspaceItemProps {
	workspace: DashboardSidebarWorkspace;
	onHoverCardOpen?: () => void;
	shortcutLabel?: string;
	isCollapsed?: boolean;
	isInSection?: boolean;
}

export function DashboardSidebarWorkspaceItem({
	workspace,
	onHoverCardOpen,
	shortcutLabel,
	isCollapsed = false,
	isInSection = false,
}: DashboardSidebarWorkspaceItemProps) {
	const {
		id,
		projectId,
		accentColor = null,
		hostType,
		hostIsOnline,
		name,
		branch,
		pendingTransaction,
		pullRequest,
	} = workspace;
	const isMainWorkspace = workspace.type === "main";
	const diffStats = useDiffStats(id);
	const workspaceStatus = useV2WorkspaceNotificationStatus(id);
	const {
		cancelRename,
		handleClick,
		handleCopyPath,
		handleCopyBranchName,
		handleCreateSection,
		handleDeleted,
		handleOpenInFinder,
		handleRemoveFromSidebar,
		handleToggleUnread,
		isActive,
		isDeleteDialogOpen,
		isUnread,
		isRenaming,
		moveWorkspaceToSection,
		renameValue,
		setIsDeleteDialogOpen,
		setRenameValue,
		startRename,
		submitRename,
	} = useDashboardSidebarWorkspaceItemActions({
		workspaceId: id,
		projectId,
		workspaceName: name,
		branch,
		isMainWorkspace,
	});

	const { v2Workspaces: v2WorkspaceActions } = useOptimisticCollectionActions();
	const [renameBranchTarget, setRenameBranchTarget] = useState<string | null>(
		null,
	);
	const handleAfterBranchRename = (newBranchName: string) => {
		v2WorkspaceActions.updateWorkspace(id, { branch: newBranchName });
	};
	const isPending = pendingTransaction?.type === "insert";
	// Keep the delete dialog outside the hidden wrapper below — the destroy
	// flow reopens it into an error pane on conflict/teardown-failed.
	const isDeleting = useDeletingWorkspaces().isDeleting(id);

	const {
		hoveredId: hoverHoveredId,
		requestOpen: hoverRequestOpen,
		requestClose: hoverRequestClose,
		syncIfHovered: hoverSyncIfHovered,
	} = useDashboardSidebarHover();
	const rowRef = useRef<HTMLDivElement>(null);
	const hoverEligible = !isPending;
	const hoverPayload = useMemo(
		() => ({ workspace, onEditBranchClick: setRenameBranchTarget }),
		[workspace],
	);

	const handleMouseEnter = useCallback(() => {
		if (!hoverEligible || !rowRef.current) return;
		hoverRequestOpen(id, rowRef.current, hoverPayload);
	}, [hoverEligible, hoverRequestOpen, id, hoverPayload]);
	const handleMouseLeave = useCallback(() => {
		if (!hoverEligible) return;
		hoverRequestClose(id);
	}, [hoverEligible, hoverRequestClose, id]);
	const openWorkspaceContextMenu = useCallback(
		(event: ReactMouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			const row = rowRef.current;
			if (!row) return;
			const rect = row.getBoundingClientRect();
			row.dispatchEvent(
				new MouseEvent("contextmenu", {
					bubbles: true,
					cancelable: true,
					clientX: rect.left + Math.max(8, Math.min(rect.width - 8, 220)),
					clientY: rect.top + rect.height / 2,
					view: window,
				}),
			);
		},
		[],
	);

	const isHovered = hoverHoveredId === id;
	useEffect(() => {
		if (isHovered && hostType === "local-device") onHoverCardOpen?.();
	}, [isHovered, hostType, onHoverCardOpen]);
	useEffect(() => {
		if (!isHovered) return;
		hoverSyncIfHovered(id, hoverPayload);
	}, [isHovered, hoverSyncIfHovered, id, hoverPayload]);

	if (isCollapsed) {
		const content = (
			// biome-ignore lint/a11y/noStaticElementInteractions: hover handlers drive a non-interactive popover, no new keyboard semantics
			<div
				ref={rowRef}
				data-dashboard-sidebar-action-scope
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				className="relative flex w-full justify-center"
			>
				{(accentColor || isActive) && (
					<div
						className="absolute inset-y-0 left-0 w-0.5"
						style={{
							backgroundColor: accentColor ?? "var(--color-foreground)",
						}}
					/>
				)}
				<DashboardSidebarCollapsedWorkspaceButton
					hostType={hostType}
					workspaceType={workspace.type}
					hostIsOnline={hostIsOnline}
					isActive={isActive}
					workspaceStatus={workspaceStatus}
					onClick={handleClick}
					isCreatePending={isPending}
					pullRequestState={pullRequest?.state ?? null}
					aria-label={isPending ? `Creating workspace: ${name}` : undefined}
				/>
				{!isPending && (
					<>
						<button
							type="button"
							data-dashboard-sidebar-action="menu"
							tabIndex={-1}
							aria-keyshortcuts="."
							onClick={openWorkspaceContextMenu}
							className="sr-only"
						>
							Show workspace actions
						</button>
						<button
							type="button"
							data-dashboard-sidebar-action="create-folder"
							tabIndex={-1}
							aria-keyshortcuts="N"
							onClick={(event) => {
								event.stopPropagation();
								handleCreateSection();
							}}
							className="sr-only"
						>
							Create group from workspace
						</button>
						<button
							type="button"
							data-dashboard-sidebar-action="move"
							tabIndex={-1}
							aria-keyshortcuts="m"
							onClick={openWorkspaceContextMenu}
							className="sr-only"
						>
							Move workspace to group
						</button>
						{isInSection && (
							<button
								type="button"
								data-dashboard-sidebar-action="remove-from-folder"
								tabIndex={-1}
								aria-keyshortcuts="F"
								onClick={(event) => {
									event.stopPropagation();
									moveWorkspaceToSection(id, projectId, null);
								}}
								className="sr-only"
							>
								Ungroup workspace
							</button>
						)}
						{!isMainWorkspace && (
							<>
								<button
									type="button"
									data-dashboard-sidebar-action="archive"
									tabIndex={-1}
									aria-keyshortcuts="a x"
									onClick={(event) => {
										event.stopPropagation();
										handleRemoveFromSidebar();
									}}
									className="sr-only"
								>
									Remove workspace from sidebar
								</button>
								<button
									type="button"
									data-dashboard-sidebar-action="delete"
									tabIndex={-1}
									aria-keyshortcuts="d"
									onClick={(event) => {
										event.stopPropagation();
										setIsDeleteDialogOpen(true);
									}}
									className="sr-only"
								>
									Delete workspace
								</button>
							</>
						)}
					</>
				)}
			</div>
		);

		return (
			<>
				<div hidden={isDeleting}>
					{isPending ? (
						content
					) : (
						<DashboardSidebarWorkspaceContextMenu
							projectId={projectId}
							isInSection={isInSection}
							isUnread={isUnread}
							isLocalWorkspace={hostType === "local-device"}
							isPinned={isMainWorkspace && hostType === "local-device"}
							onCreateSection={handleCreateSection}
							showDeleteHotkey={isActive}
							onMoveToSection={(targetSectionId) =>
								moveWorkspaceToSection(id, projectId, targetSectionId)
							}
							onOpenInFinder={handleOpenInFinder}
							onCopyPath={handleCopyPath}
							onCopyBranchName={handleCopyBranchName}
							onRemoveFromSidebar={handleRemoveFromSidebar}
							onRename={startRename}
							onDelete={
								isMainWorkspace ? undefined : () => setIsDeleteDialogOpen(true)
							}
							onToggleUnread={handleToggleUnread}
						>
							{content}
						</DashboardSidebarWorkspaceContextMenu>
					)}
				</div>

				{!isPending && !isMainWorkspace && (
					<DashboardSidebarDeleteDialog
						workspaceId={id}
						workspaceName={name || branch}
						open={isDeleteDialogOpen}
						onOpenChange={setIsDeleteDialogOpen}
						onDeleted={handleDeleted}
					/>
				)}
				{renameBranchTarget && (
					<RenameBranchDialog
						workspaceId={id}
						currentBranchName={renameBranchTarget}
						open={renameBranchTarget !== null}
						onOpenChange={(open) => {
							if (!open) setRenameBranchTarget(null);
						}}
						onAfterRename={handleAfterBranchRename}
					/>
				)}
			</>
		);
	}

	const expandedContent = (
		// biome-ignore lint/a11y/noStaticElementInteractions: hover handlers drive a non-interactive popover, no new keyboard semantics
		<div
			ref={rowRef}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<DashboardSidebarExpandedWorkspaceRow
				workspace={workspace}
				isActive={isActive}
				isRenaming={isRenaming}
				renameValue={renameValue}
				shortcutLabel={shortcutLabel}
				diffStats={isPending ? null : diffStats}
				workspaceStatus={workspaceStatus}
				isInSection={isInSection}
				onClick={handleClick}
				onDoubleClick={isPending ? undefined : startRename}
				onCreateSectionClick={handleCreateSection}
				onMenuClick={openWorkspaceContextMenu}
				onMoveClick={openWorkspaceContextMenu}
				onRemoveFromSectionClick={
					isInSection
						? () => moveWorkspaceToSection(id, projectId, null)
						: undefined
				}
				onRemoveFromSidebarClick={handleRemoveFromSidebar}
				onCloseWorkspaceClick={() => setIsDeleteDialogOpen(true)}
				onRenameClick={isPending ? undefined : startRename}
				onRenameValueChange={setRenameValue}
				onSubmitRename={submitRename}
				onCancelRename={cancelRename}
			/>
		</div>
	);

	return (
		<>
			<div hidden={isDeleting}>
				{isPending ? (
					expandedContent
				) : (
					<DashboardSidebarWorkspaceContextMenu
						projectId={projectId}
						isInSection={isInSection}
						isUnread={isUnread}
						onCreateSection={handleCreateSection}
						onMoveToSection={(targetSectionId) =>
							moveWorkspaceToSection(id, projectId, targetSectionId)
						}
						isLocalWorkspace={hostType === "local-device"}
						isPinned={isMainWorkspace && hostType === "local-device"}
						onOpenInFinder={handleOpenInFinder}
						showDeleteHotkey={isActive}
						onCopyPath={handleCopyPath}
						onCopyBranchName={handleCopyBranchName}
						onRemoveFromSidebar={handleRemoveFromSidebar}
						onRename={startRename}
						onDelete={
							isMainWorkspace ? undefined : () => setIsDeleteDialogOpen(true)
						}
						onToggleUnread={handleToggleUnread}
					>
						{expandedContent}
					</DashboardSidebarWorkspaceContextMenu>
				)}
			</div>

			{!isPending && !isMainWorkspace && (
				<DashboardSidebarDeleteDialog
					workspaceId={id}
					workspaceName={name || branch}
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					onDeleted={handleDeleted}
				/>
			)}
			{renameBranchTarget && (
				<RenameBranchDialog
					workspaceId={id}
					currentBranchName={renameBranchTarget}
					open={renameBranchTarget !== null}
					onOpenChange={(open) => {
						if (!open) setRenameBranchTarget(null);
					}}
					onAfterRename={handleAfterBranchRename}
				/>
			)}
		</>
	);
}
