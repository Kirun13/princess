import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How to Play — Princess" };

const RULES = [
  "Place exactly one queen in each row.",
  "Place exactly one queen in each column.",
  "Place exactly one queen in each color region.",
  "No two queens may touch each other — including diagonally.",
];

const CONTROLS = [
  { input: "Click a cell", action: "Place or remove a queen" },
  { input: "Arrow keys", action: "Move the keyboard cursor" },
  { input: "Space / Enter", action: "Toggle a queen on the focused cell" },
  { input: "P or Escape", action: "Pause / resume the timer" },
];

const TIPS = [
  "Start with regions that have the fewest available cells — they constrain the most.",
  "Corner cells often belong to small regions; queens placed there eliminate many options.",
  "If placing a queen in a cell would make another region unsolvable, eliminate that cell.",
  "Work row by row and column by column to spot forced placements quickly.",
];

export default function HowToPlayPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 w-full">
      <h1
        className="text-3xl font-bold text-[var(--text)] mb-10"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        How to Play
      </h1>

      {/* Rules */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">The Rules</h2>
        <ol className="space-y-3">
          {RULES.map((rule, i) => (
            <li key={i} className="flex gap-4 items-start">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent)] text-white text-sm font-bold flex items-center justify-center"
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                {i + 1}
              </span>
              <p className="text-[var(--text-muted)] leading-relaxed pt-0.5">{rule}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Controls */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Controls</h2>
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-card)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Input</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {CONTROLS.map(({ input, action }, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <code
                      className="text-[var(--accent)] font-mono text-xs bg-[var(--accent)]/10 px-1.5 py-0.5 rounded"
                    >
                      {input}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Conflict indicators */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Conflict Indicators</h2>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 text-[var(--text-muted)] leading-relaxed space-y-2">
          <p>
            When two queens conflict, their cells turn{" "}
            <span className="text-red-400 font-semibold">red</span> with a highlighted border.
          </p>
          <p>
            A conflict means one of the four rules is violated. Remove one of the red queens and
            reconsider your placement — the puzzle always has exactly one valid solution.
          </p>
        </div>
      </section>

      {/* Tips */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Strategy Tips</h2>
        <ul className="space-y-3">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex gap-3 items-start text-[var(--text-muted)]">
              <span className="text-[var(--accent)] font-bold flex-shrink-0 mt-0.5">→</span>
              <p className="leading-relaxed">{tip}</p>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/levels"
        className="inline-block px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
      >
        Start Playing →
      </Link>
    </div>
  );
}
