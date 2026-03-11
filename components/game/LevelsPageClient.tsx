"use client";

import { useState, useMemo } from "react";
import LevelCard from "./LevelCard";
import type { LevelWithSolve } from "./LevelCard";

type Difficulty = "all" | "easy" | "medium" | "hard" | "expert";
type Status = "all" | "completed" | "not-started";

const DIFFICULTIES: Difficulty[] = ["all", "easy", "medium", "hard", "expert"];
const STATUSES: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "not-started", label: "Not Started" },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  all: "All",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

type Props = {
  levels: LevelWithSolve[];
};

export default function LevelsPageClient({ levels }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [status, setStatus] = useState<Status>("not-started");

  const completed = levels.filter((l) => l.solve).length;

  const filtered = useMemo(
    () =>
      levels.filter((l) => {
        const diffOk = difficulty === "all" || l.difficulty === difficulty;
        const statusOk =
          status === "all"
            ? true
            : status === "completed"
            ? !!l.solve
            : !l.solve;
        return diffOk && statusOk;
      }),
    [levels, difficulty, status]
  );

  return (
    <div
      className="min-h-full w-full"
      style={{ background: "var(--bg-void)", paddingTop: "60px", paddingBottom: "60px" }}
    >
      <div className="max-w-5xl mx-auto px-6 w-full">
        {/* Header */}
        <div className="mb-10">
          <p
            className="text-xs uppercase tracking-[3px] mb-3"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            Queens Puzzle
          </p>
          <h1
            className="text-4xl font-black mb-6"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
          >
            Choose a Level
          </h1>
          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--border-subtle)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${levels.length ? (completed / levels.length) * 100 : 0}%`,
                  background: "var(--gradient-brand)",
                }}
              />
            </div>
            <span
              className="text-xs whitespace-nowrap"
              style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
            >
              {completed} / {levels.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-10">
          <div className="flex gap-1.5 flex-wrap">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all duration-150"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  background: difficulty === d ? "var(--gradient-brand)" : "transparent",
                  border: difficulty === d ? "none" : "1px solid var(--border-default)",
                  color: difficulty === d ? "white" : "var(--text-muted)",
                  boxShadow: difficulty === d ? "var(--glow-sm)" : undefined,
                }}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="w-px hidden sm:block" style={{ background: "var(--border-subtle)" }} />
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className="px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all duration-150"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  background: status === value ? "var(--gradient-brand)" : "transparent",
                  border: status === value ? "none" : "1px solid var(--border-default)",
                  color: status === value ? "white" : "var(--text-muted)",
                  boxShadow: status === value ? "var(--glow-sm)" : undefined,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p
            className="text-center py-16"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            No levels match your filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((level) => (
              <LevelCard key={level.id} level={level} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
