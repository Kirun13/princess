import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  BatchPuzzleSchema,
  getNextLevelNumber,
  getNextSortOrder,
} from "@/lib/admin-levels";
import { requireAdminApiUser } from "@/lib/admin";

const BatchUploadSchema = BatchPuzzleSchema.array().min(1);

export async function POST(req: NextRequest) {
  const admin = await requireAdminApiUser();
  if (!admin.ok) {
    return admin.response;
  }

  const body = await req.json().catch(() => null);
  const parsed = BatchUploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let nextNumber = await getNextLevelNumber();
  let nextSortOrder = await getNextSortOrder();

  const created: Array<{ index: number; levelId: string; number: number; sortOrder: number; name: string }> = [];
  const skipped: Array<{ index: number; hash: string; reason: string }> = [];
  const failed: Array<{ index: number; hash?: string; reason: string }> = [];

  for (const [index, item] of parsed.data.entries()) {
    const row = BatchPuzzleSchema.safeParse(item);
    if (!row.success) {
      failed.push({
        index,
        reason: row.error.issues[0]?.message ?? "Invalid puzzle payload",
      });
      continue;
    }

    const existingPuzzle = await db.puzzle.findUnique({
      where: { hash: row.data.hash },
      select: { id: true },
    });

    if (existingPuzzle) {
      skipped.push({
        index,
        hash: row.data.hash,
        reason: "Puzzle hash already exists",
      });
      continue;
    }

    const assignedNumber = row.data.number ?? nextNumber++;
    const assignedSortOrder = row.data.sortOrder ?? nextSortOrder++;

    try {
      const puzzle = await db.puzzle.create({
        data: {
          grid: row.data.grid,
          solution: row.data.solution,
          hash: row.data.hash,
          size: row.data.size,
          difficulty: row.data.difficulty,
        },
      });

      const level = await db.level.create({
        data: {
          number: assignedNumber,
          name: row.data.name ?? `Level ${assignedNumber}`,
          puzzleId: puzzle.id,
          sortOrder: assignedSortOrder,
          status: "DRAFT",
          createdById: admin.user.id,
        },
      });

      created.push({
        index,
        levelId: level.id,
        number: level.number,
        sortOrder: level.sortOrder,
        name: level.name,
      });
    } catch (error) {
      failed.push({
        index,
        hash: row.data.hash,
        reason: error instanceof Error ? error.message : "Failed to create puzzle",
      });
    }
  }

  return NextResponse.json({
    created,
    skipped,
    failed,
    summary: {
      total: parsed.data.length,
      created: created.length,
      skipped: skipped.length,
      failed: failed.length,
    },
  });
}
