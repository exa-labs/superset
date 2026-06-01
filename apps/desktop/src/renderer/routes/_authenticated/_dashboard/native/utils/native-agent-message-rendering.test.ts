import { describe, expect, it } from "bun:test";
import {
	devinSessionAppUrl,
	formatNativeAgentFileSize,
	isNativeAgentImageAttachment,
	markdownWithNativeAgentLinks,
	nativeAgentAssetPreviewUrl,
	normalizeDevinAppUrl,
	orderNativeAgentMessagesOldestFirst,
	parseNativeAgentMessageParts,
	shouldProxyNativeAgentAsset,
} from "./native-agent-message-rendering";

describe("native agent message rendering", () => {
	it("parses attachments and system reminders out of message text", () => {
		const parts = parseNativeAgentMessageParts(
			`Done\nATTACHMENT:{"url":"https://app.devin.ai/attachments/a/01-overview.png","fileSize":2048}\n<system_reminder>hidden detail</system_reminder>`,
		);

		expect(parts.map((part) => part.kind)).toEqual([
			"text",
			"attachment",
			"text",
			"systemReminder",
		]);
		expect(parts[1]).toMatchObject({
			attachment: {
				fileName: "01-overview.png",
				fileSize: 2048,
				url: "https://app.devin.ai/attachments/a/01-overview.png",
			},
			kind: "attachment",
		});
		expect(parts[3]).toMatchObject({
			kind: "systemReminder",
			value: "hidden detail",
		});
	});

	it("parses multiple attachments with nested metadata without leaking raw payloads", () => {
		const parts = parseNativeAgentMessageParts(
			[
				"Files:",
				`ATTACHMENT:{"url":"https://app.devin.ai/attachments/a/main.pdf","fileSize":134034,"metadata":{"kind":"report"}}`,
				"and",
				`ATTACHMENT: {"url":"https://app.devin.ai/attachments/b/main.tex","fileSize":44357}`,
				"done",
			].join(" "),
		);

		expect(parts.map((part) => part.kind)).toEqual([
			"text",
			"attachment",
			"text",
			"attachment",
			"text",
		]);
		expect(parts[0]).toMatchObject({ kind: "text", value: "Files: " });
		expect(parts[1]).toMatchObject({
			attachment: {
				fileName: "main.pdf",
				fileSize: 134034,
				url: "https://app.devin.ai/attachments/a/main.pdf",
			},
			kind: "attachment",
		});
		expect(parts[2]).toMatchObject({ kind: "text", value: " and " });
		expect(parts[3]).toMatchObject({
			attachment: {
				fileName: "main.tex",
				fileSize: 44357,
				url: "https://app.devin.ai/attachments/b/main.tex",
			},
			kind: "attachment",
		});
		expect(
			parts
				.filter((part) => part.kind === "text")
				.map((part) => part.value)
				.join(""),
		).not.toContain("ATTACHMENT:");
	});

	it("promotes bare native-agent image URLs to inline attachments", () => {
		const parts = parseNativeAgentMessageParts(
			`Screenshot: https://app.devin.ai/attachments/bb79a64c-6e83-4aad-82f8-c9b2a6b5cbd6/01-overview.png`,
		);

		expect(parts.map((part) => part.kind)).toEqual(["text", "attachment"]);
		expect(parts[1]).toMatchObject({
			attachment: {
				fileName: "01-overview.png",
				fileSize: null,
				url: "https://app.devin.ai/attachments/bb79a64c-6e83-4aad-82f8-c9b2a6b5cbd6/01-overview.png",
			},
			kind: "attachment",
		});
	});

	it("formats PR references as markdown links", () => {
		expect(markdownWithNativeAgentLinks("[[pr:exa-labs/monorepo#45452]]")).toBe(
			"[exa-labs/monorepo#45452](https://github.com/exa-labs/monorepo/pull/45452)",
		);
	});

	it("formats bare GitHub PR URLs as compact markdown links", () => {
		expect(
			markdownWithNativeAgentLinks(
				"See https://github.com/exa-labs/monorepo/pull/45452 for details.",
			),
		).toBe(
			"See [exa-labs/monorepo#45452](https://github.com/exa-labs/monorepo/pull/45452) for details.",
		);
	});

	it("does not rewrite GitHub PR URLs already inside markdown link targets", () => {
		expect(
			markdownWithNativeAgentLinks(
				"[existing](https://github.com/exa-labs/monorepo/pull/45452)",
			),
		).toBe("[existing](https://github.com/exa-labs/monorepo/pull/45452)");
	});

	it("normalizes Devin session URLs without a devin- prefix in app paths", () => {
		expect(devinSessionAppUrl("devin-c431e06a597941e094540708c5c661aa")).toBe(
			"https://app.devin.ai/sessions/c431e06a597941e094540708c5c661aa",
		);
		expect(
			normalizeDevinAppUrl(
				"https://app.devin.ai/sessions/devin-c431e06a597941e094540708c5c661aa",
			),
		).toBe("https://app.devin.ai/sessions/c431e06a597941e094540708c5c661aa");
	});

	it("proxies only native-agent assets and detects image attachments", () => {
		const imageUrl = "https://app.devin.ai/attachments/a/01-overview.png";
		expect(shouldProxyNativeAgentAsset(imageUrl)).toBe(true);
		expect(shouldProxyNativeAgentAsset("https://example.com/image.png")).toBe(
			false,
		);
		expect(nativeAgentAssetPreviewUrl(imageUrl)).toContain(
			"superset-native-agent-asset://image/?url=",
		);
		expect(
			isNativeAgentImageAttachment({
				fileName: "01-overview.png",
				fileSize: null,
				url: imageUrl,
			}),
		).toBe(true);
		expect(formatNativeAgentFileSize(2048)).toBe("2.0 KB");
	});

	it("orders messages oldest-first and keeps invalid timestamps last", () => {
		expect(
			orderNativeAgentMessagesOldestFirst([
				{ createdAt: "bad", id: "unknown" },
				{ createdAt: "2026-06-01T12:00:00Z", id: "new" },
				{ createdAt: "2026-06-01T11:00:00Z", id: "old" },
			]).map((message) => message.id),
		).toEqual(["old", "new", "unknown"]);
	});
});
