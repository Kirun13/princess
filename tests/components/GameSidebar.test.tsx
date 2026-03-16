// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameSidebar } from "@/components/game/GameSidebar";
import { useGameStore } from "@/lib/store/gameStore";

vi.mock("@/components/game/HowToPlayModal", () => ({
  HowToPlayModal: () => null,
}));

function loadPuzzle() {
  useGameStore
    .getState()
    .loadPuzzle(
      [
        [0, 1],
        [1, 0],
      ],
      "puzzle-1",
      "token-1"
    );
}

describe("GameSidebar", () => {
  beforeEach(() => {
    useGameStore.setState({
      grid: null,
      size: 0,
      puzzleId: null,
      queens: [],
      conflicts: new Set(),
      marks: new Set<string>(),
      startedAt: null,
      activeMs: 0,
      isPaused: false,
      pausedAt: null,
      isSolved: false,
      startToken: null,
      isHowToPlayOpen: false,
    });
    loadPuzzle();
  });

  it("toggles pause and resume", async () => {
    const user = userEvent.setup();
    render(<GameSidebar size={2} />);

    await user.click(screen.getByRole("button", { name: /pause/i }));
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /resume/i }));
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
  });

  it("requires confirmation before reset when enabled", async () => {
    const user = userEvent.setup();
    useGameStore.getState().placeQueen(0, 0);
    render(<GameSidebar size={2} confirmReset />);

    expect(useGameStore.getState().queens).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(useGameStore.getState().queens).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /confirm/i }));
    expect(useGameStore.getState().queens).toHaveLength(0);
  });
});

