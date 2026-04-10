/**
 * TC12 — Duplicate username rejected (409-equivalent)
 *
 * The document specifies "Update display name, enforce uniqueness" for
 * /api/profile and /api/settings. In the current codebase the username
 * uniqueness check lives in the signUp server action (app/auth/sign-in/actions.ts)
 * and the password change lives in /api/user/password. This file covers both
 * surfaces so TC12 is fully represented.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  signInMock,
  userFindFirstMock,
  userFindUniqueMock,
  userCreateMock,
  userUpdateMock,
  verificationTokenDeleteManyMock,
  verificationTokenCreateMock,
  sendVerificationEmailMock,
  authMock,
  bcryptCompareMock,
  bcryptHashMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userCreateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  verificationTokenDeleteManyMock: vi.fn(),
  verificationTokenCreateMock: vi.fn(),
  sendVerificationEmailMock: vi.fn(),
  authMock: vi.fn(),
  bcryptCompareMock: vi.fn(),
  bcryptHashMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  signIn: signInMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: userFindFirstMock,
      findUnique: userFindUniqueMock,
      create: userCreateMock,
      update: userUpdateMock,
    },
    verificationToken: {
      deleteMany: verificationTokenDeleteManyMock,
      create: verificationTokenCreateMock,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: sendVerificationEmailMock,
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock,
  },
}));

import { signUp } from "@/app/auth/sign-in/actions";
import { PUT } from "@/app/api/user/password/route";

// ─── TC12: duplicate username rejected ───────────────────────────────────────

describe("signUp — TC12 duplicate username rejected", () => {
  beforeEach(() => {
    userFindFirstMock.mockReset();
    userCreateMock.mockReset();
    signInMock.mockReset();
  });

  it("returns an error with the taken-username message when username is already in use (TC12)", async () => {
    userFindFirstMock.mockResolvedValue({
      id: "user-existing",
      email: "other@example.com",
      username: "queen",
    });

    const result = await signUp("queen", "new@example.com", "password123");

    // Error must surface clearly (document: "Uniqueness error must surface clearly")
    expect(result).toEqual({ error: "This username is already taken." });

    // No new user must be created
    expect(userCreateMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("profile is unchanged — existing user record is not modified on duplicate attempt", async () => {
    userFindFirstMock.mockResolvedValue({
      id: "user-existing",
      email: "other@example.com",
      username: "queen",
    });

    await signUp("queen", "attacker@example.com", "password123");

    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

// ─── Password change (/api/user/password) ────────────────────────────────────

function makePasswordRequest(body: unknown) {
  return new NextRequest("http://localhost/api/user/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/user/password", () => {
  beforeEach(() => {
    authMock.mockReset();
    userFindUniqueMock.mockReset();
    userUpdateMock.mockReset();
    bcryptCompareMock.mockReset();
    bcryptHashMock.mockReset();
  });

  it("returns 401 when the user is not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await PUT(
      makePasswordRequest({ currentPassword: "old", newPassword: "new-password" })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when current password is wrong", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    userFindUniqueMock.mockResolvedValue({ passwordHash: "stored-hash" });
    bcryptCompareMock.mockResolvedValue(false);

    const response = await PUT(
      makePasswordRequest({ currentPassword: "wrong", newPassword: "new-password-ok" })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Current password is incorrect" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 200 and updates the hash when current password is correct", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    userFindUniqueMock.mockResolvedValue({ passwordHash: "stored-hash" });
    bcryptCompareMock.mockResolvedValue(true);
    bcryptHashMock.mockResolvedValue("new-hash");
    userUpdateMock.mockResolvedValue({});

    const response = await PUT(
      makePasswordRequest({ currentPassword: "correct", newPassword: "new-password-ok" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "new-hash" },
    });
  });

  it("returns 400 when the account has no password (OAuth-only account)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-oauth" } });
    userFindUniqueMock.mockResolvedValue({ passwordHash: null });

    const response = await PUT(
      makePasswordRequest({ currentPassword: "anything", newPassword: "new-password-ok" })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "No password set for this account" });
  });
});
