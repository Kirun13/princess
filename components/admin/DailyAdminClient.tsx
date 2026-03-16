"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { ReadOnlyGrid } from "@/components/game/ReadOnlyGrid";

type DailyPreview = {
  date: string;
  challenge: {
    id: string;
    number: number;
    puzzleId: string;
    size: number;
    difficulty: string;
    hash: string;
    grid: number[][];
  } | null;
};

export function DailyAdminClient() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, isFetching } = useQuery<DailyPreview>({
    queryKey: ["admin-daily-next"],
    queryFn: async () => {
      const res = await fetch("/api/admin/daily/next");
      if (!res.ok) throw new Error("Failed to load tomorrow preview");
      return res.json() as Promise<DailyPreview>;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/daily/next/generate", { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to generate next daily");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-daily-next"] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/daily/next/regenerate", { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to regenerate next daily");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-daily-next"] });
    },
  });

  const challenge = data?.challenge ?? null;
  const prettyDate = data?.date
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(data.date))
    : "Tomorrow";

  return (
    <div className="min-h-full w-full px-4 py-10 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[24px] border p-6" style={{ background: "var(--surface-01)", borderColor: "var(--border-default)", boxShadow: "var(--glow-xl)" }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[4px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                Admin Console
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
                Tomorrow&apos;s Daily
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">
                Preview tomorrow&apos;s board, generate it ahead of time, or replace it before it goes live.
              </p>
            </div>
            <AdminSectionNav />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[22px] border p-5" style={{ background: "var(--surface-01)", borderColor: "var(--border-subtle)" }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[3px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
                  Schedule
                </p>
                <h2 className="mt-2 text-xl font-bold" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
                  {prettyDate}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="rounded-[10px] px-4 py-2 text-xs font-bold uppercase tracking-[2px] text-white disabled:opacity-40"
                  style={{ fontFamily: "var(--font-mono), monospace", background: "var(--gradient-brand)" }}
                >
                  {generateMutation.isPending ? "Generating..." : "Generate Tomorrow"}
                </button>
                <button
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isPending || !challenge}
                  className="rounded-[10px] border px-4 py-2 text-xs font-bold uppercase tracking-[2px] disabled:opacity-40"
                  style={{ fontFamily: "var(--font-mono), monospace", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                >
                  {regenerateMutation.isPending ? "Regenerating..." : "Regenerate Tomorrow"}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-4 h-[320px] animate-pulse rounded-[18px]" style={{ background: "var(--surface-02)" }} />
            ) : isError ? (
              <p className="mt-4 py-8 text-center text-[var(--color-error)]">Failed to load next daily preview.</p>
            ) : challenge ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[18px] border p-4" style={{ borderColor: "var(--border-default)", background: "var(--surface-02)" }}>
                  <ReadOnlyGrid grid={challenge.grid} cellSize={28} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Meta label="Challenge #" value={String(challenge.number)} />
                  <Meta label="Difficulty" value={challenge.difficulty} />
                  <Meta label="Size" value={`${challenge.size}×${challenge.size}`} />
                  <Meta label="Puzzle hash" value={challenge.hash} />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border p-5" style={{ borderColor: "var(--border-default)", background: "var(--surface-02)" }}>
                <p className="text-sm text-[var(--text-muted)]">
                  No daily challenge is scheduled for tomorrow yet. Use the generate action to create one now.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[22px] border p-5" style={{ background: "var(--surface-01)", borderColor: "var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-[3px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
              Notes
            </p>
            <div className="mt-4 space-y-4 text-sm text-[var(--text-muted)]">
              <p>Generate Tomorrow is idempotent. If tomorrow is already scheduled, the existing challenge stays in place.</p>
              <p>Regenerate Tomorrow keeps the challenge number but swaps in a newly generated puzzle.</p>
              <p>The public daily experience is unchanged. This page is only for protected admin preview and control.</p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{challenge ? "Preview loaded" : "Nothing scheduled yet"}</span>
              <span>{isFetching ? "Refreshing..." : "Ready"}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border p-3" style={{ borderColor: "var(--border-default)", background: "rgba(13, 17, 23, 0.46)" }}>
      <p className="mb-1 text-[10px] uppercase tracking-[2px]" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="truncate text-sm" style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
