import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminApiUserMock,
  serializeTomorrowDailyChallengeMock,
  createTomorrowDailyChallengeIfMissingMock,
  regenerateTomorrowDailyChallengeMock,
} = vi.hoisted(() => ({
  requireAdminApiUserMock: vi.fn(),
  serializeTomorrowDailyChallengeMock: vi.fn(),
  createTomorrowDailyChallengeIfMissingMock: vi.fn(),
  regenerateTomorrowDailyChallengeMock: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdminApiUser: requireAdminApiUserMock,
}));

vi.mock("@/lib/daily-challenge", () => ({
  serializeTomorrowDailyChallenge: serializeTomorrowDailyChallengeMock,
  createTomorrowDailyChallengeIfMissing: createTomorrowDailyChallengeIfMissingMock,
  regenerateTomorrowDailyChallenge: regenerateTomorrowDailyChallengeMock,
}));

import { GET } from "@/app/api/admin/daily/next/route";
import { POST as GENERATE } from "@/app/api/admin/daily/next/generate/route";
import { POST as REGENERATE } from "@/app/api/admin/daily/next/regenerate/route";

describe("admin daily preview routes", () => {
  beforeEach(() => {
    requireAdminApiUserMock.mockReset();
    serializeTomorrowDailyChallengeMock.mockReset();
    createTomorrowDailyChallengeIfMissingMock.mockReset();
    regenerateTomorrowDailyChallengeMock.mockReset();
  });

  it("returns preview payload for admins", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", username: "queen", role: "ADMIN" },
    });
    serializeTomorrowDailyChallengeMock.mockResolvedValue({
      date: "2026-03-17T00:00:00.000Z",
      challenge: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      date: "2026-03-17T00:00:00.000Z",
      challenge: null,
    });
  });

  it("generates tomorrow when missing", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", username: "queen", role: "ADMIN" },
    });
    createTomorrowDailyChallengeIfMissingMock.mockResolvedValue({
      created: true,
      challenge: {
        id: "daily-1",
        number: 42,
        puzzle: {
          id: "puzzle-1",
          hash: "hash-1",
          size: 7,
          difficulty: "medium",
          grid: [[0]],
        },
      },
    });

    const response = await GENERATE();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      created: true,
      challenge: {
        id: "daily-1",
        number: 42,
        puzzleId: "puzzle-1",
        hash: "hash-1",
        size: 7,
        difficulty: "medium",
        grid: [[0]],
      },
    });
  });

  it("returns 404 when regenerate is requested without a scheduled daily", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", username: "queen", role: "ADMIN" },
    });
    regenerateTomorrowDailyChallengeMock.mockRejectedValue(
      new Error("No tomorrow daily challenge exists to regenerate")
    );

    const response = await REGENERATE();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "No tomorrow daily challenge exists to regenerate",
    });
  });
});
