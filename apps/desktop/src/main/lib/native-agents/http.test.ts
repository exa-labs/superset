import { describe, expect, it } from "bun:test";
import { redactNativeAgentSecrets } from "./http";

describe("redactNativeAgentSecrets", () => {
	it("removes provider tokens from errors", () => {
		const redacted = redactNativeAgentSecrets(
			"Bearer capy_abc apk_user_def apk_xyz cog_qrs",
		);
		expect(redacted).not.toContain("capy_abc");
		expect(redacted).not.toContain("apk_user_def");
		expect(redacted).not.toContain("apk_xyz");
		expect(redacted).not.toContain("cog_qrs");
		expect(redacted).toContain("[redacted]");
	});
});
