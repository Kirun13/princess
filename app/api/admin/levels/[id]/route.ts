import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminApiUser } from "@/lib/admin";

const UpdateLevelSchema = z.object({
  sortOrder: z.number().int().nonnegative().optional(),
  number: z.number().int().positive().optional(),
  name: z.string().trim().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApiUser();
  if (!admin.ok) {
    return admin.response;
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateLevelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;

  try {
    const level = await db.level.update({
      where: { id },
      data: parsed.data,
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

    return NextResponse.json({
      level: {
        id: level.id,
        number: level.number,
        name: level.name,
        sortOrder: level.sortOrder,
        status: level.status,
        deletedAt: level.deletedAt?.toISOString() ?? null,
        createdBy: level.createdBy
          ? { id: level.createdBy.id, username: level.createdBy.username }
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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update level" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApiUser();
  if (!admin.ok) {
    return admin.response;
  }

  const { id } = await params;

  const level = await db.level.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: "DRAFT",
    },
    select: { id: true, deletedAt: true },
  });

  return NextResponse.json({
    level: {
      id: level.id,
      deletedAt: level.deletedAt?.toISOString() ?? null,
    },
  });
}
