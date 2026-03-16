import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiUserMock, listAdminLevelsMock } = vi.hoisted(() => ({
  requireAdminApiUserMock: vi.fn(),
  listAdminLevelsMock: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdminApiUser: requireAdminApiUserMock,
}));

vi.mock("@/lib/admin-levels", () => ({
  parseAdminLevelFilters: vi.fn().mockImplementation((params: URLSearchParams) => ({
    search: params.get("search") ?? undefined,
    status: params.get("status") ?? "all",
    difficulty: params.get("difficulty") ?? "all",
    size: params.get("size") ?? "all",
    showDeleted: params.get("showDeleted") ?? "false",
  })),
  listAdminLevels: listAdminLevelsMock,
}));

import { GET } from "@/app/api/admin/levels/route";

describe("GET /api/admin/levels", () => {
  beforeEach(() => {
    requireAdminApiUserMock.mockReset();
    listAdminLevelsMock.mockReset();
  });

  it("returns guard response when admin auth fails", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/levels"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns filtered level data for admins", async () => {
    requireAdminApiUserMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", username: "queen", role: "ADMIN" },
    });
    listAdminLevelsMock.mockResolvedValue([
      { id: "level-1", name: "Level 1", status: "PUBLISHED" },
    ]);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/levels?search=1&status=PUBLISHED&difficulty=easy&size=5&showDeleted=true"
      )
    );

    expect(response.status).toBe(200);
    expect(listAdminLevelsMock).toHaveBeenCalledWith({
      search: "1",
      status: "PUBLISHED",
      difficulty: "easy",
      size: "5",
      showDeleted: "true",
    });
    expect(await response.json()).toEqual({
      levels: [{ id: "level-1", name: "Level 1", status: "PUBLISHED" }],
    });
  });
});
