"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store/gameStore";

type Grid = number[][];
type CellCoord = [number, number];
type ToggleAction = "mark" | "empty";
type PixiModule = typeof import("pixi.js");
type PixiApplication = import("pixi.js").Application;

type GameBoardProps = {
  grid: Grid;
  puzzleId: string;
  startToken: string | null;
  highlightConflicts: boolean;
  hintCell?: [number, number] | null;
};

type DragState = {
  active: boolean;
  pointerId: number | null;
  action: ToggleAction | null;
  startCell: CellCoord | null;
  visited: Set<string>;
  hasDragged: boolean;
};

type PendingClick = {
  timerId: number | null;
  cell: CellCoord | null;
};

type KeyboardPaintState = {
  isSpaceHeld: boolean;
  action: ToggleAction | null;
  startCell: CellCoord | null;
  visited: Set<string>;
};

type BoardTheme = {
  shell: number;
  board: number;
  frame: number;
  gridLine: number;
  regionBorder: number;
  queen: number;
  mark: number;
  focus: number;
  hint: number;
  conflict: number;
  regionColors: number[];
};

const REGION_FALLBACKS = [
  "#E74C3C",
  "#1ABC9C",
  "#F1C40F",
  "#2ECC71",
  "#9B59B6",
  "#3498DB",
  "#E67E22",
  "#E91E8C",
  "#7C3AED",
  "#22C55E",
];

function cellKey([row, col]: CellCoord): string {
  return `${row},${col}`;
}

function sameCell(left: CellCoord | null, right: CellCoord | null): boolean {
  return Boolean(left && right && left[0] === right[0] && left[1] === right[1]);
}

function getBoardPixels(size: number): number {
  if (typeof window === "undefined") {
    return Math.max(320, size * 56);
  }

  const compact = window.innerWidth < 768;
  const availableWidth = compact ? window.innerWidth - 32 : Math.min(620, window.innerWidth * 0.52);
  const availableHeight = compact ? window.innerHeight - 320 : window.innerHeight - 260;
  const minCell = compact ? 32 : 54;
  const maxCell = compact ? 56 : 88;
  const cellSize = Math.max(
    minCell,
    Math.min(maxCell, Math.floor(Math.min(availableWidth, Math.max(availableHeight, minCell * size)) / size)),
  );

  return cellSize * size + 12;
}

function parseHexColor(raw: string | null | undefined, fallback: string): number {
  const value = (raw ?? "").trim() || fallback;
  return Number.parseInt(value.replace("#", ""), 16);
}

function blendColor(base: number, accent: number, ratio: number): number {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const baseRed = (base >> 16) & 0xff;
  const baseGreen = (base >> 8) & 0xff;
  const baseBlue = base & 0xff;
  const accentRed = (accent >> 16) & 0xff;
  const accentGreen = (accent >> 8) & 0xff;
  const accentBlue = accent & 0xff;

  const red = Math.round(baseRed + (accentRed - baseRed) * clampedRatio);
  const green = Math.round(baseGreen + (accentGreen - baseGreen) * clampedRatio);
  const blue = Math.round(baseBlue + (accentBlue - baseBlue) * clampedRatio);

  return (red << 16) | (green << 8) | blue;
}

function resolveBoardTheme(): BoardTheme {
  const styles = getComputedStyle(document.documentElement);
  const isLight = document.documentElement.dataset.theme === "light";
  const board = parseHexColor(styles.getPropertyValue("--board-surface"), "#121116");
  const regionMixRatio = isLight ? 0.22 : 0.27;
  const rawRegionColors = REGION_FALLBACKS.map((fallback, index) =>
    parseHexColor(
      styles.getPropertyValue(`--region-${["red", "teal", "gold", "green", "purple", "blue", "orange", "pink"][index]}`),
      fallback,
    ),
  );

  return {
    shell: parseHexColor(styles.getPropertyValue("--board-shell"), "#19171D"),
    board,
    frame: parseHexColor(styles.getPropertyValue("--board-frame"), "#4F4856"),
    gridLine: parseHexColor(styles.getPropertyValue("--board-grid"), "#2D2833"),
    regionBorder: parseHexColor(styles.getPropertyValue("--board-region-border"), "#817888"),
    queen: parseHexColor(styles.getPropertyValue("--board-queen"), "#F3E7D1"),
    mark: parseHexColor(styles.getPropertyValue("--board-mark"), "#938A9B"),
    focus: parseHexColor(styles.getPropertyValue("--board-focus"), "#EEE8F4"),
    hint: parseHexColor(styles.getPropertyValue("--board-hint"), "#E0A64A"),
    conflict: parseHexColor(styles.getPropertyValue("--board-conflict"), "#D77468"),
    regionColors: rawRegionColors.map((color) => blendColor(board, color, regionMixRatio)),
  };
}

function getCellFromPoint(element: HTMLElement, size: number, clientX: number, clientY: number): CellCoord | null {
  const rect = element.getBoundingClientRect();
  if (
    clientX < rect.left ||
    clientY < rect.top ||
    clientX > rect.right ||
    clientY > rect.bottom
  ) {
    return null;
  }

  const col = Math.min(size - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * size)));
  const row = Math.min(size - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * size)));
  return [row, col];
}

function toggleResult(row: number, col: number, queens: [number, number][], marks: Set<string>): ToggleAction {
  const hasQueen = queens.some(([queenRow, queenCol]) => queenRow === row && queenCol === col);
  return hasQueen || marks.has(`${row},${col}`) ? "empty" : "mark";
}

function dragActionForCell(cell: CellCoord, queens: [number, number][], marks: Set<string>): ToggleAction | null {
  const [row, col] = cell;
  const hasQueen = queens.some(([queenRow, queenCol]) => queenRow === row && queenCol === col);
  if (hasQueen) {
    return null;
  }

  return toggleResult(row, col, queens, marks);
}

function destroyChildren(app: PixiApplication) {
  const removed = app.stage.removeChildren();
  removed.forEach((child) => child.destroy({ children: true }));
}

function drawBoardScene(input: {
  app: PixiApplication;
  pixi: PixiModule;
  grid: Grid;
  queens: [number, number][];
  marks: Set<string>;
  conflicts: Set<string>;
  highlightConflicts: boolean;
  hintCell: CellCoord | null;
  hoveredCell: CellCoord | null;
  pressedCell: CellCoord | null;
  boardPixels: number;
}) {
  const { app, pixi, grid, queens, marks, conflicts, highlightConflicts, hintCell, hoveredCell, pressedCell, boardPixels } = input;

  const theme = resolveBoardTheme();
  const size = grid.length;
  const isLight = document.documentElement.dataset.theme === "light";
  const frameInset = 8;
  const boardSize = boardPixels - frameInset * 2;
  const cellSize = boardSize / size;
  const queenSet = new Set(queens.map((queen) => cellKey(queen)));

  app.renderer.resize(boardPixels, boardPixels);
  destroyChildren(app);

  const root = new pixi.Container();
  app.stage.addChild(root);

  const panel = new pixi.Graphics()
    .roundRect(0, 0, boardPixels, boardPixels, 16)
    .fill({ color: theme.shell })
    .stroke({ color: theme.frame, alpha: 0.62, width: 1.25 });

  const boardSurface = new pixi.Graphics()
    .roundRect(frameInset, frameInset, boardSize, boardSize, 12)
    .fill({ color: theme.board })
    .stroke({ color: theme.frame, alpha: isLight ? 0.36 : 0.28, width: 1 });

  const regionLayer = new pixi.Graphics();
  const overlayLayer = new pixi.Graphics();
  const gridLayer = new pixi.Graphics();
  const borderLayer = new pixi.Graphics();
  const symbolLayer = new pixi.Container();

  root.addChild(panel, boardSurface, regionLayer, overlayLayer, gridLayer, borderLayer, symbolLayer);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const x = frameInset + col * cellSize;
      const y = frameInset + row * cellSize;
      const regionColor = theme.regionColors[grid[row][col] % theme.regionColors.length];
      const key = `${row},${col}`;
      const isConflict = highlightConflicts && conflicts.has(key);
      const isHinted = hintCell?.[0] === row && hintCell?.[1] === col;
      const isHovered = hoveredCell?.[0] === row && hoveredCell?.[1] === col;
      const isPressed = pressedCell?.[0] === row && pressedCell?.[1] === col;

      regionLayer
        .rect(x, y, cellSize, cellSize)
        .fill({ color: regionColor, alpha: 1 });

      if (isHovered) {
        overlayLayer
          .rect(x, y, cellSize, cellSize)
          .fill({ color: theme.focus, alpha: isLight ? 0.08 : 0.09 });
        overlayLayer
          .roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 6)
          .stroke({ color: theme.focus, alpha: 0.5, width: 1.5 });
      }

      if (isPressed) {
        overlayLayer
          .rect(x, y, cellSize, cellSize)
          .fill({ color: theme.focus, alpha: isLight ? 0.11 : 0.13 });
        overlayLayer
          .roundRect(x + 2.5, y + 2.5, cellSize - 5, cellSize - 5, 6)
          .stroke({ color: theme.focus, alpha: 0.72, width: 1.8 });
      }

      if (isHinted) {
        overlayLayer
          .rect(x, y, cellSize, cellSize)
          .fill({ color: theme.hint, alpha: isLight ? 0.05 : 0.07 });
        overlayLayer
          .roundRect(x + 5, y + 5, cellSize - 10, cellSize - 10, 6)
          .stroke({ color: theme.hint, alpha: 0.95, width: 2.25 });
      }

      if (isConflict) {
        overlayLayer
          .rect(x, y, cellSize, cellSize)
          .fill({ color: theme.conflict, alpha: isLight ? 0.12 : 0.15 });
        overlayLayer
          .roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 6)
          .stroke({ color: theme.conflict, alpha: 0.7, width: 1.9 });
      }

      if (queenSet.has(key)) {
        const queen = new pixi.Text({
          text: "♛",
          style: {
            fill: isConflict ? theme.conflict : theme.queen,
            fontFamily: "Georgia",
            fontSize: Math.max(22, Math.floor(cellSize * 0.54)),
            fontWeight: "700",
            stroke: { color: theme.board, width: Math.max(1, Math.floor(cellSize * 0.03)) },
          },
        });
        queen.anchor.set(0.5);
        queen.position.set(x + cellSize * 0.5, y + cellSize * 0.5);
        symbolLayer.addChild(queen);
      } else if (marks.has(key)) {
        const mark = new pixi.Text({
          text: "×",
          style: {
            fill: isHinted ? theme.hint : theme.mark,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: Math.max(18, Math.floor(cellSize * 0.42)),
            fontWeight: "700",
          },
        });
        mark.anchor.set(0.5);
        mark.alpha = isHinted ? 1 : 0.84;
        mark.position.set(x + cellSize * 0.5, y + cellSize * 0.52);
        symbolLayer.addChild(mark);
      }
    }
  }

  for (let index = 0; index <= size; index += 1) {
    const offset = frameInset + index * cellSize;
    gridLayer.moveTo(frameInset, offset).lineTo(frameInset + boardSize, offset);
    gridLayer.moveTo(offset, frameInset).lineTo(offset, frameInset + boardSize);
  }
  gridLayer.stroke({ color: theme.gridLine, width: 1, alpha: isLight ? 0.58 : 0.52, pixelLine: true });

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const regionId = grid[row][col];
      const x = frameInset + col * cellSize;
      const y = frameInset + row * cellSize;

      if (row === 0 || grid[row - 1][col] !== regionId) {
        borderLayer.moveTo(x, y).lineTo(x + cellSize, y);
      }
      if (col === 0 || grid[row][col - 1] !== regionId) {
        borderLayer.moveTo(x, y).lineTo(x, y + cellSize);
      }
      if (row === size - 1 || grid[row + 1][col] !== regionId) {
        borderLayer.moveTo(x, y + cellSize).lineTo(x + cellSize, y + cellSize);
      }
      if (col === size - 1 || grid[row][col + 1] !== regionId) {
        borderLayer.moveTo(x + cellSize, y).lineTo(x + cellSize, y + cellSize);
      }
    }
  }
  borderLayer.stroke({
    color: theme.regionBorder,
    width: Math.max(2, cellSize * 0.085),
    alpha: isLight ? 0.94 : 0.9,
    pixelLine: true,
  });
}

export default function GameBoard({
  grid,
  puzzleId,
  startToken,
  highlightConflicts,
  hintCell,
}: GameBoardProps) {
  const loadPuzzle = useGameStore((state) => state.loadPuzzle);
  const queens = useGameStore((state) => state.queens);
  const marks = useGameStore((state) => state.marks);
  const conflicts = useGameStore((state) => state.conflicts);
  const isSolved = useGameStore((state) => state.isSolved);
  const isPaused = useGameStore((state) => state.isPaused);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pixiAppRef = useRef<PixiApplication | null>(null);
  const pixiModuleRef = useRef<PixiModule | null>(null);
  const pendingClickRef = useRef<PendingClick>({ timerId: null, cell: null });
  const dragRef = useRef<DragState>({
    active: false,
    pointerId: null,
    action: null,
    startCell: null,
    visited: new Set<string>(),
    hasDragged: false,
  });
  const keyboardPaintRef = useRef<KeyboardPaintState>({
    isSpaceHeld: false,
    action: null,
    startCell: null,
    visited: new Set<string>(),
  });

  const [hoveredCell, setHoveredCell] = useState<CellCoord | null>(null);
  const [pressedCell, setPressedCell] = useState<CellCoord | null>(null);
  const [boardPixels, setBoardPixels] = useState(0);
  const [pixiReadyNonce, setPixiReadyNonce] = useState(0);
  const [themeNonce, setThemeNonce] = useState(0);
  const size = grid.length;

  const isInteractionLocked = isSolved || isPaused;

  const clearPendingClick = useCallback(() => {
    if (pendingClickRef.current.timerId !== null) {
      window.clearTimeout(pendingClickRef.current.timerId);
    }
    pendingClickRef.current = { timerId: null, cell: null };
  }, []);

  const applyPrimaryToggle = useCallback((cell: CellCoord) => {
    const [row, col] = cell;
    const state = useGameStore.getState();
    if (state.isSolved || state.isPaused) {
      return;
    }

    state.setCellState(row, col, toggleResult(row, col, state.queens, state.marks));
  }, []);

  const queuePrimaryTap = useCallback((cell: CellCoord) => {
    const pendingCell = pendingClickRef.current.cell;
    if (pendingClickRef.current.timerId !== null && pendingCell) {
      if (sameCell(pendingCell, cell)) {
        clearPendingClick();
        const [row, col] = cell;
        const state = useGameStore.getState();
        if (!state.isSolved && !state.isPaused) {
          state.setCellState(row, col, "queen");
        }
        return;
      }

      applyPrimaryToggle(pendingCell);
      clearPendingClick();
    }

    pendingClickRef.current = {
      cell,
      timerId: window.setTimeout(() => {
        if (pendingClickRef.current.cell) {
          applyPrimaryToggle(pendingClickRef.current.cell);
        }
        pendingClickRef.current = { timerId: null, cell: null };
      }, 220),
    };
  }, [applyPrimaryToggle, clearPendingClick]);

  const commitDragCell = useCallback((cell: CellCoord, action: ToggleAction) => {
    const state = useGameStore.getState();
    if (state.isSolved || state.isPaused) {
      return;
    }

    const [row, col] = cell;
    const key = `${row},${col}`;
    const hasQueen = state.queens.some(([queenRow, queenCol]) => queenRow === row && queenCol === col);
    if (hasQueen) {
      return;
    }

    state.setCellState(row, col, action === "mark" ? "mark" : "empty");
    dragRef.current.visited.add(key);
  }, []);

  const resetDrag = useCallback(() => {
    dragRef.current = {
      active: false,
      pointerId: null,
      action: null,
      startCell: null,
      visited: new Set<string>(),
      hasDragged: false,
    };
  }, []);

  const resetKeyboardPaint = useCallback(() => {
    keyboardPaintRef.current = {
      isSpaceHeld: false,
      action: null,
      startCell: null,
      visited: new Set<string>(),
    };
  }, []);

  useEffect(() => {
    loadPuzzle(grid, puzzleId, startToken ?? "");
    setHoveredCell(null);
    setPressedCell(null);
    clearPendingClick();
    resetDrag();
    resetKeyboardPaint();
  }, [clearPendingClick, grid, loadPuzzle, puzzleId, resetDrag, resetKeyboardPaint, startToken]);

  useEffect(() => {
    const compute = () => setBoardPixels(getBoardPixels(size));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [size]);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeNonce((current) => current + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style", "class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || boardPixels === 0) {
      return;
    }

    let disposed = false;
    const canvasNode = canvasRef.current;

    async function initPixi() {
      await import("pixi.js/unsafe-eval");
      const pixi = await import("pixi.js");
      if (disposed || !canvasNode) {
        return;
      }

      const app = new pixi.Application();
      await app.init({
        width: boardPixels,
        height: boardPixels,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      if (disposed || !canvasNode) {
        app.destroy(true, { children: true });
        return;
      }

      pixiModuleRef.current = pixi;
      pixiAppRef.current = app;
      app.canvas.setAttribute("aria-hidden", "true");
      app.canvas.style.display = "block";
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      canvasNode.replaceChildren(app.canvas);
      setPixiReadyNonce((current) => current + 1);
    }

    void initPixi();

    return () => {
      disposed = true;
      clearPendingClick();
      const app = pixiAppRef.current;
      pixiAppRef.current = null;
      pixiModuleRef.current = null;
      if (app) {
        destroyChildren(app);
        app.destroy(true, { children: true });
      }
      canvasNode.replaceChildren();
    };
  }, [boardPixels, clearPendingClick]);

  useEffect(() => {
    if (!pixiAppRef.current || !pixiModuleRef.current || boardPixels === 0) {
      return;
    }

    drawBoardScene({
      app: pixiAppRef.current,
      pixi: pixiModuleRef.current,
      grid,
      queens,
      marks,
      conflicts,
      highlightConflicts,
      hintCell: hintCell ?? null,
      hoveredCell,
      pressedCell,
      boardPixels,
    });
  }, [
    boardPixels,
    conflicts,
    grid,
    highlightConflicts,
    hoveredCell,
    hintCell,
    marks,
    pixiReadyNonce,
    pressedCell,
    queens,
    themeNonce,
  ]);

  useEffect(() => () => clearPendingClick(), [clearPendingClick]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " || event.repeat || isInteractionLocked || !hoveredCell || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      const state = useGameStore.getState();
      keyboardPaintRef.current = {
        isSpaceHeld: true,
        action: dragActionForCell(hoveredCell, state.queens, state.marks),
        startCell: hoveredCell,
        visited: new Set<string>(),
      };
      setPressedCell(hoveredCell);
      queuePrimaryTap(hoveredCell);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== " ") {
        return;
      }

      if (keyboardPaintRef.current.isSpaceHeld) {
        event.preventDefault();
      }

      resetKeyboardPaint();
      if (!dragRef.current.active) {
        setPressedCell(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [hoveredCell, isInteractionLocked, queuePrimaryTap, resetKeyboardPaint]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isInteractionLocked || !hostRef.current) {
      return;
    }

    const cell = getCellFromPoint(hostRef.current, size, event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    setHoveredCell(cell);
    setPressedCell(cell);
    const state = useGameStore.getState();
    const [row, col] = cell;
    const hasQueen = state.queens.some(([queenRow, queenCol]) => queenRow === row && queenCol === col);

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      action: hasQueen ? null : toggleResult(row, col, state.queens, state.marks),
      startCell: cell,
      visited: new Set<string>(),
      hasDragged: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }, [isInteractionLocked, size]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!hostRef.current) {
      return;
    }

    const cell = getCellFromPoint(hostRef.current, size, event.clientX, event.clientY);
    setHoveredCell(cell);

    if (keyboardPaintRef.current.isSpaceHeld) {
      if (!cell) {
        if (!dragRef.current.active) {
          setPressedCell(null);
        }
      } else {
        setPressedCell(cell);

        const { startCell, action, visited } = keyboardPaintRef.current;
        if (startCell && action && !sameCell(cell, startCell)) {
          clearPendingClick();

          const startKey = cellKey(startCell);
          if (!visited.has(startKey)) {
            commitDragCell(startCell, action);
            visited.add(startKey);
          }

          const currentKey = cellKey(cell);
          if (!visited.has(currentKey)) {
            commitDragCell(cell, action);
            visited.add(currentKey);
          }
        }
      }
    }

    if (
      !dragRef.current.active ||
      dragRef.current.pointerId !== event.pointerId ||
      !dragRef.current.startCell ||
      !dragRef.current.action
    ) {
      return;
    }

    if (!cell) {
      setPressedCell(null);
      return;
    }

    if (sameCell(cell, dragRef.current.startCell)) {
      return;
    }

    setPressedCell(cell);

    const startKey = cellKey(dragRef.current.startCell);
    if (!dragRef.current.visited.has(startKey)) {
      commitDragCell(dragRef.current.startCell, dragRef.current.action);
      dragRef.current.hasDragged = true;
    }

    const currentKey = cellKey(cell);
    if (dragRef.current.visited.has(currentKey)) {
      return;
    }

    commitDragCell(cell, dragRef.current.action);
    dragRef.current.hasDragged = true;
  }, [clearPendingClick, commitDragCell, size]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId || !hostRef.current) {
      return;
    }

    const fallbackCell = dragRef.current.startCell;
    const releasedCell = getCellFromPoint(hostRef.current, size, event.clientX, event.clientY);
    const cell = releasedCell ?? fallbackCell;

    if (!dragRef.current.hasDragged && cell && !isInteractionLocked) {
      queuePrimaryTap(cell);
    }

    setHoveredCell(releasedCell);
    setPressedCell(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetDrag();
  }, [isInteractionLocked, queuePrimaryTap, resetDrag, size]);

  return (
    <div className="flex flex-col items-center" style={{ width: boardPixels || undefined, maxWidth: "100%" }}>
      <div
        ref={hostRef}
        role="img"
        aria-label="Queens puzzle board"
        data-testid="game-board"
        data-board-size={size}
        className="relative rounded-[16px] transition-shadow duration-200"
        style={{
          width: boardPixels || undefined,
          height: boardPixels || undefined,
          boxShadow: isSolved
            ? "0 0 0 1px rgba(224, 166, 74, 0.42), 0 12px 28px rgba(0, 0, 0, 0.18)"
            : "0 1px 0 rgba(255, 255, 255, 0.03), 0 12px 28px rgba(0, 0, 0, 0.22)",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setHoveredCell(null)}
        onPointerCancel={() => {
          setHoveredCell(null);
          setPressedCell(null);
          resetDrag();
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          ref={canvasRef}
          className="h-full w-full overflow-hidden rounded-[16px]"
          style={{ background: "var(--board-shell)", border: "1px solid color-mix(in srgb, var(--board-frame) 65%, transparent)" }}
        />
      </div>
    </div>
  );
}
