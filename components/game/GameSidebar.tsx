"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/lib/store/gameStore";
import { HowToPlayModal } from "@/components/game/HowToPlayModal";

interface GameSidebarProps {
  size: number;
  confirmReset?: boolean;
  showTimer?: boolean;
  onRequestHint?: () => void;
  hintMessage?: string | null;
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function GameSidebar({
  size,
  confirmReset = false,
  showTimer = true,
  onRequestHint,
  hintMessage,
}: GameSidebarProps) {
  const isPaused = useGameStore((s) => s.isPaused);
  const isSolved = useGameStore((s) => s.isSolved);
  const queens = useGameStore((s) => s.queens);
  const isHowToPlayOpen = useGameStore((s) => s.isHowToPlayOpen);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const reset = useGameStore((s) => s.reset);
  const getActiveMs = useGameStore((s) => s.getActiveMs);
  const openHowToPlay = useGameStore((s) => s.openHowToPlay);
  const closeHowToPlay = useGameStore((s) => s.closeHowToPlay);

  const [displayMs, setDisplayMs] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (isPaused || isSolved) return;
    const id = setInterval(() => setDisplayMs(getActiveMs()), 1000);
    return () => clearInterval(id);
  }, [isPaused, isSolved, getActiveMs]);

  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  function handleReset() {
    if (confirmReset && !confirming) {
      setConfirming(true);
    } else {
      reset();
      setConfirming(false);
    }
  }

  const queensCount = queens.length;
  const mono = { fontFamily: "var(--font-mono), monospace" };
  const ui = { fontFamily: "var(--app-ui-font), Inter, system-ui, sans-serif" };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Back to Levels */}
      <Link
        href="/levels"
        className="flex items-center gap-1.5 py-2 px-3 rounded-[8px] text-xs transition-colors"
        style={{ ...mono, color: "white", border: "1px solid var(--border-subtle)" }}
      >
        ← Back to Levels
      </Link>

      {/* Timer + Queens */}
      <div className="flex gap-2">
        {showTimer && (
          <div
            className="flex-1 rounded-[10px] p-3 text-center"
            style={{ background: "var(--surface-01)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[10px] uppercase tracking-[2px] mb-1" style={{ ...mono, color: "var(--text-muted)" }}>
              Time
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ ...mono, color: "var(--text-primary)" }}>
              {isSolved ? formatTime(getActiveMs()) : formatTime(displayMs)}
            </p>
            {isPaused && !isSolved && (
              <p className="text-[10px] mt-0.5" style={{ ...mono, color: "var(--color-warning)" }}>Paused</p>
            )}
          </div>
        )}
        <div
          className="flex-1 rounded-[10px] p-3 text-center"
          style={{ background: "var(--surface-01)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-[10px] uppercase tracking-[2px] mb-1" style={{ ...mono, color: "var(--text-muted)" }}>
            Queens
          </p>
          <p className="text-lg font-bold" style={mono}>
            <span style={{ color: queensCount === size ? "var(--color-success)" : "var(--brand-light)" }}>
              {queensCount}
            </span>
            <span style={{ color: "var(--text-muted)" }}> / {size}</span>
          </p>
        </div>
      </div>

      {hintMessage && (
        <div
          className="rounded-[10px] p-3"
          style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.28)" }}
        >
          <p className="text-[11px] uppercase tracking-[2px] mb-1" style={{ ...mono, color: "#FCD34D" }}>
            Hint
          </p>
          <p className="text-sm leading-relaxed" style={{ ...ui, color: "var(--text-primary)" }}>
            {hintMessage}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isSolved && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={isPaused ? resume : pause}
              className="flex-1 py-2 rounded-[8px] text-xs font-bold transition-all duration-150"
              style={{
                ...mono,
                background: isPaused ? "var(--gradient-brand)" : "transparent",
                border: isPaused ? "none" : "1px solid var(--border-default)",
                color: "var(--text-primary)",
                boxShadow: isPaused ? "var(--glow-sm)" : undefined,
              }}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>

            {confirming ? (
              <>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 rounded-[8px] text-xs font-bold text-white"
                  style={{ ...mono, background: "var(--color-error)" }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2 rounded-[8px] text-xs font-bold"
                  style={{ ...mono, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-[8px] text-xs font-bold transition-all duration-150"
                style={{ ...mono, border: "1px solid var(--border-default)", background: "transparent", color: "white" }}
              >
                ↺ Reset
              </button>
            )}
          </div>

          <button
            onClick={openHowToPlay}
            className="w-full py-2 rounded-[8px] text-xs font-bold transition-all duration-150"
            style={{ ...mono, border: "1px solid var(--border-subtle)", background: "transparent", color: "white" }}
          >
            ? How to Play
          </button>
          {onRequestHint && (
            <button
              onClick={onRequestHint}
              className="w-full py-2 rounded-[8px] text-xs font-bold transition-all duration-150"
              style={{
                ...mono,
                border: "1px solid rgba(245, 158, 11, 0.28)",
                background: "rgba(245, 158, 11, 0.08)",
                color: "#FCD34D",
              }}
            >
              ✦ Hint
            </button>
          )}
        </div>
      )}

      <HowToPlayModal open={isHowToPlayOpen} onClose={closeHowToPlay} />
    </div>
  );
}
