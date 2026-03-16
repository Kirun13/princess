import { afterEach, describe, expect, it } from "vitest";
import { signStartToken, verifyStartToken } from "@/lib/token";

describe("start token helpers", () => {
  const originalSecret = process.env.START_TOKEN_SECRET;

  afterEach(() => {
    process.env.START_TOKEN_SECRET = originalSecret;
  });

  it("signs and verifies token payload", async () => {
    process.env.START_TOKEN_SECRET = "test-secret";

    const token = await signStartToken("user-1", "puzzle-1");
    const payload = await verifyStartToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-1");
    expect(payload?.puzzleId).toBe("puzzle-1");
    expect(new Date(payload!.expiresAt).getTime()).toBeGreaterThan(
      new Date(payload!.startedAt).getTime()
    );
  });

  it("returns null for invalid token", async () => {
    process.env.START_TOKEN_SECRET = "test-secret";
    const payload = await verifyStartToken("not-a-jwt");
    expect(payload).toBeNull();
  });
});

