import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatTimeMs, formatDate } from "@/lib/format";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ solveId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { solveId } = await params;
  const solve = await db.solve.findUnique({
    where: { id: solveId },
    include: {
      user: { select: { username: true } },
      level: { select: { name: true, number: true } },
      dailyChallenge: { select: { number: true } },
    },
  });

  if (!solve) return { title: "Share — Princess Puzzle" };

  const challengeName = solve.level
    ? `Level ${solve.level.number}: ${solve.level.name}`
    : solve.dailyChallenge
    ? `Daily #${solve.dailyChallenge.number}`
    : "Princess Puzzle";

  const ogUrl = `${process.env.NEXTAUTH_URL ?? ""}/api/og?solveId=${solveId}`;

  return {
    title: `${solve.user.username} solved ${challengeName} — Princess Puzzle`,
    description: `Can you beat ${formatTimeMs(solve.timeMs, true)}?`,
    openGraph: {
      title: `${solve.user.username} solved ${challengeName}`,
      description: `Time: ${formatTimeMs(solve.timeMs, true)} · Can you beat me?`,
      images: [{ url: ogUrl, width: 600, height: 539 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${solve.user.username} solved ${challengeName}`,
      description: `Time: ${formatTimeMs(solve.timeMs, true)} · Can you beat me?`,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { solveId } = await params;

  const solve = await db.solve.findUnique({
    where: { id: solveId },
    include: {
      user: { select: { username: true, image: true } },
      level: { select: { name: true, number: true } },
      dailyChallenge: { select: { number: true } },
    },
  });

  if (!solve) notFound();

  const challengeName = solve.level
    ? `Level ${solve.level.number}: ${solve.level.name}`
    : solve.dailyChallenge
    ? `Daily Challenge #${solve.dailyChallenge.number}`
    : "Puzzle";

  const playHref = solve.level
    ? `/play/${solve.levelId}`
    : "/play/daily";

  const initial = solve.user.username[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Share card */}
        <div className="bg-gradient-to-br from-zinc-950 to-purple-950/30 border border-[var(--border)] rounded-2xl p-8 text-center shadow-2xl mb-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-3xl text-[var(--accent)]">♛</span>
            <span
              className="text-xl font-bold text-[var(--text)]"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              Princess
            </span>
          </div>

          {/* Challenge */}
          <p className="text-sm text-[var(--text-muted)] mb-2">{challengeName}</p>

          {/* Time */}
          <p
            className="text-6xl font-black text-[var(--text)] tabular-nums mb-1 tracking-tight"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {formatTimeMs(solve.timeMs, true)}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {formatDate(solve.completedAt)}
          </p>

          {/* CTA */}
          <p className="text-[var(--accent)] font-bold text-lg mb-8">
            Can you beat me?
          </p>

          {/* User */}
          <div className="flex items-center justify-center gap-3">
            {solve.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={solve.user.image}
                alt={solve.user.username}
                className="w-10 h-10 rounded-full border-2 border-[var(--accent)]/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold">
                {initial}
              </div>
            )}
            <span className="text-[var(--text-muted)]">
              @{solve.user.username}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href={playHref}
            className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-center transition-colors"
          >
            Play This Puzzle →
          </Link>
          <Link
            href="/"
            className="w-full py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] font-medium text-center transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
