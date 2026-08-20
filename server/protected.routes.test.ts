import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("protected ORBIT procedures", () => {
  it("rejects anonymous access to assistant and user-scoped workspace data", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.assistant.models()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.history.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.files.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.memory.list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.settings.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
