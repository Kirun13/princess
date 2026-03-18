import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ReadOnlyGrid } from "@/components/game/ReadOnlyGrid";
import { formatDate, formatTimeMs } from "@/lib/format";

type DailyArchivePageProps = {
  params: Promise<{
    number: string;
  }>;
};

export async function generateMetadata({ params }: DailyArchivePageProps) {
  const { number } = await params;

  return {
    title: `Daily #${number} Archive — Princess Puzzle`,
  };
}

export default async function DailyArchivePage({ params }: DailyArchivePageProps) {
  const { number } = await params;
  const challengeNumber = Number.parseInt(number, 10);

  if (!Number.isInteger(challengeNumber) || challengeNumber <= 0) {
    notFound();
  }

  const challenge = await db.dailyChallenge.findUnique({
    where: { number: challengeNumber },
    include: {
      puzzle: {
        select: {
          grid: true,
          size: true,
          avgRating: true,
          ratingCount: true,
        },
      },
      solves: {
        orderBy: [{ timeMs: "asc" }, { completedAt: "asc" }],
        include: {
          user: {
            select: {
              username: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!challenge) {
    notFound();
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <Link
            href="/daily"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors inline-block mb-4"
          >
            ← Back to Daily
          </Link>
          <h1
            className="text-3xl font-bold text-[var(--text)] mb-2"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            Daily Archive #{challenge.number}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {formatDate(challenge.date)} · {challenge.puzzle.size}×{challenge.puzzle.size}
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

        <div className="flex gap-2">
          <Link
            href="/daily/leaderboard"
            className="px-4 py-2 rounded-[8px] text-sm font-semibold"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            Current Leaderboard
          </Link>
          <Link
            href="/play/daily"
            className="px-4 py-2 rounded-[8px] text-sm font-semibold"
            style={{
              background: "var(--gradient-brand)",
              color: "white",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            Play Today
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section
          className="rounded-[18px] border p-5"
          style={{ background: "var(--surface-01)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-xs uppercase tracking-[2px] mb-4" style={{ color: "var(--text-muted)" }}>
            Board
          </p>
          <ReadOnlyGrid grid={challenge.puzzle.grid as number[][]} cellSize={30} />
        </section>

        <section
          className="rounded-[18px] border overflow-hidden"
          style={{ background: "var(--surface-01)", borderColor: "var(--border-subtle)" }}
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
              No solves were recorded for this daily challenge.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {challenge.solves.map((solve, index) => (
                <div
                  key={solve.id}
                  className="grid grid-cols-[80px_minmax(0,1fr)_120px] gap-4 px-4 py-3 items-center"
                >
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color:
                        index === 0
                          ? "#FCD34D"
                          : index === 1
                            ? "#D4D4D8"
                            : index === 2
                              ? "#FDBA74"
                              : "var(--text-primary)",
                      fontFamily: "var(--font-mono), monospace",
                    }}
                  >
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex items-center gap-3">
                    {solve.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={solve.user.image}
                        alt={solve.user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: "var(--surface-02)", color: "var(--text-primary)" }}
                      >
                        {solve.user.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-sm text-[var(--text-primary)]">
                      @{solve.user.username}
                    </span>
                  </div>
                  <span
                    className="text-right text-sm text-[var(--text-primary)]"
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    {formatTimeMs(solve.timeMs, true)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
