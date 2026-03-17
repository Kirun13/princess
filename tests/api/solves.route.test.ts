import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  authMock,
  checkRateLimitMock,
  verifyStartTokenMock,
  isSolvedMock,
  syncAchievementsForSolveMock,
  puzzleFindUniqueMock,
  solveFindUniqueMock,
  solveCreateMock,
  solveAggregateMock,
  solveCountMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  verifyStartTokenMock: vi.fn(),
  isSolvedMock: vi.fn(),
  syncAchievementsForSolveMock: vi.fn(),
  puzzleFindUniqueMock: vi.fn(),
  solveFindUniqueMock: vi.fn(),
  solveCreateMock: vi.fn(),
  solveAggregateMock: vi.fn(),
  solveCountMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/token", () => ({
  verifyStartToken: verifyStartTokenMock,
}));

vi.mock("@/lib/puzzle/validator", () => ({
  isSolved: isSolvedMock,
}));

vi.mock("@/lib/achievements", () => ({
  syncAchievementsForSolve: syncAchievementsForSolveMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    puzzle: {
      findUnique: puzzleFindUniqueMock,
    },
    solve: {
      findUnique: solveFindUniqueMock,
      create: solveCreateMock,
      aggregate: solveAggregateMock,
      count: solveCountMock,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  buildRequestContext: vi.fn().mockReturnValue({ route: "/api/solves", method: "POST", requestId: "req-1" }),
  logRequestStart: vi.fn(),
  logRequestComplete: vi.fn(),
  logRequestWarn: vi.fn(),
}));

import { POST } from "@/app/api/solves/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/solves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  puzzleId: "ckv6j8f0q0000z9t2x0p3d4e5",
  levelId: "ckv6j8f0q0001z9t2x0p3d4e5",
  queenPositions: [[0, 0]],
  activeTimeMs: 5_000,
  startToken: "valid-token",
};

describe("POST /api/solves", () => {
  beforeEach(() => {
    vi.useRealTimers();
    authMock.mockReset();
    checkRateLimitMock.mockReset();
    verifyStartTokenMock.mockReset();
    isSolvedMock.mockReset();
    syncAchievementsForSolveMock.mockReset();
    puzzleFindUniqueMock.mockReset();
    solveFindUniqueMock.mockReset();
    solveCreateMock.mockReset();
    solveAggregateMock.mockReset();
    solveCountMock.mockReset();
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid payload", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    checkRateLimitMock.mockResolvedValue({ limited: false });

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("creates a solve for valid request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));

    authMock.mockResolvedValue({ user: { id: "user-1" } });
    checkRateLimitMock.mockResolvedValue({ limited: false });
    verifyStartTokenMock.mockResolvedValue({
      userId: "user-1",
      puzzleId: validPayload.puzzleId,
      startedAt: "2026-01-01T00:00:04.000Z",
      expiresAt: "2026-01-02T00:00:04.000Z",
    });
    puzzleFindUniqueMock.mockResolvedValue({
      id: validPayload.puzzleId,
      size: 1,
      grid: [[0]],
    });
    isSolvedMock.mockReturnValue(true);
    solveFindUniqueMock.mockResolvedValue(null);
    solveCreateMock.mockResolvedValue({
      id: "solve-1",
      timeMs: 5_000,
      isPersonalBest: false,
    });
    solveAggregateMock.mockResolvedValue({
      _avg: { timeMs: 5_000 },
      _min: { timeMs: 5_000 },
      _count: { _all: 1 },
    });
    solveCountMock.mockResolvedValue(0);
    syncAchievementsForSolveMock.mockResolvedValue([]);

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(201);
    expect(solveCreateMock).toHaveBeenCalled();
    expect(await response.json()).toEqual({
      solveId: "solve-1",
      timeMs: 5_000,
      isPersonalBest: false,
      rank: 1,
      totalSolvers: 1,
      averageTimeMs: 5_000,
      topTimeMs: 5_000,
      beatAverage: true,
      unlockedAchievements: [],
    });
  });

  it("returns existing solve idempotently", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));

    authMock.mockResolvedValue({ user: { id: "user-1" } });
    checkRateLimitMock.mockResolvedValue({ limited: false });
    verifyStartTokenMock.mockResolvedValue({
      userId: "user-1",
      puzzleId: validPayload.puzzleId,
      startedAt: "2026-01-01T00:00:04.000Z",
      expiresAt: "2026-01-02T00:00:04.000Z",
    });
    puzzleFindUniqueMock.mockResolvedValue({
      id: validPayload.puzzleId,
      size: 1,
      grid: [[0]],
    });
    isSolvedMock.mockReturnValue(true);
    solveFindUniqueMock.mockResolvedValue({
      id: "solve-existing",
      timeMs: 4_321,
      isPersonalBest: true,
    });
    solveAggregateMock.mockResolvedValue({
      _avg: { timeMs: 4_321 },
      _min: { timeMs: 4_321 },
      _count: { _all: 1 },
    });
    solveCountMock.mockResolvedValue(0);

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(200);
    expect(solveCreateMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      solveId: "solve-existing",
      timeMs: 4_321,
      isPersonalBest: true,
      rank: 1,
      totalSolvers: 1,
      averageTimeMs: 4_321,
      topTimeMs: 4_321,
      beatAverage: true,
      unlockedAchievements: [],
    });
  });
});

