"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";
import GameBoard from "@/components/game/GameBoard";
import { GameSidebar } from "@/components/game/GameSidebar";
import { PauseModal } from "@/components/game/PauseModal";
import { LevelCompleteModal } from "@/components/game/LevelCompleteModal";
import type { Grid } from "@/lib/puzzle/validator";

interface GameClientProps {
  grid: Grid;
  puzzleId: string;
  startToken: string | null;
  levelId?: string;
  dailyChallengeId?: string;
  nextLevelId?: string | null;
  size: number;
  difficulty: string;
  confirmReset?: boolean;
  isAuthenticated: boolean;
  userRating?: number | null;
}

export function GameClient({
  grid,
  puzzleId,
  startToken,
  levelId,
  dailyChallengeId,
  nextLevelId,
  size,
  difficulty,
  confirmReset,
  isAuthenticated,
  userRating,
}: GameClientProps) {
  const router = useRouter();
  const isPaused = useGameStore((s) => s.isPaused);
  const isSolved = useGameStore((s) => s.isSolved);
  const isHowToPlayOpen = useGameStore((s) => s.isHowToPlayOpen);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const reset = useGameStore((s) => s.reset);
  const closeHowToPlay = useGameStore((s) => s.closeHowToPlay);

  // Global keyboard shortcuts — Esc priority: HTP > pause > back to levels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "r":
        case "R":
          if (!isSolved && !isPaused && !isHowToPlayOpen) { e.preventDefault(); reset(); }
          break;
        case "p":
        case "P":
          if (!isHowToPlayOpen) { e.preventDefault(); isPaused ? resume() : pause(); }
          break;
        case "Escape":
          e.preventDefault();
          if (isHowToPlayOpen) closeHowToPlay();
          else if (isPaused) resume();
          else router.push("/levels");
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSolved, isPaused, isHowToPlayOpen, pause, resume, reset, closeHowToPlay, router]);

  return (
    <div
      className="flex-1 flex flex-col md:flex-row items-start justify-center gap-6 md:gap-10 px-4 md:px-12"
      style={{ paddingTop: "40px", paddingBottom: "40px", background: "var(--bg-void)" }}
    >
      {/* Sidebar — left */}
      <aside className="w-full md:w-52 md:shrink-0">
        <GameSidebar size={size} confirmReset={confirmReset} />
      </aside>

      {/* Board area — blurred when paused */}
      <div
        className={`flex justify-center transition-[filter] duration-200 ${
          isPaused ? "blur-sm pointer-events-none select-none" : ""
        }`}
      >
        <GameBoard grid={grid} puzzleId={puzzleId} startToken={startToken} />
      </div>

      {/* Modals */}
      <PauseModal />
      <LevelCompleteModal
        puzzleId={puzzleId}
        levelId={levelId}
        dailyChallengeId={dailyChallengeId}
        nextLevelId={nextLevelId}
        difficulty={difficulty}
        isAuthenticated={isAuthenticated}
        userRating={userRating ?? null}
      />
    </div>
  );
}
