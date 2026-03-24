import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { signStartToken } from "@/lib/token";
import { GameClient } from "@/components/game/GameClient";
import type { Grid, Queens } from "@/lib/puzzle/validator";
import { resolveUserSettings } from "@/lib/user-settings";

interface PageProps {
  params: Promise<{ levelId: string }>;
}

export default async function LevelPlayPage({ params }: PageProps) {
  const { levelId } = await params;
  const session = await auth();

  const level = await db.level.findFirst({
    where: {
      id: levelId,
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      puzzle: {
        select: {
          id: true,
          size: true,
          difficulty: true,
          grid: true,
          solution: true,
          avgRating: true,
          ratingCount: true,
        },
      },
    },
  });

  if (!level) notFound();

  const [startToken, nextLevel, settings, existingRating] = await Promise.all([
    session?.user?.id
      ? signStartToken(session.user.id, level.puzzle.id)
      : Promise.resolve(null),

    db.level.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        OR: [
          { sortOrder: { gt: level.sortOrder } },
          { sortOrder: level.sortOrder, number: { gt: level.number } },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
      select: { id: true },
    }),

    session?.user?.id
      ? db.userSettings.findUnique({
          where: { userId: session.user.id },
          select: {
            confirmReset: true,
            highlightConflicts: true,
            showTimer: true,
            soundEffects: true,
          },
        })
      : Promise.resolve(null),

    session?.user?.id
      ? db.levelRating.findUnique({
          where: { userId_levelId: { userId: session.user.id, levelId } },
          select: { rating: true },
        })
      : Promise.resolve(null),
  ]);

  const preferences = resolveUserSettings(settings);

  return (
    <GameClient
      grid={level.puzzle.grid as Grid}
      puzzleId={level.puzzle.id}
      puzzleNumber={level.number}
      startToken={startToken}
      levelId={level.id}
      nextLevelId={nextLevel?.id ?? null}
      size={level.puzzle.size}
      preferences={preferences}
      isAuthenticated={!!session?.user?.id}
      userRating={existingRating?.rating ?? null}
      avgRating={level.puzzle.avgRating}
      ratingCount={level.puzzle.ratingCount}
      solution={level.puzzle.solution as Queens}
    />
  );
}
