"use client";

import { useState, useMemo } from "react";
import LevelRow from "./LevelRow";
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

const PAGE_SIZE = 50;

type Props = { levels: LevelWithSolve[] };

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all duration-150"
      style={{
        fontFamily: "var(--font-mono), monospace",
        background: active ? "var(--gradient-brand)" : "transparent",
        border: active ? "none" : "1px solid var(--border-default)",
        color: active ? "white" : "var(--text-muted)",
        boxShadow: active ? "var(--glow-sm)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

export default function LevelsPageClient({ levels }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [status, setStatus] = useState<Status>("not-started");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const completed = levels.filter((l) => l.solve).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return levels.filter((l) => {
      const diffOk = difficulty === "all" || l.difficulty === difficulty;
      const statusOk =
        status === "all" ? true : status === "completed" ? !!l.solve : !l.solve;
      const searchOk =
        !q ||
        l.name.toLowerCase().includes(q) ||
        String(l.number).includes(q);
      return diffOk && statusOk && searchOk;
    });
  }, [levels, difficulty, status, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div
      className="min-h-full w-full"
      style={{ background: "var(--bg-void)", paddingTop: "60px", paddingBottom: "60px" }}
    >
      <div className="max-w-3xl mx-auto px-6 w-full">
        {/* Header */}
        <div className="mb-8">
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

        {/* Filters + Search */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5 flex-wrap">
              {DIFFICULTIES.map((d) => (
                <FilterBtn
                  key={d}
                  active={difficulty === d}
                  onClick={() => handleFilterChange(() => setDifficulty(d))}
                >
                  {DIFFICULTY_LABELS[d]}
                </FilterBtn>
              ))}
            </div>
            <div className="w-px hidden sm:block self-stretch" style={{ background: "var(--border-subtle)" }} />
            <div className="flex gap-1.5 flex-wrap">
              {STATUSES.map(({ value, label }) => (
                <FilterBtn
                  key={value}
                  active={status === value}
                  onClick={() => handleFilterChange(() => setStatus(value))}
                >
                  {label}
                </FilterBtn>
              ))}
            </div>
          </div>

          {/* Search */}
          <input
            type="search"
            placeholder="Search by name or #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none transition-colors duration-150"
            style={{
              fontFamily: "var(--font-mono), monospace",
              background: "var(--surface-01)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p
            className="text-center py-16"
            style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
          >
            No levels match your filters.
          </p>
        ) : (
          <>
            {/* Column headers */}
            <div
              className="flex items-center gap-3 px-4 pb-2 mb-1"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span className="text-xs w-10 flex-shrink-0" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>#</span>
              <span className="text-xs flex-1" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Name</span>
              <span className="text-xs flex-shrink-0 hidden sm:block" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)", width: "64px" }}>Diff</span>
              <span className="text-xs flex-shrink-0 w-10 text-right hidden md:block" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Size</span>
              <span className="text-xs flex-shrink-0 w-14 text-right hidden lg:block" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Rating</span>
              <span className="text-xs flex-shrink-0 w-20 text-right" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>Best</span>
            </div>

            <div className="flex flex-col" style={{ gap: "1px" }}>
              {paginated.map((level) => (
                <LevelRow key={level.id} level={level} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <span
                  className="text-xs"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                >
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all duration-150 disabled:opacity-30"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      background: "transparent",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-muted)",
                    }}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all duration-150 disabled:opacity-30"
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      background: "transparent",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
