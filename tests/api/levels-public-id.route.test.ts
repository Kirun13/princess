import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, levelFindFirstMock, signStartTokenMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  levelFindFirstMock: vi.fn(),
  signStartTokenMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    level: {
      findFirst: levelFindFirstMock,
    },
  },
}));

vi.mock("@/lib/token", () => ({
  signStartToken: signStartTokenMock,
}));

import { GET } from "@/app/api/levels/[id]/route";

describe("GET /api/levels/[id]", () => {
  beforeEach(() => {
    authMock.mockReset();
    levelFindFirstMock.mockReset();
    signStartTokenMock.mockReset();
  });

  it("returns 404 when the published level does not exist", async () => {
    authMock.mockResolvedValue(null);
    levelFindFirstMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/levels/level-1"), {
      params: Promise.resolve({ id: "level-1" }),
    });

    expect(response.status).toBe(404);
    expect(levelFindFirstMock).toHaveBeenCalledWith({
      where: { id: "level-1", status: "PUBLISHED", deletedAt: null },
      include: {
        puzzle: { select: { id: true, size: true, difficulty: true, grid: true } },
      },
    });
    expect(await response.json()).toEqual({ error: "Level not found" });
  });

  it("returns the level for guests without creating a start token", async () => {
    authMock.mockResolvedValue(null);
    levelFindFirstMock.mockResolvedValue({
      id: "level-2",
      number: 2,
      name: "Starter",
      puzzle: {
        id: "puzzle-2",
        size: 3,
        difficulty: "easy",
        grid: [[1]],
      },
    });

    const response = await GET(new Request("http://localhost/api/levels/level-2"), {
      params: Promise.resolve({ id: "level-2" }),
    });

    expect(response.status).toBe(200);
    expect(signStartTokenMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      id: "level-2",
      number: 2,
      name: "Starter",
      size: 3,
      difficulty: "easy",
      grid: [[1]],
      startToken: null,
    });
  });

  it("returns a signed start token for authenticated users", async () => {
    authMock.mockResolvedValue({ user: { id: "user-7" } });
    levelFindFirstMock.mockResolvedValue({
      id: "level-3",
      number: 3,
      name: "Challenge",
      puzzle: {
        id: "puzzle-3",
        size: 4,
        difficulty: "medium",
        grid: [[0, 1]],
      },
    });
    signStartTokenMock.mockResolvedValue("signed-token");

    const response = await GET(new Request("http://localhost/api/levels/level-3"), {
      params: Promise.resolve({ id: "level-3" }),
    });

    expect(response.status).toBe(200);
    expect(signStartTokenMock).toHaveBeenCalledWith("user-7", "puzzle-3");
    expect(await response.json()).toEqual({
      id: "level-3",
      number: 3,
      name: "Challenge",
      size: 4,
      difficulty: "medium",
      grid: [[0, 1]],
      startToken: "signed-token",
    });
  });
});
