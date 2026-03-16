import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, levelFindManyMock, solveFindManyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  levelFindManyMock: vi.fn(),
  solveFindManyMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    level: {
      findMany: levelFindManyMock,
    },
    solve: {
      findMany: solveFindManyMock,
    },
  },
}));

import { GET } from "@/app/api/levels/route";

describe("GET /api/levels", () => {
  beforeEach(() => {
    authMock.mockReset();
    levelFindManyMock.mockReset();
    solveFindManyMock.mockReset();
  });

  it("filters to published, non-deleted levels", async () => {
    authMock.mockResolvedValue(null);
    levelFindManyMock.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(levelFindManyMock).toHaveBeenCalledWith({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
      include: {
        puzzle: { select: { id: true, size: true, difficulty: true } },
      },
    });
  });
});
