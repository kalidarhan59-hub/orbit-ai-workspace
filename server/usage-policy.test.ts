import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const policy = readFileSync(new URL("../docs/usage-policy.md", import.meta.url), "utf8");

describe("ORBIT usage policy", () => {
  it("documents unlimited cumulative app usage without a local quota ledger", () => {
    expect(policy).toContain("no application-level credit ledger");
    expect(policy).toContain("per-user usage quota");
    expect(policy).not.toMatch(/daily message counter.*implemented/i);
  });

  it("keeps safeguards scoped to individual request handling", () => {
    expect(policy).toContain("12,000 characters");
    expect(policy).toContain("16 MB");
    expect(policy).toContain("up to five attachments");
  });
});
