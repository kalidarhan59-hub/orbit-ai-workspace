import { describe, expect, it } from "vitest";
import { buildModelCatalog, resolveModelId } from "./orbit";

describe("ORBIT Manus profiles", () => {
  it("exposes Max and Lite only when their backing models are live", () => {
    expect(buildModelCatalog(["claude-opus-4-7", "gpt-5-mini"]).map((item) => item.id)).toEqual(["manus-1.6-max", "manus-1.6-lite"]);
    expect(buildModelCatalog(["gpt-5-mini"]).map((item) => item.id)).toEqual(["manus-1.6-lite"]);
    expect(buildModelCatalog(["gpt-5"]).map((item) => item.id)).toEqual([]);
  });

  it("maps friendly profiles to real backend model IDs", () => {
    expect(resolveModelId("manus-1.6-max")).toBe("claude-opus-4-7");
    expect(resolveModelId("manus-1.6-lite")).toBe("gpt-5-mini");
    expect(resolveModelId("orbit-intelligence")).toBeUndefined();
    expect(resolveModelId("gpt-5")).toBe("gpt-5");
  });
});
