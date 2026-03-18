import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveDailyChallengeState } from "@/lib/daily-challenge";
import { CountdownTimer } from "@/components/social/CountdownTimer";
import { PastChallenges } from "@/components/social/PastChallenges";
import { formatTimeMs, formatDate } from "@/lib/format";

type PastChallengeRecord = {
  id: string;
  number: number;
  date: Date;
  puzzle: {
    grid: unknown;
    size: number;
  };
  solves: Array<{
    timeMs: number;
    user: {
      username: string;
      image: string | null;
    };
  }>;
};

export const metadata = {
  title: "Daily Challenge — Princess Puzzle",
};

export default async function DailyPage() {
  const session = await auth();
  const { activeChallengeForToday, todayStartUtc } = await resolveDailyChallengeState();

  const [challenge, pastChallenges] = await Promise.all([
    activeChallengeForToday
      ? db.dailyChallenge.findUnique({
          where: { id: activeChallengeForToday.id },
          include: { puzzle: { select: { avgRating: true, ratingCount: true } } },
        })
      : Promise.resolve(null),
    db.dailyChallenge.findMany({
      where: { date: { lt: todayStartUtc } },
      orderBy: { date: "desc" },
      include: {
        puzzle: { select: { grid: true, size: true } },
        solves: {
          orderBy: { timeMs: "asc" },
          take: 3,
          include: { user: { select: { username: true, image: true } } },
        },
      },
    }),
  ]);

  let userSolve: { timeMs: number } | null = null;
  let myRank: number | null = null;

  if (session?.user?.id && challenge) {
    userSolve = await db.solve.findUnique({
      where: {
        userId_dailyChallengeId: {
          userId: session.user.id,
          dailyChallengeId: challenge.id,
        },
      },
      select: { timeMs: true },
    });

    if (userSolve) {
      myRank =
        (await db.solve.count({
          where: {
            dailyChallengeId: challenge.id,
            timeMs: { lt: userSolve.timeMs },
          },
        })) + 1;
    }
  }

  const formattedPast = (pastChallenges as PastChallengeRecord[]).map((c) => ({
    id: c.id,
    number: c.number,
    date: c.date.toISOString(),
    grid: c.puzzle.grid as number[][],
    size: c.puzzle.size,
    topSolves: c.solves.map((s, i) => ({
      rank: i + 1,
      username: s.user.username,
      image: s.user.image,
      timeMs: s.timeMs,
    })),
  }));

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-10">
      {/* Today's challenge */}
      <section className="mb-12">
        <h1
          className="text-3xl font-bold text-[var(--text)] mb-6"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          ♛ Daily Challenge
        </h1>

        {!challenge ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <p className="text-[var(--text-muted)]">
              Today&apos;s challenge isn&apos;t published yet. Daily boards go live at 00:00 UTC.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
                  Today&apos;s Challenge
                </p>
                <p
                  className="text-2xl font-bold text-[var(--text)]"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  #{challenge.number}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {formatDate(challenge.date)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Daily boards reset at 00:00 UTC.
                </p>
                {challenge.puzzle.ratingCount > 0 && (
                  <p
                    className="text-sm mt-2"
                    style={{ fontFamily: "var(--font-mono), monospace", color: "#F59E0B" }}
                  >
                    ★ {challenge.puzzle.avgRating.toFixed(1)}{" "}
                    <span style={{ color: "var(--text-muted)" }}>
                      ({challenge.puzzle.ratingCount} {challenge.puzzle.ratingCount === 1 ? "rating" : "ratings"})
                    </span>
                  </p>
                )}
              </div>
              <CountdownTimer />
            </div>

            {userSolve ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--success)] text-lg">✓</span>
                  <p className="text-[var(--text)] font-medium">
                    You&apos;ve completed today&apos;s challenge!
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">
                      Your Time
                    </p>
                    <p
                      className="text-2xl font-bold text-[var(--text)] tabular-nums"
                      style={{ fontFamily: "var(--font-mono), monospace" }}
                    >
                      {formatTimeMs(userSolve.timeMs, true)}
                    </p>
                  </div>
                  {myRank !== null && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">
                        Your Rank
                      </p>
                      <p
                        className="text-2xl font-bold text-[var(--accent)] tabular-nums"
                        style={{ fontFamily: "var(--font-mono), monospace" }}
                      >
                        #{myRank}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/daily/leaderboard"
                    className="inline-flex px-4 py-2 rounded-[8px] text-sm font-semibold"
                    style={{
                      background: "var(--gradient-brand)",
                      color: "white",
                      fontFamily: "var(--font-mono), monospace",
                    }}
                  >
                    View Leaderboard
                  </Link>
                  <Link
                    href={`/daily/${challenge.number}`}
                    className="inline-flex px-4 py-2 rounded-[8px] text-sm font-semibold"
                    style={{
                      border: "1px solid var(--border-default)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono), monospace",
                    }}
                  >
                    View Archive
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href="/play/daily"
                className="inline-block px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
              >
                Play Today&apos;s Challenge →
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Past challenges */}
      <section>
        <h2
          className="text-xl font-bold text-[var(--text)] mb-4"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          Past Challenges
        </h2>
        <PastChallenges challenges={formattedPast} />
      </section>
    </div>
  );
}
