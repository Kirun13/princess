"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";
import type { AchievementSummary } from "@/lib/achievements";

function formatTimeMs(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

interface SolvePayload {
  puzzleId: string;
  levelId?: string;
  dailyChallengeId?: string;
  queenPositions: [number, number][];
  activeTimeMs: number;
  startToken: string;
}

interface SolveResult {
  solveId: string;
  timeMs: number;
  isPersonalBest: boolean;
  rank?: number | null;
  totalSolvers: number;
  averageTimeMs: number | null;
  topTimeMs: number | null;
  beatAverage: boolean | null;
  unlockedAchievements: AchievementSummary[];
}

interface LevelCompleteModalProps {
  puzzleId: string;
  levelId?: string;
  dailyChallengeId?: string;
  nextLevelId?: string | null;
  isAuthenticated: boolean;
  userRating: number | null;
  avgRating: number;
  ratingCount: number;
}

interface UserRatingWidgetProps {
  levelId?: string;
  dailyChallengeId?: string;
  initialRating: number | null;
  avgRating: number;
  ratingCount: number;
  isAuthenticated: boolean;
}

const STAR_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
  4: "Expert",
  5: "Expert",
};

function UserRatingWidget({
  levelId,
  dailyChallengeId,
  initialRating,
  avgRating,
  ratingCount,
  isAuthenticated,
}: UserRatingWidgetProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(initialRating);

  const ratingMutation = useMutation<{ rating: number }, Error, number>({
    mutationFn: async (rating) => {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId, dailyChallengeId, rating }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(typeof err.error === "string" ? err.error : "Rating failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSelected(data.rating);
    },
  });

  const active = hovered ?? selected;

  if (!isAuthenticated) {
    return (
      <div className="text-center">
        <p className="text-xs mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}>
          Rate difficulty
        </p>
        <a
          href="/auth/sign-in"
          className="text-xs font-medium"
          style={{ color: "var(--brand-light)", fontFamily: "var(--font-mono), monospace" }}
        >
          Sign in to rate →
        </a>
        {ratingCount > 0 && (
          <p className="text-xs mt-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}>
            ★ {avgRating.toFixed(1)} · {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="text-center">
      <p
        className="text-xs mb-0.5 uppercase tracking-[1px]"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}
      >
        Rate difficulty
      </p>
      <p
        className="text-xs mb-2"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}
      >
        1 = Easy · 5 = Expert
      </p>
      <div className="flex gap-1 justify-center mb-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={ratingMutation.isPending}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => ratingMutation.mutate(star)}
            className="text-3xl leading-none transition-transform duration-100 hover:scale-125 disabled:cursor-not-allowed"
            style={{
              color: active !== null && star <= active ? "#F59E0B" : "#2A2A3A",
              filter:
                active !== null && star <= active
                  ? "drop-shadow(0 0 6px rgba(245,158,11,0.5))"
                  : "none",
              background: "none",
              border: "none",
              padding: "2px",
              cursor: ratingMutation.isPending ? "not-allowed" : "pointer",
            }}
            aria-label={`Rate ${star} — ${STAR_LABELS[star]}`}
          >
            ★
          </button>
        ))}
      </div>
      {ratingMutation.isSuccess && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs"
          style={{ color: "var(--brand-light)", fontFamily: "var(--font-mono), monospace" }}
        >
          Rated!
        </motion.p>
      )}
      {ratingMutation.isError && (
        <p className="text-xs" style={{ color: "var(--color-error)", fontFamily: "var(--font-mono), monospace" }}>
          {ratingMutation.error.message}
        </p>
      )}
      {ratingCount > 0 && (
        <p className="text-xs mt-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}>
          ★ {avgRating.toFixed(1)} · {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
        </p>
      )}
    </div>
  );
}

export function LevelCompleteModal({
  puzzleId,
  levelId,
  dailyChallengeId,
  nextLevelId,
  isAuthenticated,
  userRating,
  avgRating,
  ratingCount,
}: LevelCompleteModalProps) {
  const isSolved = useGameStore((s) => s.isSolved);
  const queens = useGameStore((s) => s.queens);
  const getActiveMs = useGameStore((s) => s.getActiveMs);
  const startToken = useGameStore((s) => s.startToken);
  const restart = useGameStore((s) => s.restart);
  const router = useRouter();

  const submittedRef = useRef(false);
  const payloadRef = useRef<SolvePayload | null>(null);

  const mutation = useMutation<SolveResult, Error, SolvePayload>({
    mutationFn: async (payload) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const res = await fetch("/api/solves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(
            typeof err.error === "string" ? err.error : "Submission failed"
          );
        }
        return res.json() as Promise<SolveResult>;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("Request timed out — please retry");
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    },
  });
  const backHref = dailyChallengeId ? "/daily" : "/levels";
  const showSolveSummary = mutation.isPending || mutation.isError || mutation.isSuccess;

  useEffect(() => {
    if (!isSolved) {
      // Reset for next solve attempt
      submittedRef.current = false;
      payloadRef.current = null;
      return;
    }
    if (!isAuthenticated || !startToken || submittedRef.current) return;

    submittedRef.current = true;
    const payload: SolvePayload = {
      puzzleId,
      ...(levelId ? { levelId } : {}),
      ...(dailyChallengeId ? { dailyChallengeId } : {}),
      queenPositions: queens as [number, number][],
      activeTimeMs: getActiveMs(),
      startToken,
    };
    payloadRef.current = payload;
    mutation.mutate(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolved]);

  const activeMs = getActiveMs();
  const comparison = mutation.data
    ? getComparisonCopy({
        currentTimeMs: activeMs,
        averageTimeMs: mutation.data.averageTimeMs,
        topTimeMs: mutation.data.topTimeMs,
      })
    : null;

  return (
    <Dialog.Root open={isSolved}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-3xl overflow-hidden rounded-[20px]"
            style={{
              maxHeight: "calc(100vh - 2rem)",
              background: "var(--surface-01)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--glow-xl)",
            }}
          >
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
              {/* Top accent bar — brand-success gradient */}
              <div
                className="w-full h-1"
                style={{ background: "var(--gradient-brand-success)" }}
              />

              <div className="p-6 sm:p-8">
                <Dialog.Title
                  className="text-2xl font-black text-center"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    color: "var(--text-primary)",
                  }}
                >
                  Puzzle Solved!
                </Dialog.Title>

                <div
                  data-testid="level-complete-layout"
                  className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
                >
                  <div data-testid="level-complete-summary" className="min-w-0 space-y-4">
                    <div
                      className="rounded-[12px] p-4 sm:p-5"
                      style={{
                        background: "var(--surface-02)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <span
                          className="text-xs uppercase tracking-[2px]"
                          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                        >
                          Your Time
                        </span>
                        <span
                          className="text-2xl font-bold leading-none"
                          style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                        >
                          {formatTimeMs(activeMs)}
                        </span>
                      </div>
                    </div>

                    {isAuthenticated && showSolveSummary && (
                      <div className="space-y-4">
                        {mutation.isPending && (
                          <div className="flex gap-2 items-center justify-center lg:justify-start rounded-[12px] p-4"
                            style={{
                              background: "var(--surface-02)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <div
                              className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin"
                              style={{ borderColor: "var(--brand)" }}
                            />
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                              Saving your time…
                            </span>
                          </div>
                        )}

                        {mutation.isSuccess && (
                          <div className="space-y-4">
                            <div className="text-center lg:text-left">
                              {dailyChallengeId ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
                                  className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-2"
                                  style={{
                                    background: "var(--gradient-brand-success)",
                                    color: "white",
                                    fontFamily: "var(--font-mono), monospace",
                                  }}
                                >
                                  Daily time recorded
                                </motion.div>
                              ) : mutation.data.isPersonalBest && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
                                  className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-2"
                                  style={{
                                    background: "var(--gradient-brand-success)",
                                    color: "white",
                                    fontFamily: "var(--font-mono), monospace",
                                  }}
                                >
                                  🏆 Personal Best!
                                </motion.div>
                              )}
                              {mutation.data.rank != null && (
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                  You rank{" "}
                                  <span
                                    className="font-bold"
                                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}
                                  >
                                    #{mutation.data.rank}
                                  </span>{" "}
                                  on this board
                                </p>
                              )}
                            </div>

                            <div
                              className="grid grid-cols-2 gap-3"
                              style={{ fontFamily: "var(--font-mono), monospace" }}
                            >
                              <SolveStat
                                label="Field"
                                value={mutation.data.totalSolvers > 0 ? `${mutation.data.totalSolvers} runs` : "—"}
                              />
                              <SolveStat
                                label="Top Time"
                                value={mutation.data.topTimeMs ? formatTimeMs(mutation.data.topTimeMs) : "—"}
                              />
                              <SolveStat
                                label="Average"
                                value={mutation.data.averageTimeMs ? formatTimeMs(mutation.data.averageTimeMs) : "—"}
                              />
                              <SolveStat
                                label="Your Edge"
                                value={comparison?.deltaLabel ?? "First run"}
                              />
                            </div>

                            {comparison?.summary && (
                              <p className="text-sm text-center lg:text-left" style={{ color: "var(--text-muted)" }}>
                                {comparison.summary}
                              </p>
                            )}

                            {mutation.data.unlockedAchievements.length > 0 && (
                              <div
                                className="rounded-[12px] p-4"
                                style={{
                                  background: "rgba(124, 58, 237, 0.08)",
                                  border: "1px solid rgba(124, 58, 237, 0.22)",
                                }}
                              >
                                <p
                                  className="text-xs uppercase tracking-[2px] mb-3 text-center lg:text-left"
                                  style={{ color: "var(--brand-light)", fontFamily: "var(--font-mono), monospace" }}
                                >
                                  Unlocked Achievements
                                </p>
                                <div className="space-y-2">
                                  {mutation.data.unlockedAchievements.map((achievement) => (
                                    <div
                                      key={achievement.type}
                                      className="rounded-[10px] px-3 py-2"
                                      style={{
                                        background: "var(--surface-02)",
                                        border: "1px solid var(--border-subtle)",
                                      }}
                                    >
                                      <p
                                        className="text-sm font-semibold"
                                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace" }}
                                      >
                                        {achievement.title}
                                      </p>
                                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        {achievement.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {mutation.isError && (
                          <div
                            className="rounded-[12px] p-4 text-center lg:text-left"
                            style={{
                              background: "var(--surface-02)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <p className="text-xs mb-2" style={{ color: "var(--color-error)" }}>
                              {mutation.error.message}
                            </p>
                            <button
                              onClick={() => {
                                if (payloadRef.current) {
                                  mutation.mutate(payloadRef.current);
                                }
                              }}
                              className="text-xs font-medium"
                              style={{ color: "var(--brand-light)", fontFamily: "var(--font-mono), monospace" }}
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div data-testid="level-complete-actions" className="min-w-0 space-y-4">
                    {!isAuthenticated && (
                      <div
                        className="rounded-[12px] p-4 text-center"
                        style={{
                          background: "var(--surface-02)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                          Sign in to save your time and see rankings.
                        </p>
                        <a
                          href="/auth/sign-in"
                          className="text-sm font-medium"
                          style={{ color: "var(--brand-light)", fontFamily: "var(--font-mono), monospace" }}
                        >
                          Sign in →
                        </a>
                      </div>
                    )}

                    {/* User rating — shown once solve is saved (or immediately for guests) */}
                    {(mutation.isSuccess || !isAuthenticated) && (
                      <div
                        className="rounded-[12px] p-4"
                        style={{
                          background: "var(--surface-02)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <UserRatingWidget
                          levelId={levelId}
                          dailyChallengeId={dailyChallengeId}
                          initialRating={userRating}
                          avgRating={avgRating}
                          ratingCount={ratingCount}
                          isAuthenticated={isAuthenticated}
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3">
                      {mutation.isSuccess && (
                        <button
                          onClick={() => router.push(`/share/${mutation.data.solveId}`)}
                          className="w-full py-3 rounded-[8px] text-sm font-bold transition-all duration-150"
                          style={{
                            fontFamily: "var(--font-mono), monospace",
                            border: "1px solid rgba(124, 58, 237, 0.25)",
                            background: "rgba(124, 58, 237, 0.08)",
                            color: "var(--brand-light)",
                          }}
                        >
                          Share Result ↗
                        </button>
                      )}
                      {nextLevelId ? (
                        <button
                          onClick={() => router.push(`/play/${nextLevelId}`)}
                          className="w-full py-3 rounded-[8px] text-sm font-bold text-white transition-all duration-150"
                          style={{
                            fontFamily: "var(--font-mono), monospace",
                            background: "var(--gradient-brand)",
                            boxShadow: "var(--glow-lg)",
                          }}
                        >
                          Next Level →
                        </button>
                      ) : dailyChallengeId ? (
                        <button
                          onClick={() => router.push("/daily/leaderboard")}
                          className="w-full py-3 rounded-[8px] text-sm font-bold text-white transition-all duration-150"
                          style={{
                            fontFamily: "var(--font-mono), monospace",
                            background: "var(--gradient-brand)",
                            boxShadow: "var(--glow-lg)",
                          }}
                        >
                          View Daily Leaderboard
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(backHref)}
                          className="w-full py-3 rounded-[8px] text-sm font-bold text-white transition-all duration-150"
                          style={{
                            fontFamily: "var(--font-mono), monospace",
                            background: "var(--gradient-brand)",
                            boxShadow: "var(--glow-lg)",
                          }}
                        >
                          Back to Levels
                        </button>
                      )}
                      <button
                        onClick={() => router.push(backHref)}
                        className="w-full py-3 rounded-[8px] text-sm font-bold transition-all duration-150"
                        style={{
                          fontFamily: "var(--font-mono), monospace",
                          border: "1px solid var(--border-default)",
                          background: "transparent",
                          color: "var(--text-primary)",
                        }}
                      >
                        ← Go Back
                      </button>
                      <button
                        onClick={() => {
                          mutation.reset();
                          submittedRef.current = false;
                          restart();
                        }}
                        className="w-full py-3 rounded-[8px] text-sm font-bold transition-all duration-150"
                        style={{
                          fontFamily: "var(--font-mono), monospace",
                          border: "1px solid var(--border-default)",
                          background: "transparent",
                          color: "var(--text-primary)",
                        }}
                      >
                        ↺ Play Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SolveStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="h-full rounded-[10px] px-3 py-3"
      style={{ background: "var(--surface-02)", border: "1px solid var(--border-subtle)" }}
    >
      <p className="text-[10px] uppercase tracking-[2px] mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        className="text-sm font-semibold leading-6"
        style={{ color: "var(--text-primary)", overflowWrap: "anywhere" }}
      >
        {value}
      </p>
    </div>
  );
}

function getComparisonCopy(input: {
  currentTimeMs: number;
  averageTimeMs: number | null;
  topTimeMs: number | null;
}) {
  if (!input.averageTimeMs) {
    return {
      deltaLabel: "First run",
      summary: null,
    };
  }

  const averageDelta = Math.abs(input.currentTimeMs - input.averageTimeMs);
  const againstAverage =
    input.currentTimeMs <= input.averageTimeMs
      ? `${formatTimeMs(averageDelta)} faster`
      : `${formatTimeMs(averageDelta)} off average`;

  let summary =
    input.currentTimeMs <= input.averageTimeMs
      ? "You finished ahead of the current average pace."
      : "You finished behind the current average pace. One more run could move you up fast.";

  if (input.topTimeMs && input.currentTimeMs === input.topTimeMs) {
    summary = "That is the current best time on this board.";
  }

  return {
    deltaLabel: againstAverage,
    summary,
  };
}
