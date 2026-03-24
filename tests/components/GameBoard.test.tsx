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

  it("prevents native drag behavior on the board surface", async () => {
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

    const board = await screen.findByTestId("game-board");
    const canvas = await waitFor(() => {
      const node = document.querySelector("canvas");
      expect(node).toBeInstanceOf(HTMLCanvasElement);
      return node as HTMLCanvasElement;
    });

    const dragStartEvent = new Event("dragstart", { bubbles: true, cancelable: true });
    canvas.dispatchEvent(dragStartEvent);

    expect(board).toHaveAttribute("draggable", "false");
    expect(canvas.draggable).toBe(false);
    expect(dragStartEvent.defaultPrevented).toBe(true);
  });

  it("renders the board without legacy focus helper copy", async () => {
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

    await screen.findByTestId("game-board");

    expect(screen.queryByLabelText("Board controls")).not.toBeInTheDocument();
    expect(screen.queryByText("Double-click")).not.toBeInTheDocument();
    expect(document.querySelector("#board-status")).toBeNull();
  });

  it("toggles the hovered cell with Space without requiring board focus", async () => {
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

    const board = await screen.findByTestId("game-board");
    Object.defineProperties(board, {
      getBoundingClientRect: {
        value: () => ({
          left: 0,
          top: 0,
          right: 100,
          bottom: 100,
          width: 100,
          height: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }),
      },
      setPointerCapture: { value: vi.fn() },
      releasePointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => true) },
    });

    fireEvent.pointerDown(board, {
      button: 0,
      clientX: 25,
      clientY: 25,
      pointerId: 1,
    });
    fireEvent.pointerUp(board, {
      button: 0,
      clientX: 25,
      clientY: 25,
      pointerId: 1,
    });
    await waitFor(() => expect(useGameStore.getState().marks.has("0,0")).toBe(true));

    fireEvent.pointerMove(board, {
      clientX: 75,
      clientY: 25,
      pointerId: 1,
    });
    fireEvent.keyDown(window, { key: " " });

    await waitFor(() => expect(useGameStore.getState().marks.has("0,1")).toBe(true));
  });

  it("places a queen when Space is pressed twice quickly on the hovered cell", async () => {
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

    const board = await screen.findByTestId("game-board");
    Object.defineProperties(board, {
      getBoundingClientRect: {
        value: () => ({
          left: 0,
          top: 0,
          right: 100,
          bottom: 100,
          width: 100,
          height: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }),
      },
      setPointerCapture: { value: vi.fn() },
      releasePointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => true) },
    });

    fireEvent.pointerMove(board, {
      clientX: 75,
      clientY: 25,
      pointerId: 1,
    });
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: " " });

    await waitFor(() => expect(useGameStore.getState().queens).toEqual([[0, 1]]));
    expect(useGameStore.getState().marks.has("0,1")).toBe(false);
  });

  it("paints marks while Space is held and the pointer moves across cells", async () => {
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

    const board = await screen.findByTestId("game-board");
    Object.defineProperties(board, {
      getBoundingClientRect: {
        value: () => ({
          left: 0,
          top: 0,
          right: 100,
          bottom: 100,
          width: 100,
          height: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }),
      },
      setPointerCapture: { value: vi.fn() },
      releasePointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => true) },
    });

    fireEvent.pointerMove(board, {
      clientX: 25,
      clientY: 25,
      pointerId: 1,
    });
    fireEvent.keyDown(window, { key: " " });
    fireEvent.pointerMove(board, {
      clientX: 75,
      clientY: 25,
      pointerId: 1,
    });
    fireEvent.keyUp(window, { key: " " });

    await waitFor(() => expect(useGameStore.getState().marks.has("0,0")).toBe(true));
    expect(useGameStore.getState().marks.has("0,1")).toBe(true);
  });

  it("ignores right-click so it no longer clears a cell", async () => {
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

    const board = await screen.findByTestId("game-board");
    Object.defineProperties(board, {
      getBoundingClientRect: {
        value: () => ({
          left: 0,
          top: 0,
          right: 100,
          bottom: 100,
          width: 100,
          height: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }),
      },
      setPointerCapture: { value: vi.fn() },
      releasePointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => true) },
    });

    fireEvent.pointerDown(board, {
      button: 0,
      clientX: 25,
      clientY: 25,
      pointerId: 1,
    });
    fireEvent.pointerUp(board, {
      button: 0,
      clientX: 25,
      clientY: 25,
      pointerId: 1,
    });

    await waitFor(() => expect(useGameStore.getState().marks.has("0,0")).toBe(true));

    fireEvent.contextMenu(board, {
      clientX: 25,
      clientY: 25,
    });

    expect(useGameStore.getState().marks.has("0,0")).toBe(true);
  });
});
