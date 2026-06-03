import { describe, expect, it } from "bun:test";
import type { LayoutNode } from "@superset/panes";
import type { MosaicNode } from "react-mosaic-component";
import {
	resizeMosaicWorkspacePane,
	resolveV2WorkspacePaneResize,
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
});
