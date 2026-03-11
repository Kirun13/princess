import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CountdownTimer } from "@/components/social/CountdownTimer";
import { PastChallenges } from "@/components/social/PastChallenges";
import { formatTimeMs, formatDate } from "@/lib/format";

export const metadata = {
  title: "Daily Challenge — Princess Puzzle",
};

export default async function DailyPage() {
  const session = await auth();

  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const [challenge, pastChallenges] = await Promise.all([
    db.dailyChallenge.findFirst({
      where: { date: { lte: todayEnd } },
      orderBy: { date: "desc" },
    }),
    db.dailyChallenge.findMany({
      where: { date: { lt: todayStart } },
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

  // Compute if challenge is for today (not a past challenge shown today)
  const challengeDate = challenge ? new Date(challenge.date) : null;
  const isToday =
    challengeDate !== null &&
    challengeDate >= yesterdayStart &&
    challengeDate <= todayEnd;

  const formattedPast = pastChallenges.map((c) => ({
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
              No challenge available today. Check back soon!
            </p>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
                  {isToday ? "Today's Challenge" : "Current Challenge"}
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
