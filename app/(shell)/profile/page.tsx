import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatTimeMs, formatDate } from "@/lib/format";
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner";

export const metadata = {
  title: "Profile — Princess Puzzle",
};

function computeDailyStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = [
    ...new Set(
      dates.map((d) => {
        const u = new Date(d);
        return `${u.getUTCFullYear()}-${u.getUTCMonth()}-${u.getUTCDate()}`;
      })
    ),
  ].sort((a, b) => (a < b ? 1 : -1)); // descending

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

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const userId = session.user.id;

  const [user, totalLevels, levelsCompleted, bestSolve, dailySolves, credentialsAccount] =
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
    ]);

  if (!user) redirect("/auth/sign-in");

  const totalSolves = user.solves.length > 0 ? (await db.solve.count({ where: { userId } })) : 0;
  const streak = computeDailyStreak(dailySolves.map((s) => s.completedAt));
  const isUnverified = !!credentialsAccount && !user.emailVerified;

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
