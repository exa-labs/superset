import { describe, expect, it } from "bun:test";
import {
	dashboardSidebarNavigationIntentPath,
	resolveDashboardSidebarNavigationIntent,
} from "./dashboard-sidebar-navigation-intent";

class MockElement {
	readonly children: MockElement[] = [];
	parent: MockElement | null = null;

	constructor(private readonly attributes: Record<string, string> = {}) {}

	append(child: MockElement) {
		child.parent = this;
		this.children.push(child);
	}

	closest(selector: string): MockElement | null {
		const requiredAttributes = selector
			.match(/\[[^\]]+\]/g)
			?.map((part) => part.slice(1, -1)) ?? [selector.slice(1, -1)];
		let current: MockElement | null = this;
		while (current) {
			const candidate: MockElement = current;
			if (
				requiredAttributes.every((attribute) =>
					Object.hasOwn(candidate.attributes, attribute),
				)
			) {
				return candidate;
			}
			current = candidate.parent;
		}
		return null;
	}

	getAttribute(name: string): string | null {
		return this.attributes[name] ?? null;
	}
}

(globalThis as { Element?: unknown }).Element = MockElement;

describe("resolveDashboardSidebarNavigationIntent", () => {
	it("resolves native provider header clicks from child nodes", () => {
		const button = new MockElement({
			"data-dashboard-native-provider-trigger": "devin",
		});
		const label = new MockElement();
		button.append(label);

		expect(
			resolveDashboardSidebarNavigationIntent(label as unknown as Element),
		).toEqual({
			type: "native-provider",
			provider: "devin",
		});
	});

	it("resolves native session row clicks", () => {
		const button = new MockElement({
			"data-native-agent-session-row-id": "devin-123",
			"data-native-agent-session-row-provider": "devin",
		});

		expect(
			resolveDashboardSidebarNavigationIntent(button as unknown as Element),
		).toEqual({
			type: "native-session",
			provider: "devin",
			id: "devin-123",
		});
	});

	it("resolves browser tab and app clicks", () => {
		const tabButton = new MockElement({
			"data-dashboard-web-tab-row-button": "chrome-1",
		});
		expect(
			resolveDashboardSidebarNavigationIntent(tabButton as unknown as Element),
		).toEqual({
			type: "web-tab",
			tabId: "chrome-1",
		});

		const appButton = new MockElement({
			"data-dashboard-web-app-trigger": "chrome",
		});
		expect(
			resolveDashboardSidebarNavigationIntent(appButton as unknown as Element),
		).toEqual({
			type: "web-app",
			appId: "chrome",
		});
	});

	it("resolves web page clicks", () => {
		const button = new MockElement({
			"data-dashboard-web-page-trigger": "overseer",
		});

		expect(
			resolveDashboardSidebarNavigationIntent(button as unknown as Element),
		).toEqual({
			type: "web-page",
			pageId: "overseer",
		});
	});

	it("ignores unknown native providers", () => {
		const button = new MockElement({
			"data-dashboard-native-provider-trigger": "other",
		});

		expect(
			resolveDashboardSidebarNavigationIntent(button as unknown as Element),
		).toBeNull();
	});

	it("resolves exact fallback paths for sidebar navigation intents", () => {
		expect(
			dashboardSidebarNavigationIntentPath({
				type: "native-provider",
				provider: "capy",
			}),
		).toBe("/native/capy");
		expect(
			dashboardSidebarNavigationIntentPath({
				type: "native-session",
				provider: "devin",
				id: "devin/with slash",
			}),
		).toBe("/native/devin/devin%2Fwith%20slash");
		expect(
			dashboardSidebarNavigationIntentPath({
				type: "web-page",
				pageId: "inference overview",
			}),
		).toBe("/web/inference%20overview");
		expect(
			dashboardSidebarNavigationIntentPath({
				type: "web-tab",
				tabId: "chrome-default",
			}),
		).toBe("/web-tabs/chrome-default");
		expect(
			dashboardSidebarNavigationIntentPath({
				type: "web-app",
				appId: "chrome",
			}),
		).toBeNull();
	});
});
