import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  resolveDailyChallengeStateMock,
  signStartTokenMock,
  dailyFindUniqueMock,
  solveFindUniqueMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  resolveDailyChallengeStateMock: vi.fn(),
  signStartTokenMock: vi.fn(),
  dailyFindUniqueMock: vi.fn(),
  solveFindUniqueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/daily-challenge", () => ({
  resolveDailyChallengeState: resolveDailyChallengeStateMock,
}));

vi.mock("@/lib/token", () => ({
  signStartToken: signStartTokenMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    dailyChallenge: {
      findUnique: dailyFindUniqueMock,
    },
    solve: {
      findUnique: solveFindUniqueMock,
    },
  },
}));

import { GET } from "@/app/api/daily/route";

describe("GET /api/daily", () => {
  beforeEach(() => {
    authMock.mockReset();
    resolveDailyChallengeStateMock.mockReset();
    signStartTokenMock.mockReset();
    dailyFindUniqueMock.mockReset();
    solveFindUniqueMock.mockReset();
  });

  it("returns 404 when there is no active daily challenge for today", async () => {
    authMock.mockResolvedValue(null);
    resolveDailyChallengeStateMock.mockResolvedValue({
      activeChallengeForToday: null,
      latestPublishedChallenge: {
        id: "daily-yesterday",
        number: 11,
        date: new Date("2026-03-16T00:00:00.000Z"),
        puzzleId: "puzzle-yesterday",
      },
    });

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No daily challenge today" });
  });

  it("returns the active daily challenge for today", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    resolveDailyChallengeStateMock.mockResolvedValue({
      activeChallengeForToday: {
        id: "daily-today",
        number: 12,
        date: new Date("2026-03-17T00:00:00.000Z"),
        puzzleId: "puzzle-today",
      },
      latestPublishedChallenge: {
        id: "daily-today",
        number: 12,
        date: new Date("2026-03-17T00:00:00.000Z"),
        puzzleId: "puzzle-today",
      },
    });
    dailyFindUniqueMock.mockResolvedValue({
      id: "daily-today",
      number: 12,
      date: new Date("2026-03-17T00:00:00.000Z"),
      puzzle: {
        id: "puzzle-today",
        size: 8,
        grid: [[0]],
      },
    });
    signStartTokenMock.mockResolvedValue("token-1");
    solveFindUniqueMock.mockResolvedValue({
      timeMs: 12_345,
      completedAt: new Date("2026-03-17T00:10:00.000Z"),
      isPersonalBest: true,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "daily-today",
      number: 12,
      date: new Date("2026-03-17T00:00:00.000Z").toISOString(),
      puzzle: {
        id: "puzzle-today",
        size: 8,
        grid: [[0]],
      },
      startToken: "token-1",
      userSolve: {
        timeMs: 12_345,
        completedAt: new Date("2026-03-17T00:10:00.000Z").toISOString(),
        isPersonalBest: true,
      },
    });
  });
});
