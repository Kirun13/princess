import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, userFindUniqueMock, solveCountMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  solveCountMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: userFindUniqueMock,
    },
    solve: {
      count: solveCountMock,
    },
  },
}));

import { GET } from "@/app/api/profile/route";

describe("GET /api/profile", () => {
  beforeEach(() => {
    authMock.mockReset();
    userFindUniqueMock.mockReset();
    solveCountMock.mockReset();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when the user record is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    userFindUniqueMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      include: {
        solves: {
          orderBy: { completedAt: "desc" },
          take: 5,
          include: {
            level: { select: { name: true, number: true } },
            dailyChallenge: { select: { number: true, date: true } },
          },
        },
      },
    });
    expect(await response.json()).toEqual({ error: "User not found" });
  });

  it("returns profile stats and recent solves", async () => {
    authMock.mockResolvedValue({ user: { id: "user-2" } });
    userFindUniqueMock.mockResolvedValue({
      username: "princess",
      image: "avatar.png",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      solves: [
        {
          timeMs: 8_765,
          completedAt: new Date("2026-03-17T10:00:00.000Z"),
          level: { name: "Warmup", number: 1 },
          dailyChallenge: null,
        },
        {
          timeMs: 9_999,
          completedAt: new Date("2026-03-16T10:00:00.000Z"),
          level: null,
          dailyChallenge: {
            number: 14,
            date: new Date("2026-03-16T00:00:00.000Z"),
          },
        },
      ],
    });
    solveCountMock.mockResolvedValue(27);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(solveCountMock).toHaveBeenCalledWith({ where: { userId: "user-2" } });
    expect(await response.json()).toEqual({
      username: "princess",
      image: "avatar.png",
      createdAt: "2026-01-01T00:00:00.000Z",
      stats: {
        totalSolves: 27,
      },
      recentSolves: [
        {
          timeMs: 8_765,
          completedAt: "2026-03-17T10:00:00.000Z",
          level: { name: "Warmup", number: 1 },
          daily: null,
        },
        {
          timeMs: 9_999,
          completedAt: "2026-03-16T10:00:00.000Z",
          level: null,
          daily: {
            number: 14,
            date: "2026-03-16T00:00:00.000Z",
          },
        },
      ],
    });
  });
});
