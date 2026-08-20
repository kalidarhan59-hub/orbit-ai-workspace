import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

const db = vi.hoisted(() => ({
  createLocalAccount: vi.fn(),
  getLocalAccountUser: vi.fn(),
}));
const sdk = vi.hoisted(() => ({ createSessionToken: vi.fn() }));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), ...db }));
vi.mock("./_core/sdk", async (importOriginal) => ({ ...(await importOriginal<typeof import("./_core/sdk")>()), sdk }));

import { appRouter } from "./routers";

function publicContext() {
  const cookies: Array<{ name: string; value: string }> = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: (name: string, value: string) => cookies.push({ name, value }), clearCookie: () => undefined } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

describe("local auth router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers a normalized local account and issues a secure session cookie", async () => {
    const user = { id: 42, openId: "local:orbit_user", name: "orbit_user", email: null, loginMethod: "local", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    db.createLocalAccount.mockResolvedValue(user);
    sdk.createSessionToken.mockResolvedValue("signed-local-token");
    const { ctx, cookies } = publicContext();

    const result = await appRouter.createCaller(ctx).auth.register({ username: " Orbit_User ", password: "secure-password", confirmPassword: "secure-password" });

    expect(db.createLocalAccount).toHaveBeenCalledWith(expect.objectContaining({ username: "orbit_user", openId: "local:orbit_user" }));
    expect(sdk.createSessionToken).toHaveBeenCalledWith("local:orbit_user", expect.objectContaining({ name: "orbit_user" }));
    expect(cookies).toEqual([{ name: COOKIE_NAME, value: "signed-local-token" }]);
    expect(result).toMatchObject({ id: 42, name: "orbit_user", loginMethod: "local" });
  });

  it("rejects invalid passwords and issues a session only for a verified local account", async () => {
    db.getLocalAccountUser.mockResolvedValue({ account: { username: "orbit_user", passwordHash: "scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" }, user: { id: 7, openId: "local:orbit_user", name: "orbit_user" } });
    const { ctx } = publicContext();

    await expect(appRouter.createCaller(ctx).auth.login({ username: "orbit_user", password: "wrong-password" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(sdk.createSessionToken).not.toHaveBeenCalled();
  });
});
