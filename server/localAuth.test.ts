import { describe, expect, it } from "vitest";
import { hashPassword, localOpenId, normalizeUsername, verifyPassword } from "./localAuth";

describe("local account credentials", () => {
  it("normalizes usernames into stable local identity keys", () => {
    expect(normalizeUsername("  Orbit_User  ")).toBe("orbit_user");
    expect(localOpenId("Orbit_User")).toBe("local:orbit_user");
  });

  it("hashes passwords without retaining the source password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(hash).not.toContain("correct-horse-battery-staple");
  });

  it("accepts the matching password and rejects a different one", async () => {
    const hash = await hashPassword("a-long-password");
    await expect(verifyPassword("a-long-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("another-password", hash)).resolves.toBe(false);
  });
});
