import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatTimeMs, formatDate } from "@/lib/format";
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner";
import { computeDailyStreak, getAchievementSummary } from "@/lib/achievements";

export const metadata = {
  title: "Profile — Princess Puzzle",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const userId = session.user.id;

  const [user, totalLevels, levelsCompleted, bestSolve, dailySolves, credentialsAccount, achievements, achievementCount] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        include: {
          solves: {
            orderBy: { completedAt: "desc" },
            take: 5,
            include: {
              level: { select: { name: true, number: true } },
              dailyChallenge: { select: { number: true } },
            },
          },
        },
      }),
      db.level.count(),
      db.solve.count({
        where: { userId, levelId: { not: null } },
      }),
      db.solve.findFirst({
        where: { userId },
        orderBy: { timeMs: "asc" },
        select: { timeMs: true },
      }),
      db.solve.findMany({
        where: { userId, dailyChallengeId: { not: null } },
        select: { completedAt: true },
        orderBy: { completedAt: "desc" },
      }),
      db.account.findFirst({
        where: { userId, provider: "credentials" },
        select: { id: true },
      }),
      db.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "desc" },
        take: 6,
      }),
      db.achievement.count({ where: { userId } }),
    ]);

  if (!user) redirect("/auth/sign-in");

  const totalSolves = user.solves.length > 0 ? (await db.solve.count({ where: { userId } })) : 0;
  const streak = computeDailyStreak(dailySolves.map((s) => s.completedAt));
  const isUnverified = !!credentialsAccount && !user.emailVerified;
  const achievementSummaries = achievements
    .map((achievement) => {
      const summary = getAchievementSummary(achievement.type);
      if (!summary) return null;
      return {
        ...summary,
        unlockedAt: achievement.unlockedAt,
      };
    })
    .filter((achievement): achievement is NonNullable<typeof achievement> => achievement !== null);

  return (
    <>
      {isUnverified && user.email && (
        <EmailVerificationBanner email={user.email} />
      )}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-10">
      {/* Header */}
      <header className="flex items-center gap-4 mb-10">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.username}
            className="w-16 h-16 rounded-full border-2 border-[var(--accent)]"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-2xl font-bold">
            {user.username[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text)]"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {user.username}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Member since {formatDate(user.createdAt)}
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="mb-10">
        <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-4">
          Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Solves", value: totalSolves },
            {
              label: "Levels Completed",
              value: `${levelsCompleted} / ${totalLevels}`,
            },
            {
              label: "Best Time",
              value: bestSolve ? formatTimeMs(bestSolve.timeMs, true) : "—",
            },
            {
              label: "Daily Streak",
              value: streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "—",
            },
            {
              label: "Achievements",
              value: achievementCount > 0 ? achievementCount : "—",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4"
            >
              <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
              <p
                className="text-xl font-bold text-[var(--text)] tabular-nums"
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">
            Achievements
          </h2>
          {achievementCount > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              {achievementCount} unlocked
            </span>
          )}
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {achievementSummaries.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[var(--text-muted)] text-sm">
                Your next solve can unlock your first crown.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-px bg-[var(--border)]">
              {achievementSummaries.map((achievement) => (
                <div key={achievement.type} className="bg-[var(--bg-card)] p-5">
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                  >
                    {achievement.title}
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Unlocked {formatDate(achievement.unlockedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">
            Recent Activity
          </h2>
          <Link
            href="/profile/history"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Full History →
          </Link>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {user.solves.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[var(--text-muted)] text-sm">
                No solves yet.{" "}
                <Link href="/levels" className="text-[var(--accent)] hover:underline">
                  Play a puzzle!
                </Link>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {user.solves.map((solve, i) => {
                const label = solve.level
                  ? `Level ${solve.level.number}: ${solve.level.name}`
                  : solve.dailyChallenge
                  ? `Daily #${solve.dailyChallenge.number}`
                  : "Puzzle";
                return (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm text-[var(--text)]">{label}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(solve.completedAt)}
                      </p>
                    </div>
                    <span
                      className="text-sm font-semibold tabular-nums text-[var(--text)]"
                      style={{ fontFamily: "var(--font-mono), monospace" }}
                    >
                      {formatTimeMs(solve.timeMs, true)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
    </>
  );
}
