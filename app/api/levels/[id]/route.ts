import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { signStartToken } from "@/lib/token";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const level = await db.level.findFirst({
    where: { id, status: "PUBLISHED", deletedAt: null },
    include: {
      puzzle: { select: { id: true, size: true, difficulty: true, grid: true } },
    },
  });

  if (!level) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 });
  }

  const startToken =
    session?.user?.id
      ? await signStartToken(session.user.id, level.puzzle.id)
      : null;

  return NextResponse.json({
    id: level.id,
    number: level.number,
    name: level.name,
    size: level.puzzle.size,
    difficulty: level.puzzle.difficulty,
    grid: level.puzzle.grid,
    startToken,
  });
}
