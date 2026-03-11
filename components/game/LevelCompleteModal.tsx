"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";

const PAR_MS: Record<string, number> = {
  easy: 60_000,
  medium: 120_000,
  hard: 240_000,
  expert: 480_000,
};

function getStars(difficulty: string, activeMs: number): 1 | 2 | 3 {
  const par = PAR_MS[difficulty] ?? 120_000;
  if (activeMs <= par / 2) return 3;
  if (activeMs <= par) return 2;
  return 1;
}

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
  timeMs: number;
  isPersonalBest: boolean;
  rank?: number | null;
}

interface LevelCompleteModalProps {
  puzzleId: string;
  levelId?: string;
  dailyChallengeId?: string;
  nextLevelId?: string | null;
  difficulty: string;
  isAuthenticated: boolean;
  userRating: number | null;
}

function StarRating({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-2 justify-center">
      {([1, 2, 3] as const).map((star) => (
        <motion.span
          key={star}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: star * 0.15,
            type: "spring",
            stiffness: 400,
            damping: 15,
          }}
          className="text-5xl leading-none"
          style={{
            color: star <= stars ? "#F59E0B" : "#2A2A3A",
            filter:
              star <= stars
                ? "drop-shadow(0 0 8px rgba(245,158,11,0.6))"
                : "none",
          }}
        >
          ★
        </motion.span>
      ))}
    </div>
  );
}

interface UserRatingWidgetProps {
  levelId?: string;
  dailyChallengeId?: string;
  initialRating: number | null;
  isAuthenticated: boolean;
}

function UserRatingWidget({
  levelId,
  dailyChallengeId,
  initialRating,
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
        <p className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
          Rate this puzzle
        </p>
        <a
          href="/auth/sign-in"
          className="text-xs font-medium"
          style={{ color: "var(--brand-light)", fontFamily: "var(--font-mono), monospace" }}
        >
          Sign in to rate →
        </a>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p
        className="text-xs mb-2 uppercase tracking-[1px]"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}
      >
        Rate this puzzle
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
            aria-label={`Rate ${star} out of 5`}
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
    </div>
  );
}

export function LevelCompleteModal({
  puzzleId,
  levelId,
  dailyChallengeId,
  nextLevelId,
  difficulty,
  isAuthenticated,
  userRating,
}: LevelCompleteModalProps) {
  const isSolved = useGameStore((s) => s.isSolved);
  const queens = useGameStore((s) => s.queens);
  const getActiveMs = useGameStore((s) => s.getActiveMs);
  const startToken = useGameStore((s) => s.startToken);
  const reset = useGameStore((s) => s.reset);
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
  const stars = isSolved ? getStars(difficulty, activeMs) : 1;

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
            className="w-full max-w-sm overflow-hidden rounded-[20px]"
            style={{
              background: "var(--surface-01)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--glow-xl)",
            }}
          >
            {/* Top accent bar — brand-success gradient */}
            <div
              className="w-full h-1"
              style={{ background: "var(--gradient-brand-success)" }}
            />

            <div className="p-8">
              <Dialog.Title
                className="text-2xl font-black text-center mb-1"
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--text-primary)",
                }}
              >
                Puzzle Solved!
              </Dialog.Title>
              <p
                className="text-sm text-center mb-6 font-mono"
                style={{ color: "var(--brand-light)", fontFamily: "var(--font-mono), monospace" }}
              >
                {formatTimeMs(activeMs)}
              </p>

              <div className="mb-6">
                <StarRating stars={stars} />
              </div>

              {/* Time stats bar */}
              <div
                className="rounded-[12px] p-4 mb-6 flex items-center justify-between"
                style={{
                  background: "var(--surface-02)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span
                  className="text-xs uppercase tracking-[2px]"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                >
                  Your Time
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                >
                  {formatTimeMs(activeMs)}
                </span>
              </div>

              {/* Solve result area */}
              {isAuthenticated && (
                <div className="mb-6 min-h-[3rem] flex items-center justify-center">
                  {mutation.isPending && (
                    <div className="flex gap-2 items-center">
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
                    <div className="text-center">
                      {mutation.data.isPersonalBest && (
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
                          on this level
                        </p>
                      )}
                    </div>
                  )}

                  {mutation.isError && (
                    <div className="text-center">
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

              {!isAuthenticated && (
                <div className="mb-6 text-center">
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
                  className="rounded-[12px] p-4 mb-6"
                  style={{
                    background: "var(--surface-02)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <UserRatingWidget
                    levelId={levelId}
                    dailyChallengeId={dailyChallengeId}
                    initialRating={userRating}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
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
                    onClick={() => router.push("/leaderboard")}
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
                    onClick={() => router.push("/levels")}
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
                  onClick={() => {
                    mutation.reset();
                    submittedRef.current = false;
                    reset();
                  }}
                  className="w-full py-3 rounded-[8px] text-sm font-bold transition-all duration-150"
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    border: "1px solid var(--border-default)",
                    background: "transparent",
                    color: "var(--text-muted)",
                  }}
                >
                  ↺ Play Again
                </button>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
