import { describe, expect, it } from "bun:test";

const dashboardLayoutPath = `${import.meta.dir}/../layout.tsx`;
const authenticatedLayoutPath = `${import.meta.dir}/../../layout.tsx`;

describe("dashboard view MRU focus wiring", () => {
	it("recovers navigation-shell focus after dashboard MRU route switches", async () => {
		const source = await Bun.file(dashboardLayoutPath).text();

		expect(source).toContain("scheduleDashboardNavigationShellFocus");
		expect(source).toMatch(
			/void navigate\(\{ to: target\.path \}\);\s*scheduleDashboardNavigationShellFocus\(\);/,
		);
	});

	it("recovers navigation-shell focus after authenticated-shell MRU route switches", async () => {
		const source = await Bun.file(authenticatedLayoutPath).text();

		expect(source).toContain("scheduleDashboardNavigationShellFocus");
		expect(source).toMatch(
			/void navigate\(\{ to: target\.path \}\);\s*scheduleDashboardNavigationShellFocus\(\);/,
		);
	});
});
