import { describe, expect, it } from "bun:test";
import {
	formatNativeAgentDiagnosticsQuery,
	formatNativeAgentDiagnosticsQueryGroup,
	formatNativeAgentDiagnosticsTime,
	formatNativeAgentDiagnosticsTimestamp,
	nativeAgentMineEvidenceSummary,
	nativeAgentMinePolicySummary,
	nativeAgentSidebarFlagSummary,
	summarizeNativeAgentDiagnosticsFreshness,
} from "./native-agent-diagnostics";

describe("native agent diagnostics", () => {
	const now = new Date("2026-06-01T12:00:00.000Z").getTime();

	it("formats freshness ages compactly", () => {
		expect(formatNativeAgentDiagnosticsTime(0, now)).toBe("never");
		expect(formatNativeAgentDiagnosticsTime(now - 250, now)).toBe("now");
		expect(formatNativeAgentDiagnosticsTime(now - 12_000, now)).toBe("12s ago");
		expect(formatNativeAgentDiagnosticsTime(now - 5 * 60_000, now)).toBe(
			"5m ago",
		);
	});

	it("includes fetching and error state in query summaries", () => {
		expect(
			formatNativeAgentDiagnosticsQuery(
				{
					dataUpdatedAt: now - 12_000,
					error: new Error("rate limited"),
					isFetching: true,
				},
				now,
			),
		).toContain("12s ago @");
		expect(
			formatNativeAgentDiagnosticsQuery(
				{
					dataUpdatedAt: now - 12_000,
					error: new Error("rate limited"),
					isFetching: true,
				},
				now,
			),
		).toContain("/ fetching / error: rate limited");
	});

	it("summarizes grouped query freshness for provider-level last poll", () => {
		expect(formatNativeAgentDiagnosticsQueryGroup([], now)).toBe("never");
		expect(
			formatNativeAgentDiagnosticsQueryGroup(
				[{ dataUpdatedAt: 0, isFetching: false }],
				now,
			),
		).toBe("never");
		expect(
			formatNativeAgentDiagnosticsQueryGroup(
				[{ dataUpdatedAt: 0, isFetching: true }],
				now,
			),
		).toBe("never / 1 fetching");
		const summary = formatNativeAgentDiagnosticsQueryGroup(
			[
				{
					dataUpdatedAt: now - 30_000,
					isFetching: false,
				},
				{
					dataUpdatedAt: now - 5_000,
					error: "offline",
					isFetching: true,
				},
			],
			now,
		);

		expect(summary).toContain("last 5s ago @");
		expect(summary).toContain("/ 1 fetching / 1 error");
	});

	it("formats exact timestamps for poll diagnostics", () => {
		expect(formatNativeAgentDiagnosticsTimestamp(0)).toBe("never");
		expect(formatNativeAgentDiagnosticsTimestamp(now)).toMatch(
			/\d{2}:\d{2}:\d{2}/,
		);
	});

	it("summarizes freshness health with stale and error states", () => {
		expect(summarizeNativeAgentDiagnosticsFreshness([], { now })).toMatchObject(
			{
				label: "unknown",
				tone: "unknown",
			},
		);
		expect(
			summarizeNativeAgentDiagnosticsFreshness(
				[{ dataUpdatedAt: now - 30_000, isFetching: false }],
				{ now },
			),
		).toMatchObject({ label: "fresh", tone: "fresh" });
		expect(
			summarizeNativeAgentDiagnosticsFreshness(
				[{ dataUpdatedAt: now - 5 * 60_000, isFetching: false }],
				{ now, staleAfterMs: 2 * 60_000 },
			),
		).toMatchObject({ label: "stale (5m ago)", tone: "stale" });
		expect(
			summarizeNativeAgentDiagnosticsFreshness(
				[
					{
						dataUpdatedAt: now - 30_000,
						error: new Error("offline"),
						isFetching: true,
					},
				],
				{ now },
			),
		).toMatchObject({
			errorCount: 1,
			fetchingCount: 1,
			label: "1 error",
			tone: "error",
		});
	});

	it("summarizes sidebar flags without leaking implementation details", () => {
		expect(nativeAgentSidebarFlagSummary({})).toBe("auto");
		expect(nativeAgentSidebarFlagSummary({ sidebarPinned: true })).toBe(
			"pinned",
		);
		expect(
			nativeAgentSidebarFlagSummary({
				sidebarHidden: true,
				sidebarPinned: true,
			}),
		).toBe("pinned, hidden");
	});

	it("summarizes provider mine policies for diagnostics", () => {
		expect(
			nativeAgentMinePolicySummary({
				projectId: "project-1",
				provider: "capy",
				userEmail: "lakee@exa.ai",
			}),
		).toBe("lakee@exa.ai creator-only in project-1");
		expect(
			nativeAgentMinePolicySummary({
				provider: "devin",
				userEmail: "lakee@exa.ai",
			}),
		).toBe("lakee@exa.ai requesting-user");
	});

	it("summarizes selected-session mine evidence for diagnostics", () => {
		expect(
			nativeAgentMineEvidenceSummary({
				createdLocally: true,
				provider: "capy",
				userEmail: "lakee@exa.ai",
			}),
		).toBe("created locally");
		expect(
			nativeAgentMineEvidenceSummary({
				ownershipVerified: true,
				provider: "capy",
				userEmail: "lakee@exa.ai",
			}),
		).toBe("ownership verified");
		expect(
			nativeAgentMineEvidenceSummary({
				provider: "capy",
				userEmail: "lakee@exa.ai",
			}),
		).toBe("Capy creator-only API filter");
		expect(
			nativeAgentMineEvidenceSummary({
				provider: "devin",
				requestingUserEmail: "Lakee@exa.ai",
				userEmail: "lakee@exa.ai",
			}),
		).toBe("requesting-user lakee@exa.ai");
		expect(
			nativeAgentMineEvidenceSummary({
				provider: "devin",
				requestingUserEmail: "friend@exa.ai",
				userEmail: "lakee@exa.ai",
			}),
		).toBe("requesting-user mismatch friend@exa.ai");
	});
});
