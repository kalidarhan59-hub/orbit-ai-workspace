import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routersSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const databaseSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("ORBIT runtime usage behavior", () => {
  it("keeps chat and image flows free of local cumulative quota gates", () => {
    const runtimeSource = `${routersSource}\n${databaseSource}`;
    expect(runtimeSource).toContain("send: protectedProcedure");
    expect(runtimeSource).toContain("generateImage");
    expect(runtimeSource).toContain("invokeLLM");
    expect(runtimeSource).not.toMatch(/usageCount|usageLimit|messageLimit|generationLimit|quotaRemaining|dailyQuota/i);
  });
});
