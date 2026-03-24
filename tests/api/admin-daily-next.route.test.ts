import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminApiUserMock,
  serializeTomorrowDailyChallengeMock,
  createTomorrowDailyChallengeIfMissingMock,
  createTodayDailyChallengeIfMissingMock,
  regenerateTomorrowDailyChallengeMock,
} = vi.hoisted(() => ({
  requireAdminApiUserMock: vi.fn(),
  serializeTomorrowDailyChallengeMock: vi.fn(),
  createTomorrowDailyChallengeIfMissingMock: vi.fn(),
  createTodayDailyChallengeIfMissingMock: vi.fn(),
  regenerateTomorrowDailyChallengeMock: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdminApiUser: requireAdminApiUserMock,
}));

vi.mock("@/lib/daily-challenge", () => ({
  serializeTomorrowDailyChallenge: serializeTomorrowDailyChallengeMock,
  createTomorrowDailyChallengeIfMissing: createTomorrowDailyChallengeIfMissingMock,
  createTodayDailyChallengeIfMissing: createTodayDailyChallengeIfMissingMock,
  regenerateTomorrowDailyChallenge: regenerateTomorrowDailyChallengeMock,
}));

import { GET } from "@/app/api/admin/daily/next/route";
import { POST as GENERATE_TODAY } from "@/app/api/admin/daily/today/generate/route";
import { POST as GENERATE } from "@/app/api/admin/daily/next/generate/route";
import { POST as REGENERATE } from "@/app/api/admin/daily/next/regenerate/route";

describe("admin daily preview routes", () => {
  beforeEach(() => {
    requireAdminApiUserMock.mockReset();
    serializeTomorrowDailyChallengeMock.mockReset();
    createTomorrowDailyChallengeIfMissingMock.mockReset();
    createTodayDailyChallengeIfMissingMock.mockReset();
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

  it("backfills today when missing", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", username: "queen", role: "ADMIN" },
    });
    createTodayDailyChallengeIfMissingMock.mockResolvedValue({
      created: true,
      challenge: {
        id: "daily-today",
        number: 1,
        puzzle: {
          id: "puzzle-today",
          hash: "hash-today",
          size: 8,
          difficulty: "hard",
          grid: [[1]],
        },
      },
    });

    const response = await GENERATE_TODAY();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      created: true,
      challenge: {
        id: "daily-today",
        number: 1,
        puzzleId: "puzzle-today",
        hash: "hash-today",
        size: 8,
        difficulty: "hard",
        grid: [[1]],
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
