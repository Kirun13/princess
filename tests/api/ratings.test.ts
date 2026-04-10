import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  authMock,
  levelRatingUpsertMock,
  levelFindUniqueMock,
  dailyChallengeFindUniqueMock,
  levelFindManyMock,
  dailyFindManyMock,
  levelRatingAggregateMock,
  puzzleUpdateMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  levelRatingUpsertMock: vi.fn(),
  levelFindUniqueMock: vi.fn(),
  dailyChallengeFindUniqueMock: vi.fn(),
  levelFindManyMock: vi.fn(),
  dailyFindManyMock: vi.fn(),
  levelRatingAggregateMock: vi.fn(),
  puzzleUpdateMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    levelRating: {
      upsert: levelRatingUpsertMock,
      aggregate: levelRatingAggregateMock,
    },
    level: {
      findUnique: levelFindUniqueMock,
      findMany: levelFindManyMock,
    },
    dailyChallenge: {
      findUnique: dailyChallengeFindUniqueMock,
      findMany: dailyFindManyMock,
    },
    puzzle: {
      update: puzzleUpdateMock,
    },
  },
}));

import { POST } from "@/app/api/ratings/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Authentication guard ─────────────────────────────────────────────────────

describe("POST /api/ratings — auth", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns 401 when the user is not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ levelId: "level-1", rating: 4 }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe("POST /api/ratings — validation", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns 400 when rating is out of range (0 is below minimum)", async () => {
    const response = await POST(makeRequest({ levelId: "level-1", rating: 0 }));

    expect(response.status).toBe(400);
  });

  it("returns 400 when rating is out of range (6 is above maximum)", async () => {
    const response = await POST(makeRequest({ levelId: "level-1", rating: 6 }));

    expect(response.status).toBe(400);
  });

  it("returns 400 when neither levelId nor dailyChallengeId is provided", async () => {
    const response = await POST(makeRequest({ rating: 3 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Either levelId or dailyChallengeId is required",
    });
  });

  it("returns 400 when both levelId and dailyChallengeId are provided", async () => {
    const response = await POST(
      makeRequest({ levelId: "level-1", dailyChallengeId: "daily-1", rating: 3 })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Provide only one of levelId or dailyChallengeId",
    });
  });
});

// ─── TC11: rating updates difficulty average ──────────────────────────────────

describe("POST /api/ratings — TC11 rating updates difficulty average", () => {
  beforeEach(() => {
    authMock.mockReset();
    levelRatingUpsertMock.mockReset();
    levelFindUniqueMock.mockReset();
    levelFindManyMock.mockReset();
    dailyFindManyMock.mockReset();
    levelRatingAggregateMock.mockReset();
    puzzleUpdateMock.mockReset();
  });

  it("upserts the rating and recalculates the puzzle difficulty average (TC11)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    // The rating upsert succeeds
    levelRatingUpsertMock.mockResolvedValue({ rating: 4 });

    // The level points to a puzzle
    levelFindUniqueMock.mockResolvedValue({ puzzleId: "puzzle-1" });

    // updatePuzzleStats: puzzle belongs to one level, no dailies
    levelFindManyMock.mockResolvedValue([{ id: "level-1" }]);
    dailyFindManyMock.mockResolvedValue([]);

    // Aggregate for the one level: 5 ratings averaging 4.0 → "hard" bucket (3.5–4.5)
    levelRatingAggregateMock.mockResolvedValue({
      _avg: { rating: 4.0 },
      _count: { rating: 5 },
    });

    puzzleUpdateMock.mockResolvedValue({});

    const response = await POST(makeRequest({ levelId: "level-1", rating: 4 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rating: 4 });

    // Confirm the upsert was called with the right composite key
    expect(levelRatingUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_levelId: { userId: "user-1", levelId: "level-1" } },
        create: expect.objectContaining({ userId: "user-1", levelId: "level-1", rating: 4 }),
        update: { rating: 4 },
      })
    );

    // Confirm the difficulty average was written back to the puzzle
    expect(puzzleUpdateMock).toHaveBeenCalledWith({
      where: { id: "puzzle-1" },
      data: {
        avgRating: 4.0,
        ratingCount: 5,
        difficulty: "hard",
      },
    });
  });

  it("correctly maps average ratings to difficulty labels", async () => {
    // avgRating < 1.5 → "easy"
    authMock.mockResolvedValue({ user: { id: "user-2" } });
    levelRatingUpsertMock.mockResolvedValue({ rating: 1 });
    levelFindUniqueMock.mockResolvedValue({ puzzleId: "puzzle-2" });
    levelFindManyMock.mockResolvedValue([{ id: "level-2" }]);
    dailyFindManyMock.mockResolvedValue([]);
    levelRatingAggregateMock.mockResolvedValue({
      _avg: { rating: 1.0 },
      _count: { rating: 3 },
    });
    puzzleUpdateMock.mockResolvedValue({});

    await POST(makeRequest({ levelId: "level-2", rating: 1 }));

    expect(puzzleUpdateMock).toHaveBeenCalledWith({
      where: { id: "puzzle-2" },
      data: { avgRating: 1.0, ratingCount: 3, difficulty: "easy" },
    });
  });

  it("rates a daily challenge and updates the puzzle average", async () => {
    authMock.mockResolvedValue({ user: { id: "user-3" } });
    levelRatingUpsertMock.mockResolvedValue({ rating: 3 });
    dailyChallengeFindUniqueMock.mockResolvedValue({ puzzleId: "puzzle-3" });
    levelFindManyMock.mockResolvedValue([]);
    dailyFindManyMock.mockResolvedValue([{ id: "daily-1" }]);
    // No level ratings, one daily rating averaging 3.0 → "medium"
    levelRatingAggregateMock
      .mockResolvedValueOnce({ _avg: { rating: null }, _count: { rating: 0 } }) // level agg
      .mockResolvedValueOnce({ _avg: { rating: 3.0 }, _count: { rating: 1 } }); // daily agg
    puzzleUpdateMock.mockResolvedValue({});

    const response = await POST(
      makeRequest({ dailyChallengeId: "daily-1", rating: 3 })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rating: 3 });
    expect(puzzleUpdateMock).toHaveBeenCalledWith({
      where: { id: "puzzle-3" },
      data: { avgRating: 3.0, ratingCount: 1, difficulty: "medium" },
    });
  });
});
