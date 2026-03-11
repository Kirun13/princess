"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { formatTimeMs, formatDate } from "@/lib/format";

interface SolveEntry {
  timeMs: number;
  completedAt: string;
  level: { name: string; number: number } | null;
  daily: { number: number; date: string } | null;
}

interface HistoryResponse {
  solves: SolveEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function HistoryClient() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError } = useQuery<HistoryResponse>({
    queryKey: ["profile-history", page],
    queryFn: async () => {
      const res = await fetch(
        `/api/profile/history?page=${page}&limit=20`
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<HistoryResponse>;
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-[var(--border)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-center text-[var(--error)] py-8">
        Failed to load history.
      </p>
    );
  }

  const { solves = [], pagination } = data ?? {};

  if (solves.length === 0) {
    return (
      <p className="text-center text-[var(--text-muted)] py-12">
        No solves yet. Go play a puzzle!
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="text-left pb-3 pr-4">Level / Challenge</th>
              <th className="text-right pb-3 pr-4">Time</th>
              <th className="text-right pb-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {solves.map((solve, i) => {
              const label = solve.level
                ? `Level ${solve.level.number}: ${solve.level.name}`
                : solve.daily
                ? `Daily #${solve.daily.number}`
                : "Unknown";
              return (
                <tr
                  key={i}
                  className="hover:bg-[var(--bg-card)] transition-colors"
                >
                  <td className="py-3 pr-4 text-[var(--text)]">{label}</td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className="tabular-nums text-[var(--text)]"
                      style={{ fontFamily: "var(--font-mono), monospace" }}
                    >
                      {formatTimeMs(solve.timeMs, true)}
                    </span>
                  </td>
                  <td className="py-3 text-right text-[var(--text-muted)]">
                    {formatDate(solve.completedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)]">
            {pagination.total} total solve{pagination.total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1 || isFetching}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-[var(--text-muted)] tabular-nums">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.pages || isFetching}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
