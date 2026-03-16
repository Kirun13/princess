import { z } from "zod";
import { db } from "@/lib/db";

const QuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", "DRAFT", "PUBLISHED"]).default("all"),
  difficulty: z.enum(["all", "easy", "medium", "hard", "expert"]).default("all"),
  size: z.enum(["all", "5", "6", "7", "8", "9", "10"]).default("all"),
  showDeleted: z.enum(["true", "false"]).default("false"),
});

export const BatchPuzzleSchema = z.object({
  grid: z.array(z.array(z.number().int().min(0))),
  solution: z.array(z.array(z.number().int().min(0))),
  hash: z.string().min(1),
  size: z.number().int().min(1),
  difficulty: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  number: z.number().int().positive().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type AdminLevelFilters = z.infer<typeof QuerySchema>;
export type BatchPuzzleInput = z.infer<typeof BatchPuzzleSchema>;

export function parseAdminLevelFilters(searchParams: URLSearchParams): AdminLevelFilters {
  return QuerySchema.parse({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    difficulty: searchParams.get("difficulty") ?? undefined,
    size: searchParams.get("size") ?? undefined,
    showDeleted: searchParams.get("showDeleted") ?? undefined,
  });
}

export async function listAdminLevels(filters: AdminLevelFilters) {
  const search = filters.search?.trim();
  const numberSearch =
    search && /^\d+$/.test(search) ? Number.parseInt(search, 10) : undefined;
  const puzzleFilters =
    filters.difficulty === "all" && filters.size === "all"
      ? undefined
      : {
          is: {
            difficulty: filters.difficulty === "all" ? undefined : filters.difficulty,
            size:
              filters.size === "all"
                ? undefined
                : Number.parseInt(filters.size, 10),
          },
        };

  const levels = await db.level.findMany({
    where: {
      status: filters.status === "all" ? undefined : filters.status,
      deletedAt: filters.showDeleted === "true" ? undefined : null,
      OR: !search
        ? undefined
        : [
            { name: { contains: search, mode: "insensitive" } },
            ...(numberSearch !== undefined ? [{ number: numberSearch }] : []),
          ],
      puzzle: puzzleFilters,
    },
    orderBy: [{ deletedAt: "asc" }, { sortOrder: "asc" }, { number: "asc" }],
    include: {
      puzzle: {
        select: {
          id: true,
          hash: true,
          grid: true,
          size: true,
          difficulty: true,
          avgRating: true,
          ratingCount: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
        },
      },
      _count: {
        select: {
          solves: true,
        },
      },
    },
  });

  return levels.map((level) => ({
    id: level.id,
    number: level.number,
    name: level.name,
    sortOrder: level.sortOrder,
    status: level.status,
    deletedAt: level.deletedAt?.toISOString() ?? null,
    createdBy: level.createdBy
      ? {
          id: level.createdBy.id,
          username: level.createdBy.username,
        }
      : null,
    puzzle: {
      id: level.puzzle.id,
      hash: level.puzzle.hash,
      grid: level.puzzle.grid,
      size: level.puzzle.size,
      difficulty: level.puzzle.difficulty,
      avgRating: level.puzzle.avgRating,
      ratingCount: level.puzzle.ratingCount,
    },
    solveCount: level._count.solves,
  }));
}

export async function getNextLevelNumber() {
  const lastLevel = await db.level.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });

  return (lastLevel?.number ?? 0) + 1;
}

export async function getNextSortOrder() {
  const lastLevel = await db.level.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return (lastLevel?.sortOrder ?? 0) + 1;
}
