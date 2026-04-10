import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, solveFindManyMock, solveCountMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  solveFindManyMock: vi.fn(),
  solveCountMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    solve: {
      findMany: solveFindManyMock,
      count: solveCountMock,
    },
  },
}));

import { GET } from "@/app/api/profile/history/route";

describe("GET /api/profile/history", () => {
  beforeEach(() => {
    authMock.mockReset();
    solveFindManyMock.mockReset();
    solveCountMock.mockReset();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/profile/history") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid pagination parameters", async () => {
    authMock.mockResolvedValue({ user: { id: "user-3" } });

    const response = await GET(
      new Request("http://localhost/api/profile/history?page=0&limit=60") as never
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        formErrors: [],
        fieldErrors: {
          page: ["Too small: expected number to be >=1"],
          limit: ["Too big: expected number to be <=50"],
        },
      },
    });
  });

  it("returns paginated solve history", async () => {
    authMock.mockResolvedValue({ user: { id: "user-4" } });
    solveFindManyMock.mockResolvedValue([
      {
        timeMs: 15_000,
        completedAt: new Date("2026-03-17T11:00:00.000Z"),
        level: { name: "Bridge", number: 8 },
        dailyChallenge: null,
      },
      {
        timeMs: 16_250,
        completedAt: new Date("2026-03-16T11:00:00.000Z"),
        level: null,
        dailyChallenge: {
          number: 13,
          date: new Date("2026-03-16T00:00:00.000Z"),
        },
      },
    ]);
    solveCountMock.mockResolvedValue(5);

    const response = await GET(
      new Request("http://localhost/api/profile/history?page=2&limit=2") as never
    );

    expect(response.status).toBe(200);
    expect(solveFindManyMock).toHaveBeenCalledWith({
      where: { userId: "user-4" },
      orderBy: { completedAt: "desc" },
      skip: 2,
      take: 2,
      include: {
        level: { select: { name: true, number: true } },
        dailyChallenge: { select: { number: true, date: true } },
      },
    });
    expect(solveCountMock).toHaveBeenCalledWith({ where: { userId: "user-4" } });
    expect(await response.json()).toEqual({
      solves: [
        {
          timeMs: 15_000,
          completedAt: "2026-03-17T11:00:00.000Z",
          level: { name: "Bridge", number: 8 },
          daily: null,
        },
        {
          timeMs: 16_250,
          completedAt: "2026-03-16T11:00:00.000Z",
          level: null,
          daily: {
            number: 13,
            date: "2026-03-16T00:00:00.000Z",
          },
        },
      ],
      pagination: {
        page: 2,
        limit: 2,
        total: 5,
        pages: 3,
      },
    });
  });
});
