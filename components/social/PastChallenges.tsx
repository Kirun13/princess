"use client";

import { useState } from "react";
import { ReadOnlyGrid } from "@/components/game/ReadOnlyGrid";
import { formatTimeMs, formatDate } from "@/lib/format";

interface TopSolve {
  rank: number;
  username: string;
  image: string | null;
  timeMs: number;
}

interface PastChallenge {
  id: string;
  number: number;
  date: string;
  grid: number[][];
  size: number;
  topSolves: TopSolve[];
}

const RANK_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

interface PastChallengesProps {
  challenges: PastChallenge[];
}

export function PastChallenges({ challenges }: PastChallengesProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (challenges.length === 0) {
    return (
      <p className="text-center text-[var(--text-muted)] py-8">
        No past challenges yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {challenges.map((challenge) => {
        const isOpen = expanded === challenge.id;
        return (
          <div
            key={challenge.id}
            className="border border-[var(--border)] rounded-xl overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 bg-[var(--bg-card)] hover:bg-[var(--border)] transition-colors text-left"
              onClick={() => setExpanded(isOpen ? null : challenge.id)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-4">
                <span
                  className="text-sm font-bold text-[var(--accent)]"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  #{challenge.number}
                </span>
                <span className="text-sm text-[var(--text)]">
                  {formatDate(challenge.date)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {challenge.size}×{challenge.size}
                </span>
              </div>
              <span className="text-[var(--text-muted)] text-xs">
                {isOpen ? "▲ Hide" : "▼ Show"}
              </span>
            </button>

            {isOpen && (
              <div className="p-5 bg-[var(--bg)] border-t border-[var(--border)] flex flex-col md:flex-row gap-6 items-start">
                {/* Read-only grid */}
                <ReadOnlyGrid grid={challenge.grid} cellSize={28} />

                {/* Top finishers */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    Top Finishers
                  </p>
                  {challenge.topSolves.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      No solves on record.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {challenge.topSolves.map((solve) => (
                        <div
                          key={solve.rank}
                          className="flex items-center gap-3"
                        >
                          <span
                            className="w-8 text-sm font-bold tabular-nums shrink-0"
                            style={{
                              color: RANK_COLORS[solve.rank] ?? "var(--text-muted)",
                              fontFamily: "var(--font-mono), monospace",
                            }}
                          >
                            #{solve.rank}
                          </span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {solve.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={solve.image}
                                alt={solve.username}
                                className="w-6 h-6 rounded-full shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs shrink-0">
                                {solve.username[0]?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <span className="text-sm text-[var(--text)] truncate">
                              {solve.username}
                            </span>
                          </div>
                          <span
                            className="text-sm tabular-nums text-[var(--text-muted)] shrink-0"
                            style={{ fontFamily: "var(--font-mono), monospace" }}
                          >
                            {formatTimeMs(solve.timeMs, true)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
