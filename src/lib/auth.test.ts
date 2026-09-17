import { beforeEach, describe, expect, it } from "vitest";
import { createSession, hashPin, verifyPin, verifySession } from "./auth";

beforeEach(() => {
  process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough";
});

describe("Phase 1 authentication primitives", () => {
  it("round trips a signed user session", () => {
    const token = createSession("user", "user_123", 1);
    expect(verifySession(token)).toMatchObject({ scope: "user", subject: "user_123" });
  });

  it("rejects a tampered session", () => {
    const token = createSession("admin", "admin", 1);
    expect(verifySession(`${token}tampered`)).toBeNull();
  });

  it("hashes and verifies a four digit PIN without storing it directly", async () => {
    const hash = await hashPin("1234");
    expect(hash).not.toContain("1234");
    await expect(verifyPin("1234", hash)).resolves.toBe(true);
    await expect(verifyPin("0000", hash)).resolves.toBe(false);
  });
});
