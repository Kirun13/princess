import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, userSettingsUpsertMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  userSettingsUpsertMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    userSettings: {
      upsert: userSettingsUpsertMock,
    },
  },
}));

import { PUT } from "@/app/api/settings/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/settings", () => {
  beforeEach(() => {
    authMock.mockReset();
    userSettingsUpsertMock.mockReset();
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await PUT(makeRequest({ theme: "dark" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid payload", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const response = await PUT(makeRequest({ theme: "purple" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("upserts and returns settings for authenticated user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    userSettingsUpsertMock.mockResolvedValue({
      userId: "user-1",
      showTimer: false,
      theme: "light",
    });

    const response = await PUT(makeRequest({ showTimer: false, theme: "light" }));

    expect(response.status).toBe(200);
    expect(userSettingsUpsertMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", showTimer: false, theme: "light" },
      update: { showTimer: false, theme: "light" },
    });
    expect(await response.json()).toEqual({
      userId: "user-1",
      showTimer: false,
      theme: "light",
    });
  });
});

