import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import LevelsPageClient from "@/components/game/LevelsPageClient";
import type { LevelWithSolve } from "@/components/game/LevelCard";

export const metadata: Metadata = { title: "Levels — Princess" };

export default async function LevelsPage() {
  const session = await auth();

  let levels: LevelWithSolve[] = [];

  try {
    const dbLevels = await db.level.findMany({
      orderBy: { number: "asc" },
      include: { puzzle: { select: { size: true, difficulty: true } } },
    });

    const solveMap: Record<string, LevelWithSolve["solve"]> = {};
    if (session?.user?.id) {
      const solves = await db.solve.findMany({
        where: {
          userId: session.user.id,
          levelId: { in: dbLevels.map((l) => l.id) },
        },
        select: {
          levelId: true,
          timeMs: true,
          completedAt: true,
        },
      });
      for (const s of solves) {
        if (s.levelId) solveMap[s.levelId] = s;
      }
    }

    levels = dbLevels.map((l) => ({
      id: l.id,
      number: l.number,
      name: l.name,
      difficulty: l.puzzle.difficulty,
      size: l.puzzle.size,
      solve: solveMap[l.id] ?? null,
    }));
  } catch {
    // DB not yet configured; render empty state
  }

  return <LevelsPageClient levels={levels} />;
}
