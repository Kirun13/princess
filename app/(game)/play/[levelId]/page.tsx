import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { signStartToken } from "@/lib/token";
import { GameClient } from "@/components/game/GameClient";
import type { Grid } from "@/lib/puzzle/validator";

interface PageProps {
  params: Promise<{ levelId: string }>;
}

export default async function LevelPlayPage({ params }: PageProps) {
  const { levelId } = await params;
  const session = await auth();

  const level = await db.level.findUnique({
    where: { id: levelId },
    include: {
      puzzle: {
        select: { id: true, size: true, difficulty: true, grid: true, avgRating: true, ratingCount: true },
      },
    },
  });

  if (!level) notFound();

  const [startToken, nextLevel, settings, existingRating] = await Promise.all([
    session?.user?.id
      ? signStartToken(session.user.id, level.puzzle.id)
      : Promise.resolve(null),

    db.level.findFirst({
      where: { number: { gt: level.number } },
      orderBy: { number: "asc" },
      select: { id: true },
    }),

    session?.user?.id
      ? db.userSettings.findUnique({
          where: { userId: session.user.id },
          select: { confirmReset: true },
        })
      : Promise.resolve(null),

    session?.user?.id
      ? db.levelRating.findUnique({
          where: { userId_levelId: { userId: session.user.id, levelId } },
          select: { rating: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <GameClient
      grid={level.puzzle.grid as Grid}
      puzzleId={level.puzzle.id}
      startToken={startToken}
      levelId={level.id}
      nextLevelId={nextLevel?.id ?? null}
      size={level.puzzle.size}
      difficulty={level.puzzle.difficulty}
      confirmReset={settings?.confirmReset ?? false}
      isAuthenticated={!!session?.user?.id}
      userRating={existingRating?.rating ?? null}
      avgRating={level.puzzle.avgRating}
      ratingCount={level.puzzle.ratingCount}
    />
  );
}
