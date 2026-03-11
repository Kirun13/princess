import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  const levels = await db.level.findMany({
    orderBy: { number: "asc" },
    include: {
      puzzle: { select: { id: true, size: true, difficulty: true } },
    },
  });

  if (!session?.user?.id) {
    return NextResponse.json(
      levels.map((l) => ({
        id: l.id,
        number: l.number,
        name: l.name,
        size: l.puzzle.size,
        difficulty: l.puzzle.difficulty,
      }))
    );
  }

  const solves = await db.solve.findMany({
    where: { userId: session.user.id, levelId: { in: levels.map((l) => l.id) } },
  });
  const solveMap = Object.fromEntries(solves.map((s) => [s.levelId, s]));

  return NextResponse.json(
    levels.map((l) => ({
      id: l.id,
      number: l.number,
      name: l.name,
      size: l.puzzle.size,
      difficulty: l.puzzle.difficulty,
      solve: solveMap[l.id]
        ? {
            timeMs: solveMap[l.id].timeMs,
            completedAt: solveMap[l.id].completedAt,
            isPersonalBest: solveMap[l.id].isPersonalBest,
          }
        : null,
    }))
  );
}
