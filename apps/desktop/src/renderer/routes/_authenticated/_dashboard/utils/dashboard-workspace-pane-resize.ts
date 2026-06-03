import type { LayoutNode, SplitBranch, SplitPath } from "@superset/panes";
import type { MosaicBranch, MosaicNode } from "react-mosaic-component";

export type DashboardWorkspacePaneResizeDirection = "narrow" | "widen";

const DEFAULT_SPLIT_PERCENTAGE = 50;
const DEFAULT_RESIZE_STEP = 10;
const MIN_SPLIT_PERCENTAGE = 15;
const MAX_SPLIT_PERCENTAGE = 85;

function clampSplitPercentage(value: number): number {
	return Math.max(MIN_SPLIT_PERCENTAGE, Math.min(MAX_SPLIT_PERCENTAGE, value));
}

function nextSplitPercentage({
	activeBranch,
	current,
	direction,
	step = DEFAULT_RESIZE_STEP,
}: {
	activeBranch: "first" | "second";
	current: number;
	direction: DashboardWorkspacePaneResizeDirection;
	step?: number;
}): number {
	const sign =
		(direction === "widen" && activeBranch === "first") ||
		(direction === "narrow" && activeBranch === "second")
			? 1
			: -1;
	return clampSplitPercentage(current + sign * step);
}

function v2PanePath(
	node: LayoutNode,
	paneId: string,
	currentPath: SplitBranch[] = [],
): SplitPath | null {
	if (node.type === "pane") return node.paneId === paneId ? currentPath : null;
	return (
		v2PanePath(node.first, paneId, [...currentPath, "first"]) ??
		v2PanePath(node.second, paneId, [...currentPath, "second"])
	);
}

function v2NodeAtPath(node: LayoutNode, path: SplitPath): LayoutNode | null {
	let current: LayoutNode = node;
	for (const branch of path) {
		if (current.type !== "split") return null;
		current = current[branch];
	}
	return current;
}

export function resolveV2WorkspacePaneResize({
	direction,
	layout,
	paneId,
}: {
	direction: DashboardWorkspacePaneResizeDirection;
	layout: LayoutNode;
	paneId: string;
}): { path: SplitPath; splitPercentage: number } | null {
	const path = v2PanePath(layout, paneId);
	if (!path || path.length === 0) return null;
	const activeBranch = path[path.length - 1];
	const parentPath = path.slice(0, -1);
	const parent = v2NodeAtPath(layout, parentPath);
	if (!activeBranch || !parent || parent.type !== "split") return null;
	return {
		path: parentPath,
		splitPercentage: nextSplitPercentage({
			activeBranch,
			current: parent.splitPercentage ?? DEFAULT_SPLIT_PERCENTAGE,
			direction,
		}),
	};
}

function mosaicPanePath(
	node: MosaicNode<string>,
	paneId: string,
	currentPath: MosaicBranch[] = [],
): MosaicBranch[] | null {
	if (typeof node === "string") return node === paneId ? currentPath : null;
	return (
		mosaicPanePath(node.first, paneId, [...currentPath, "first"]) ??
		mosaicPanePath(node.second, paneId, [...currentPath, "second"])
	);
}

function updateMosaicAtPath(
	node: MosaicNode<string>,
	path: MosaicBranch[],
	updater: (node: MosaicNode<string>) => MosaicNode<string>,
): MosaicNode<string> {
	if (path.length === 0) return updater(node);
	if (typeof node === "string") return node;
	const [branch, ...rest] = path as [MosaicBranch, ...MosaicBranch[]];
	return {
		...node,
		[branch]: updateMosaicAtPath(node[branch], rest, updater),
	};
}

function mosaicNodeAtPath(
	node: MosaicNode<string>,
	path: MosaicBranch[],
): MosaicNode<string> | null {
	let current: MosaicNode<string> = node;
	for (const branch of path) {
		if (typeof current === "string") return null;
		current = current[branch];
	}
	return current;
}

export function resizeMosaicWorkspacePane({
	direction,
	layout,
	paneId,
}: {
	direction: DashboardWorkspacePaneResizeDirection;
	layout: MosaicNode<string>;
	paneId: string;
}): MosaicNode<string> | null {
	const path = mosaicPanePath(layout, paneId);
	if (!path || path.length === 0) return null;
	const activeBranch = path[path.length - 1];
	const parentPath = path.slice(0, -1);
	const parent = mosaicNodeAtPath(layout, parentPath);
	if (!activeBranch || !parent || typeof parent === "string") return null;
	const splitPercentage = nextSplitPercentage({
		activeBranch,
		current: parent.splitPercentage ?? DEFAULT_SPLIT_PERCENTAGE,
		direction,
	});
	return updateMosaicAtPath(layout, parentPath, (node) =>
		typeof node === "string" ? node : { ...node, splitPercentage },
	);
}

export function swapV2WorkspacePanes({
	firstPaneId,
	layout,
	secondPaneId,
}: {
	firstPaneId: string;
	layout: LayoutNode;
	secondPaneId: string;
}): LayoutNode | null {
	if (firstPaneId === secondPaneId) return null;
	if (!v2PanePath(layout, firstPaneId) || !v2PanePath(layout, secondPaneId)) {
		return null;
	}

	const swap = (node: LayoutNode): LayoutNode => {
		if (node.type === "pane") {
			if (node.paneId === firstPaneId)
				return { type: "pane", paneId: secondPaneId };
			if (node.paneId === secondPaneId)
				return { type: "pane", paneId: firstPaneId };
			return node;
		}

		return {
			...node,
			first: swap(node.first),
			second: swap(node.second),
		};
	};

	return swap(layout);
}

export function swapMosaicWorkspacePanes({
	firstPaneId,
	layout,
	secondPaneId,
}: {
	firstPaneId: string;
	layout: MosaicNode<string>;
	secondPaneId: string;
}): MosaicNode<string> | null {
	if (firstPaneId === secondPaneId) return null;
	if (
		!mosaicPanePath(layout, firstPaneId) ||
		!mosaicPanePath(layout, secondPaneId)
	) {
		return null;
	}

	const swap = (node: MosaicNode<string>): MosaicNode<string> => {
		if (typeof node === "string") {
			if (node === firstPaneId) return secondPaneId;
			if (node === secondPaneId) return firstPaneId;
			return node;
		}

		return {
			...node,
			first: swap(node.first),
			second: swap(node.second),
		};
	};

	return swap(layout);
}
