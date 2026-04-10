import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dailyFindManyMock } = vi.hoisted(() => ({
  dailyFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    dailyChallenge: {
      findMany: dailyFindManyMock,
    },
  },
}));

import { GET } from "@/app/api/daily/history/route";

describe("GET /api/daily/history", () => {
  beforeEach(() => {
    dailyFindManyMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T15:45:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads prior challenges and maps the leaderboard response", async () => {
    dailyFindManyMock.mockResolvedValue([
      {
        id: "daily-1",
        number: 9,
        date: new Date("2026-03-16T00:00:00.000Z"),
        puzzle: {
          grid: [
            [1, 0],
            [0, 1],
          ],
          size: 2,
        },
        solves: [
          {
            timeMs: 11_000,
            user: { username: "alice", image: "alice.png" },
          },
          {
            timeMs: 12_500,
            user: { username: "bea", image: null },
          },
        ],
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(dailyFindManyMock).toHaveBeenCalledTimes(1);

    const query = dailyFindManyMock.mock.calls[0][0];
    expect(query.where.date.lt.toISOString()).toBe("2026-03-17T00:00:00.000Z");
    expect(query.orderBy).toEqual({ date: "desc" });
    expect(query.include).toEqual({
      puzzle: { select: { grid: true, size: true } },
      solves: {
        orderBy: { timeMs: "asc" },
        take: 3,
        include: {
          user: { select: { username: true, image: true } },
        },
      },
    });

    expect(await response.json()).toEqual({
      challenges: [
        {
          id: "daily-1",
          number: 9,
          date: "2026-03-16T00:00:00.000Z",
          grid: [
            [1, 0],
            [0, 1],
          ],
          size: 2,
          topSolves: [
            {
              rank: 1,
              username: "alice",
              image: "alice.png",
              timeMs: 11_000,
            },
            {
              rank: 2,
              username: "bea",
              image: null,
              timeMs: 12_500,
            },
          ],
        },
      ],
    });
  });
});
