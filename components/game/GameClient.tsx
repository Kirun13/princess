"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";
import GameBoard from "@/components/game/GameBoard";
import { GameSidebar } from "@/components/game/GameSidebar";
import { PauseModal } from "@/components/game/PauseModal";
import { LevelCompleteModal } from "@/components/game/LevelCompleteModal";
import type { Grid, Queens } from "@/lib/puzzle/validator";
import type { ResolvedUserSettings } from "@/lib/user-settings";

type GamePreferences = Pick<
  ResolvedUserSettings,
  "confirmReset" | "highlightConflicts" | "showTimer" | "soundEffects"
>;

interface GameClientProps {
  grid: Grid;
  puzzleId: string;
  startToken: string | null;
  levelId?: string;
  dailyChallengeId?: string;
  nextLevelId?: string | null;
  size: number;
  preferences: GamePreferences;
  isAuthenticated: boolean;
  userRating?: number | null;
  avgRating: number;
  ratingCount: number;
  solution?: Queens | null;
}

export function GameClient({
  grid,
  puzzleId,
  startToken,
  levelId,
  dailyChallengeId,
  nextLevelId,
  size,
  preferences,
  isAuthenticated,
  userRating,
  avgRating,
  ratingCount,
  solution,
}: GameClientProps) {
  const router = useRouter();
  const isPaused = useGameStore((s) => s.isPaused);
  const isSolved = useGameStore((s) => s.isSolved);
  const isHowToPlayOpen = useGameStore((s) => s.isHowToPlayOpen);
  const queens = useGameStore((s) => s.queens);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const reset = useGameStore((s) => s.reset);
  const closeHowToPlay = useGameStore((s) => s.closeHowToPlay);
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const previousQueensCount = useRef<number | null>(null);
  const previousSolved = useRef(false);

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
          if (!isHowToPlayOpen) {
            e.preventDefault();
            if (isPaused) {
              resume();
            } else {
              pause();
            }
          }
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

  useEffect(() => {
    if (!preferences.soundEffects) {
      previousQueensCount.current = queens.length;
      previousSolved.current = isSolved;
      return;
    }

    if (previousQueensCount.current !== null && previousQueensCount.current !== queens.length && !isSolved) {
      playMoveTone(queens.length > previousQueensCount.current);
    }

    if (isSolved && !previousSolved.current) {
      playSolveTone();
    }

    previousQueensCount.current = queens.length;
    previousSolved.current = isSolved;
  }, [isSolved, preferences.soundEffects, queens.length]);

  useEffect(() => {
    if (!hintCell) return;
    const hintedKey = `${hintCell[0]},${hintCell[1]}`;
    if (queens.some(([row, col]) => `${row},${col}` === hintedKey)) {
      setHintCell(null);
      setHintMessage(null);
    }
  }, [hintCell, queens]);

  useEffect(() => {
    if (!hintMessage) return;
    const timeoutId = window.setTimeout(() => setHintMessage(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [hintMessage]);

  function handleHintRequest() {
    if (!solution?.length) {
      setHintMessage("This puzzle does not have guided hints yet.");
      return;
    }

    const queenKeys = new Set(queens.map(([row, col]) => `${row},${col}`));
    const nextTarget = solution.find(([row, col]) => !queenKeys.has(`${row},${col}`));

    if (!nextTarget) {
      setHintCell(null);
      setHintMessage("Every queen you need is already in place. Check for conflicts to finish the board.");
      return;
    }

    const [row, col] = nextTarget;
    setHintCell([row, col]);
    setHintMessage(
      `Focus on row ${row + 1}. Its queen belongs in region ${grid[row][col] + 1}, highlighted on the board.`
    );
  }

  return (
    <div
      className="flex-1 flex flex-col md:flex-row items-start justify-center gap-6 md:gap-10 px-4 md:px-12"
      style={{ paddingTop: "40px", paddingBottom: "40px", background: "var(--bg-void)" }}
    >
      {/* Sidebar — left */}
      <aside className="w-full md:w-52 md:shrink-0">
        <GameSidebar
          size={size}
          confirmReset={preferences.confirmReset}
          showTimer={preferences.showTimer}
          onRequestHint={handleHintRequest}
          hintMessage={hintMessage}
        />
      </aside>

      {/* Board area — blurred when paused */}
      <div
        className={`flex justify-center transition-[filter] duration-200 ${
          isPaused ? "blur-sm pointer-events-none select-none" : ""
        }`}
      >
        <GameBoard
          grid={grid}
          puzzleId={puzzleId}
          startToken={startToken}
          highlightConflicts={preferences.highlightConflicts}
          hintCell={hintCell}
        />
      </div>

      {/* Modals */}
      <PauseModal />
      <LevelCompleteModal
        puzzleId={puzzleId}
        levelId={levelId}
        dailyChallengeId={dailyChallengeId}
        nextLevelId={nextLevelId}
        isAuthenticated={isAuthenticated}
        userRating={userRating ?? null}
        avgRating={avgRating}
        ratingCount={ratingCount}
      />
    </div>
  );
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) audioContext = new AudioContextCtor();
  void audioContext.resume().catch(() => {});
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType, gainValue: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playMoveTone(isPlacement: boolean) {
  playTone(isPlacement ? 740 : 520, 0.08, "triangle", 0.03);
}

function playSolveTone() {
  playTone(523.25, 0.09, "triangle", 0.025);
  window.setTimeout(() => playTone(659.25, 0.11, "triangle", 0.025), 90);
  window.setTimeout(() => playTone(783.99, 0.18, "sine", 0.03), 180);
}
