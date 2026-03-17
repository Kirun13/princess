import { db } from "@/lib/db";

export const ACHIEVEMENT_DEFINITIONS = {
  FIRST_CROWN: {
    title: "First Crown",
    description: "Complete your first puzzle.",
  },
  LEVEL_APPRENTICE: {
    title: "Level Apprentice",
    description: "Clear 5 main levels.",
  },
  DAILY_REGULAR: {
    title: "Daily Regular",
    description: "Finish 3 daily challenges.",
  },
  STREAK_KEEPER: {
    title: "Streak Keeper",
    description: "Maintain a 3-day daily streak.",
  },
  LIGHTNING_CROWN: {
    title: "Lightning Crown",
    description: "Solve any puzzle in under 60 seconds.",
  },
} as const;

export type AchievementType = keyof typeof ACHIEVEMENT_DEFINITIONS;

export interface AchievementSummary {
  type: AchievementType;
  title: string;
  description: string;
}

function toSummary(type: AchievementType): AchievementSummary {
  return {
    type,
    title: ACHIEVEMENT_DEFINITIONS[type].title,
    description: ACHIEVEMENT_DEFINITIONS[type].description,
  };
}

export function computeDailyStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = [
    ...new Set(
      dates.map((d) => {
        const u = new Date(d);
        return `${u.getUTCFullYear()}-${u.getUTCMonth()}-${u.getUTCDate()}`;
      })
    ),
  ].sort((a, b) => (a < b ? 1 : -1));

  const now = new Date();
  const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  const yesterdayKey = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth()}-${yesterday.getUTCDate()}`;

  if (uniqueDays[0] !== todayKey && uniqueDays[0] !== yesterdayKey) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const [y1, m1, d1] = uniqueDays[i - 1].split("-").map(Number);
    const [y2, m2, d2] = uniqueDays[i].split("-").map(Number);
    const prev = Date.UTC(y1, m1, d1);
    const curr = Date.UTC(y2, m2, d2);
    if (Math.round((prev - curr) / 86_400_000) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function syncAchievementsForSolve(input: {
  userId: string;
  timeMs: number;
}) {
  const [existing, totalSolves, levelSolves, dailySolves] = await Promise.all([
    db.achievement.findMany({
      where: { userId: input.userId },
      select: { type: true },
    }),
    db.solve.count({ where: { userId: input.userId } }),
    db.solve.count({ where: { userId: input.userId, levelId: { not: null } } }),
    db.solve.findMany({
      where: { userId: input.userId, dailyChallengeId: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const existingTypes = new Set(existing.map((achievement) => achievement.type));
  const dailyCount = dailySolves.length;
  const streak = computeDailyStreak(dailySolves.map((solve) => solve.completedAt));
  const nextTypes: AchievementType[] = [];

  if (totalSolves >= 1) nextTypes.push("FIRST_CROWN");
  if (levelSolves >= 5) nextTypes.push("LEVEL_APPRENTICE");
  if (dailyCount >= 3) nextTypes.push("DAILY_REGULAR");
  if (streak >= 3) nextTypes.push("STREAK_KEEPER");
  if (input.timeMs < 60_000) nextTypes.push("LIGHTNING_CROWN");

  const unlockedTypes = nextTypes.filter((type) => !existingTypes.has(type));
  if (unlockedTypes.length === 0) return [] satisfies AchievementSummary[];

  await db.achievement.createMany({
    data: unlockedTypes.map((type) => ({
      userId: input.userId,
      type,
    })),
  });

  return unlockedTypes.map(toSummary);
}

export function getAchievementSummary(type: string) {
  if (!(type in ACHIEVEMENT_DEFINITIONS)) return null;
  return toSummary(type as AchievementType);
}
