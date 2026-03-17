import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Princess — Queens Puzzle",
  description:
    "A minimalist Queens Puzzle for those who think in patterns. Place queens, avoid conflicts, beat the clock.",
};

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-12" />
      </svg>
    ),
    title: "Pure Logic",
    body: "No guessing, no randomness. Every puzzle has exactly one solution derivable by pure deduction.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
      </svg>
    ),
    title: "Daily Challenge",
    body: "A fresh puzzle drops every day. Keep your streak alive with a new challenge each morning.",
  },
];

const HOW_TO_STEPS = [
  { n: "01", label: "Place Queens", desc: "Click any cell to place a queen on the board." },
  { n: "02", label: "Avoid Conflicts", desc: "Red cells mean conflict — fix them before solving." },
  { n: "03", label: "Solve the Board", desc: "One queen per row, column, and region. No touching." },
];

export default async function HomePage() {
  let levelCount = 12;
  let challengeCount = 0;
  let solveCount = 0;

  try {
    const [publishedLevels, dailyChallenges, solves] = await Promise.all([
      db.level.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      db.dailyChallenge.count(),
      db.solve.count(),
    ]);
    levelCount = publishedLevels;
    challengeCount = dailyChallenges;
    solveCount = solves;
  } catch {
    // Render sensible defaults when the database is not available locally.
  }

  return (
    <div className="flex flex-col bg-[var(--bg-void)]">
      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-72px)] px-6 text-center overflow-hidden">
        {/* Ambient background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Label */}
        <p
          className="text-xs uppercase tracking-[3px] mb-8 relative"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--text-muted)",
          }}
        >
          Queens Puzzle
        </p>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight mb-6 relative max-w-3xl"
          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
        >
          Place your{" "}
          <span
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            queens.
          </span>
        </h1>

        <p
          className="text-base sm:text-lg mb-10 max-w-md leading-relaxed relative"
          style={{ color: "var(--text-muted)", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          A minimalist logic puzzle for those who think in patterns. One queen per row, column, and region.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative">
          <Link
            href="/levels"
            className="px-6 py-3 rounded-[8px] text-sm font-bold text-white transition-all duration-150 w-full sm:w-auto text-center"
            style={{
              fontFamily: "var(--font-mono), monospace",
              background: "var(--gradient-brand)",
              boxShadow: "0px 0px 24px rgba(124,58,237,0.4)",
            }}
          >
            Play Now
          </Link>
          <Link
            href="/daily"
            className="px-6 py-3 rounded-[8px] text-sm font-bold transition-all duration-150 w-full sm:w-auto text-center"
            style={{
              fontFamily: "var(--font-mono), monospace",
              background: "transparent",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            Daily Challenge
          </Link>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-around gap-6 text-center">
          {[
            { value: `${levelCount}+`, label: "Levels" },
            { value: challengeCount > 0 ? `${challengeCount}` : "∞", label: "Daily Archive" },
            { value: solveCount > 0 ? `${solveCount}+` : "Live", label: "Recorded Solves" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div
                className="text-3xl font-bold mb-1"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  background: "var(--gradient-brand)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {value}
              </div>
              <div
                className="text-xs uppercase tracking-[2px]"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs uppercase tracking-[3px] text-center mb-4"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            Why Princess?
          </p>
          <h2
            className="text-3xl sm:text-4xl font-black text-center mb-14"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
          >
            Built for deep focus.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-[12px] p-6 flex flex-col gap-4 transition-colors duration-150"
                style={{
                  background: "var(--surface-01)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ color: "var(--brand-light)" }}>{icon}</div>
                <h3
                  className="font-bold text-lg"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to play ── */}
      <section
        className="py-20 px-6"
        style={{ background: "var(--surface-01)", borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="text-xs uppercase tracking-[3px] mb-4"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            How It Works
          </p>
          <h2
            className="text-3xl sm:text-4xl font-black mb-16"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
          >
            Three rules. Infinite depth.
          </h2>
          <div className="flex flex-col sm:flex-row items-start justify-center gap-10 mb-12">
            {HOW_TO_STEPS.map(({ n, label, desc }) => (
              <div key={n} className="flex-1 flex flex-col items-center gap-4">
                <div
                  className="w-12 h-12 rounded-[8px] flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{
                    background: "var(--gradient-brand)",
                    boxShadow: "var(--glow-md)",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  {n}
                </div>
                <h3
                  className="font-bold"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                >
                  {label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/how-to-play"
            className="text-sm font-medium transition-colors duration-150"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--brand-light)" }}
          >
            Read the full guide →
          </Link>
        </div>
      </section>
    </div>
  );
}

