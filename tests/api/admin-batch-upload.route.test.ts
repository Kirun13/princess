import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiUserMock,
  getNextLevelNumberMock,
  getNextSortOrderMock,
  puzzleFindUniqueMock,
  puzzleCreateMock,
  levelCreateMock,
} = vi.hoisted(() => ({
  requireAdminApiUserMock: vi.fn(),
  getNextLevelNumberMock: vi.fn(),
  getNextSortOrderMock: vi.fn(),
  puzzleFindUniqueMock: vi.fn(),
  puzzleCreateMock: vi.fn(),
  levelCreateMock: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdminApiUser: requireAdminApiUserMock,
}));

vi.mock("@/lib/admin-levels", async () => {
  const zod = await import("zod");
  return {
    BatchPuzzleSchema: zod.z.object({
      grid: zod.z.array(zod.z.array(zod.z.number().int().min(0))),
      solution: zod.z.array(zod.z.array(zod.z.number().int().min(0))),
      hash: zod.z.string().min(1),
      size: zod.z.number().int().min(1),
      difficulty: zod.z.string().min(1),
      name: zod.z.string().trim().min(1).optional(),
      number: zod.z.number().int().positive().optional(),
      sortOrder: zod.z.number().int().nonnegative().optional(),
    }),
    getNextLevelNumber: getNextLevelNumberMock,
    getNextSortOrder: getNextSortOrderMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    puzzle: {
      findUnique: puzzleFindUniqueMock,
      create: puzzleCreateMock,
    },
    level: {
      create: levelCreateMock,
    },
  },
}));

import { POST } from "@/app/api/admin/levels/batch-upload/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/levels/batch-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/levels/batch-upload", () => {
  beforeEach(() => {
    requireAdminApiUserMock.mockReset();
    getNextLevelNumberMock.mockReset();
    getNextSortOrderMock.mockReset();
    puzzleFindUniqueMock.mockReset();
    puzzleCreateMock.mockReset();
    levelCreateMock.mockReset();
  });

  it("returns auth guard response when admin auth fails", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(makeRequest([]));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("creates drafts and skips duplicate hashes", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", username: "queen", role: "ADMIN" },
    });
    getNextLevelNumberMock.mockResolvedValue(11);
    getNextSortOrderMock.mockResolvedValue(11);
    puzzleFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "puzzle-existing" });
    puzzleCreateMock.mockResolvedValue({ id: "puzzle-new" });
    levelCreateMock.mockResolvedValue({
      id: "level-new",
      number: 11,
      sortOrder: 11,
      name: "Level 11",
    });

    const response = await POST(
      makeRequest([
        {
          grid: [[0]],
          solution: [[0]],
          hash: "hash-new",
          size: 1,
          difficulty: "easy",
        },
        {
          grid: [[0]],
          solution: [[0]],
          hash: "hash-existing",
          size: 1,
          difficulty: "easy",
        },
      ])
    );

    expect(response.status).toBe(200);
    expect(levelCreateMock).toHaveBeenCalledWith({
      data: {
        number: 11,
        name: "Level 11",
        puzzleId: "puzzle-new",
        sortOrder: 11,
        status: "DRAFT",
        createdById: "admin-1",
      },
    });

    expect(await response.json()).toEqual({
      created: [
        { index: 0, levelId: "level-new", number: 11, sortOrder: 11, name: "Level 11" },
      ],
      skipped: [
        { index: 1, hash: "hash-existing", reason: "Puzzle hash already exists" },
      ],
      failed: [],
      summary: {
        total: 2,
        created: 1,
        skipped: 1,
        failed: 0,
      },
    });
  });
});
