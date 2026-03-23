// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pixiApps: { stage: { children: unknown[] } }[] = [];

vi.mock("pixi.js", () => {
  class MockContainer {
    children: MockContainer[] = [];
    alpha = 1;
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };

    addChild(...children: MockContainer[]) {
      this.children.push(...children);
      return children[0];
    }

    removeChildren() {
      const removed = [...this.children];
      this.children = [];
      return removed;
    }

    destroy() {}
  }

  class MockGraphics extends MockContainer {
    roundRect() { return this; }
    rect() { return this; }
    fill() { return this; }
    stroke() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
  }

  class MockText extends MockContainer {
    constructor(public options: unknown) {
      super();
    }
  }

  class MockApplication {
    stage = new MockContainer();
    renderer = { resize: vi.fn() };
    canvas = document.createElement("canvas");

    constructor() {
      pixiApps.push(this);
    }

    async init() {}
    destroy() {}
  }

  return {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
    Text: MockText,
  };
});

vi.mock("pixi.js/unsafe-eval", () => ({}));

import GameBoard from "@/components/game/GameBoard";
import { useGameStore } from "@/lib/store/gameStore";

describe("GameBoard", () => {
  beforeEach(() => {
    pixiApps.length = 0;
    useGameStore.setState({
      grid: null,
      size: 0,
      puzzleId: null,
      board: null,
      validation: null,
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
  });

  it("loads the puzzle into the store and mounts a pixi canvas", async () => {
    render(
      <GameBoard
        grid={[
          [0, 1],
          [1, 0],
        ]}
        puzzleId="puzzle-1"
        startToken="token-1"
        highlightConflicts
      />,
    );

    await waitFor(() => expect(useGameStore.getState().puzzleId).toBe("puzzle-1"));
    await waitFor(() => expect(document.querySelector("canvas")).toBeInTheDocument());

    expect(screen.getByTestId("game-board")).toHaveAttribute("data-board-size", "2");
  });

  it("draws the initial board scene without waiting for user interaction", async () => {
    render(
      <GameBoard
        grid={[
          [0, 1],
          [1, 0],
        ]}
        puzzleId="puzzle-1"
        startToken="token-1"
        highlightConflicts
      />,
    );

    await waitFor(() => expect(pixiApps).toHaveLength(1));
    await waitFor(() => expect(pixiApps[0].stage.children.length).toBeGreaterThan(0));
  });

  it("keeps keyboard placement working through the pixi board wrapper", async () => {
    render(
      <GameBoard
        grid={[
          [0],
        ]}
        puzzleId="puzzle-1"
        startToken="token-1"
        highlightConflicts
      />,
    );

    const board = await screen.findByTestId("game-board");
    board.focus();
    fireEvent.keyDown(board, { key: "Enter" });

    await waitFor(() => expect(useGameStore.getState().queens).toEqual([[0, 0]]));
  });
});
