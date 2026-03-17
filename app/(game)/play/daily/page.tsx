import { auth } from "@/auth";
import { db } from "@/lib/db";
import { signStartToken } from "@/lib/token";
import { GameClient } from "@/components/game/GameClient";
import type { Grid, Queens } from "@/lib/puzzle/validator";
import { resolveUserSettings } from "@/lib/user-settings";

export default async function DailyPlayPage() {
  const session = await auth();

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const challenge = await db.dailyChallenge.findFirst({
    where: { date: { lte: today } },
    orderBy: { date: "desc" },
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

  if (!challenge) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">♛</div>
          <h1
            className="text-2xl font-bold text-[var(--text)] mb-2"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            Come back tomorrow!
          </h1>
          <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto">
            No daily challenge is available right now. Check back soon for a
            fresh puzzle.
          </p>
        </div>
      </div>
    );
  }

  const [startToken, settings, existingRating] = await Promise.all([
    session?.user?.id
      ? signStartToken(session.user.id, challenge.puzzle.id)
      : Promise.resolve(null),

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
          where: {
            userId_dailyChallengeId: {
              userId: session.user.id,
              dailyChallengeId: challenge.id,
            },
          },
          select: { rating: true },
        })
      : Promise.resolve(null),
  ]);

  const preferences = resolveUserSettings(settings);

  return (
    <GameClient
      grid={challenge.puzzle.grid as Grid}
      puzzleId={challenge.puzzle.id}
      startToken={startToken}
      dailyChallengeId={challenge.id}
      size={challenge.puzzle.size}
      preferences={preferences}
      isAuthenticated={!!session?.user?.id}
      userRating={existingRating?.rating ?? null}
      avgRating={challenge.puzzle.avgRating}
      ratingCount={challenge.puzzle.ratingCount}
      solution={challenge.puzzle.solution as Queens}
    />
  );
}
