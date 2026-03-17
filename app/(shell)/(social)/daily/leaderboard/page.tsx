import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatDate, formatTimeMs } from "@/lib/format";

export const metadata = {
  title: "Daily Leaderboard — Princess Puzzle",
};

export default async function DailyLeaderboardPage() {
  const session = await auth();

  const challenge = await db.dailyChallenge.findFirst({
    where: { date: { lte: new Date() } },
    orderBy: { date: "desc" },
    include: {
      solves: {
        orderBy: [{ timeMs: "asc" }, { completedAt: "asc" }],
        take: 25,
        include: {
          user: { select: { id: true, username: true, image: true } },
        },
      },
    },
  });

  if (!challenge) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-mono), monospace" }}>
            No active leaderboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            A daily leaderboard appears once a challenge has been published.
          </p>
          <Link
            href="/daily"
            className="inline-flex px-4 py-2 rounded-[8px] text-sm font-semibold"
            style={{ background: "var(--gradient-brand)", color: "white", fontFamily: "var(--font-mono), monospace" }}
          >
            Back to Daily
          </Link>
        </div>
      </div>
    );
  }

  const userSolve = session?.user?.id
    ? await db.solve.findUnique({
        where: {
          userId_dailyChallengeId: {
            userId: session.user.id,
            dailyChallengeId: challenge.id,
          },
        },
        select: { timeMs: true },
      })
    : null;
  const userRank = userSolve
    ? (await db.solve.count({
        where: {
          dailyChallengeId: challenge.id,
          timeMs: { lt: userSolve.timeMs },
        },
      })) + 1
    : null;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1
            className="text-3xl font-bold text-[var(--text)] mb-2"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            Daily Leaderboard
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Challenge #{challenge.number} · {formatDate(challenge.date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/play/daily"
            className="px-4 py-2 rounded-[8px] text-sm font-semibold"
            style={{
              background: "var(--gradient-brand)",
              color: "white",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            Play Daily
          </Link>
          <Link
            href="/daily"
            className="px-4 py-2 rounded-[8px] text-sm font-semibold"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            Back
          </Link>
        </div>
      </div>

      {userRank !== null && (
        <div
          className="rounded-[12px] px-4 py-3 mb-6"
          style={{ background: "var(--surface-01)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-xs uppercase tracking-[2px] mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
            Your Standing
          </p>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}>
            #{userRank}
          </p>
        </div>
      )}

      <div
        className="rounded-[14px] overflow-hidden"
        style={{ background: "var(--surface-01)", border: "1px solid var(--border-subtle)" }}
      >
        <div
          className="grid grid-cols-[80px_minmax(0,1fr)_120px] gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono), monospace" }}
        >
          <span className="text-xs text-[var(--text-muted)]">Rank</span>
          <span className="text-xs text-[var(--text-muted)]">Player</span>
          <span className="text-xs text-right text-[var(--text-muted)]">Time</span>
        </div>

        {challenge.solves.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            No solves yet. Be the first to claim the board.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {challenge.solves.map((solve, index) => (
              <div key={solve.id} className="grid grid-cols-[80px_minmax(0,1fr)_120px] gap-4 px-4 py-3 items-center">
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: index === 0 ? "#FCD34D" : index === 1 ? "#D4D4D8" : index === 2 ? "#FDBA74" : "var(--text-primary)",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  #{index + 1}
                </span>
                <div className="min-w-0 flex items-center gap-3">
                  {solve.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={solve.user.image} alt={solve.user.username} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--surface-02)", color: "var(--text-primary)" }}>
                      {solve.user.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-sm text-[var(--text-primary)]">@{solve.user.username}</span>
                </div>
                <span className="text-right text-sm text-[var(--text-primary)]" style={{ fontFamily: "var(--font-mono), monospace" }}>
                  {formatTimeMs(solve.timeMs, true)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
