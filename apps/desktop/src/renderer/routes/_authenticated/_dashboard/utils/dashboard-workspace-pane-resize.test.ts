import { describe, expect, it } from "bun:test";
import type { LayoutNode } from "@superset/panes";
import type { MosaicNode } from "react-mosaic-component";
import {
	resizeMosaicWorkspacePane,
	resolveV2WorkspacePaneResize,
	swapMosaicWorkspacePanes,
	swapV2WorkspacePanes,
} from "./dashboard-workspace-pane-resize";

describe("dashboard workspace pane resize", () => {
	it("resolves v2 split resize from the focused pane branch", () => {
		const layout: LayoutNode = {
			type: "split",
			direction: "horizontal",
			first: { type: "pane", paneId: "left" },
			second: { type: "pane", paneId: "right" },
			splitPercentage: 50,
		};

		expect(
			resolveV2WorkspacePaneResize({
				direction: "widen",
				layout,
				paneId: "left",
			}),
		).toEqual({ path: [], splitPercentage: 60 });
		expect(
			resolveV2WorkspacePaneResize({
				direction: "widen",
				layout,
				paneId: "right",
			}),
		).toEqual({ path: [], splitPercentage: 40 });
	});

	it("clamps v2 split resize percentages", () => {
		const layout: LayoutNode = {
			type: "split",
			direction: "horizontal",
			first: { type: "pane", paneId: "left" },
			second: { type: "pane", paneId: "right" },
			splitPercentage: 84,
		};

		expect(
			resolveV2WorkspacePaneResize({
				direction: "widen",
				layout,
				paneId: "left",
			})?.splitPercentage,
		).toBe(85);
	});

	it("resizes legacy Mosaic layout around the focused pane", () => {
		const layout: MosaicNode<string> = {
			direction: "row",
			first: "left",
			second: "right",
			splitPercentage: 50,
		};

		expect(
			resizeMosaicWorkspacePane({
				direction: "narrow",
				layout,
				paneId: "left",
			}),
		).toEqual({
			direction: "row",
			first: "left",
			second: "right",
			splitPercentage: 40,
		});
	});

	it("returns null when the focused pane has no parent split", () => {
		expect(
			resolveV2WorkspacePaneResize({
				direction: "widen",
				layout: { type: "pane", paneId: "only" },
				paneId: "only",
			}),
		).toBeNull();
		expect(
			resizeMosaicWorkspacePane({
				direction: "widen",
				layout: "only",
				paneId: "only",
			}),
		).toBeNull();
	});

	it("swaps v2 pane ids without changing split structure", () => {
		const layout: LayoutNode = {
			type: "split",
			direction: "horizontal",
			first: { type: "pane", paneId: "left" },
			second: {
				type: "split",
				direction: "vertical",
				first: { type: "pane", paneId: "top-right" },
				second: { type: "pane", paneId: "bottom-right" },
				splitPercentage: 45,
			},
			splitPercentage: 55,
		};

		expect(
			swapV2WorkspacePanes({
				firstPaneId: "left",
				layout,
				secondPaneId: "bottom-right",
			}),
		).toEqual({
			type: "split",
			direction: "horizontal",
			first: { type: "pane", paneId: "bottom-right" },
			second: {
				type: "split",
				direction: "vertical",
				first: { type: "pane", paneId: "top-right" },
				second: { type: "pane", paneId: "left" },
				splitPercentage: 45,
			},
			splitPercentage: 55,
		});
	});

	it("swaps legacy Mosaic pane ids without changing split structure", () => {
		const layout: MosaicNode<string> = {
			direction: "row",
			first: "left",
			second: {
				direction: "column",
				first: "top-right",
				second: "bottom-right",
				splitPercentage: 45,
			},
			splitPercentage: 55,
		};

		expect(
			swapMosaicWorkspacePanes({
				firstPaneId: "left",
				layout,
				secondPaneId: "bottom-right",
			}),
		).toEqual({
			direction: "row",
			first: "bottom-right",
			second: {
				direction: "column",
				first: "top-right",
				second: "left",
				splitPercentage: 45,
			},
			splitPercentage: 55,
		});
	});

	it("returns null when a swap pane is missing", () => {
		expect(
			swapV2WorkspacePanes({
				firstPaneId: "left",
				layout: { type: "pane", paneId: "left" },
				secondPaneId: "missing",
			}),
		).toBeNull();
		expect(
			swapMosaicWorkspacePanes({
				firstPaneId: "left",
				layout: "left",
				secondPaneId: "missing",
			}),
		).toBeNull();
	});
});
