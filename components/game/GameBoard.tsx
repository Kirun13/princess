"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type BoardTheme = {
  board: number;
  frame: number;
  gridLine: number;
  text: number;
  textMuted: number;
  success: number;
  warning: number;
  error: number;
  regionAlpha: number;
  regionBorderAlpha: number;
  boardGlowAlpha: number;
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

function resolveBoardTheme(): BoardTheme {
  const styles = getComputedStyle(document.documentElement);
  const isLight = document.documentElement.dataset.theme === "light";

  return {
    board: parseHexColor(styles.getPropertyValue("--surface-01"), "#141420"),
    frame: parseHexColor(styles.getPropertyValue("--border-default"), "#2A2A3A"),
    gridLine: parseHexColor(styles.getPropertyValue("--border-subtle"), "#1E1E2E"),
    text: parseHexColor(styles.getPropertyValue("--text-primary"), "#F0F0FF"),
    textMuted: parseHexColor(styles.getPropertyValue("--text-muted"), "#4A4A6A"),
    success: parseHexColor(styles.getPropertyValue("--color-success"), "#22C55E"),
    warning: parseHexColor(styles.getPropertyValue("--color-warning"), "#F59E0B"),
    error: parseHexColor(styles.getPropertyValue("--color-error"), "#EF4444"),
    regionAlpha: isLight ? 0.34 : 0.28,
    regionBorderAlpha: isLight ? 0.7 : 0.56,
    boardGlowAlpha: isLight ? 0.1 : 0.18,
    regionColors: REGION_FALLBACKS.map((fallback, index) =>
      parseHexColor(styles.getPropertyValue(`--region-${["red", "teal", "gold", "green", "purple", "blue", "orange", "pink"][index]}`), fallback),
    ),
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
  focusedCell: CellCoord;
  boardPixels: number;
  isSolved: boolean;
}) {
  const { app, pixi, grid, queens, marks, conflicts, highlightConflicts, hintCell, focusedCell, boardPixels, isSolved } =
    input;

  const theme = resolveBoardTheme();
  const size = grid.length;
  const frameInset = 6;
  const boardSize = boardPixels - frameInset * 2;
  const cellSize = boardSize / size;
  const queenSet = new Set(queens.map((queen) => cellKey(queen)));

  app.renderer.resize(boardPixels, boardPixels);
  destroyChildren(app);

  const root = new pixi.Container();
  app.stage.addChild(root);

  const panel = new pixi.Graphics()
    .roundRect(0, 0, boardPixels, boardPixels, 14)
    .fill({ color: theme.board })
    .stroke({ color: theme.frame, width: 1.5 });

  const glow = new pixi.Graphics()
    .roundRect(1, 1, boardPixels - 2, boardPixels - 2, 14)
    .stroke({ color: theme.warning, alpha: isSolved ? 0.28 : theme.boardGlowAlpha, width: 1 });

  const regionLayer = new pixi.Graphics();
  const overlayLayer = new pixi.Graphics();
  const gridLayer = new pixi.Graphics();
  const borderLayer = new pixi.Graphics();
  const symbolLayer = new pixi.Container();

  root.addChild(panel, glow, regionLayer, overlayLayer, gridLayer, borderLayer, symbolLayer);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const x = frameInset + col * cellSize;
      const y = frameInset + row * cellSize;
      const regionColor = theme.regionColors[grid[row][col] % theme.regionColors.length];
      const key = `${row},${col}`;
      const isConflict = highlightConflicts && conflicts.has(key);
      const isHinted = hintCell?.[0] === row && hintCell?.[1] === col;
      const isFocused = focusedCell[0] === row && focusedCell[1] === col;

      regionLayer
        .rect(x, y, cellSize, cellSize)
        .fill({ color: regionColor, alpha: theme.regionAlpha });

      if (isFocused) {
        overlayLayer
          .roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 8)
          .stroke({ color: theme.text, alpha: 0.9, width: 2 });
      }

      if (isHinted) {
        overlayLayer
          .roundRect(x + 6, y + 6, cellSize - 12, cellSize - 12, 7)
          .stroke({ color: theme.warning, alpha: 0.95, width: 2.5 });
      }

      if (isConflict) {
        overlayLayer
          .roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 8)
          .fill({ color: theme.error, alpha: 0.16 })
          .stroke({ color: theme.error, alpha: 0.52, width: 2 });
      }

      if (queenSet.has(key)) {
        const queen = new pixi.Text({
          text: "♛",
          style: {
            fill: isConflict ? theme.error : isSolved ? theme.success : regionColor,
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
            fill: isHinted ? theme.warning : regionColor,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: Math.max(18, Math.floor(cellSize * 0.42)),
            fontWeight: "700",
          },
        });
        mark.anchor.set(0.5);
        mark.alpha = isHinted ? 1 : 0.72;
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
  gridLayer.stroke({ color: theme.gridLine, width: 1, alpha: 0.9, pixelLine: true });

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
  borderLayer.stroke({ color: theme.textMuted, width: Math.max(1.5, cellSize * 0.06), alpha: theme.regionBorderAlpha });
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
  const spaceActionRef = useRef<ToggleAction | null>(null);

  const [focusedCell, setFocusedCell] = useState<CellCoord>([0, 0]);
  const [boardPixels, setBoardPixels] = useState(0);
  const [pixiReadyNonce, setPixiReadyNonce] = useState(0);
  const [themeNonce, setThemeNonce] = useState(0);
  const size = grid.length;

  const focusStatus = useMemo(() => {
    const [row, col] = focusedCell;
    const key = `${row},${col}`;
    const state = queens.some(([queenRow, queenCol]) => queenRow === row && queenCol === col)
      ? "queen placed"
      : marks.has(key)
        ? "marked"
        : "empty";

    return `Row ${row + 1}, column ${col + 1}, region ${grid[row][col] + 1}, ${state}`;
  }, [focusedCell, grid, marks, queens]);

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

  useEffect(() => {
    loadPuzzle(grid, puzzleId, startToken ?? "");
    setFocusedCell([0, 0]);
    clearPendingClick();
    resetDrag();
  }, [clearPendingClick, grid, loadPuzzle, puzzleId, resetDrag, startToken]);

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
      focusedCell,
      boardPixels,
      isSolved,
    });
  }, [
    boardPixels,
    conflicts,
    focusedCell,
    grid,
    highlightConflicts,
    hintCell,
    isSolved,
    marks,
    pixiReadyNonce,
    queens,
    themeNonce,
  ]);

  useEffect(() => () => clearPendingClick(), [clearPendingClick]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isInteractionLocked || !hostRef.current) {
      return;
    }

    const cell = getCellFromPoint(hostRef.current, size, event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    hostRef.current.focus();
    setFocusedCell(cell);
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
    if (
      !dragRef.current.active ||
      dragRef.current.pointerId !== event.pointerId ||
      !dragRef.current.startCell ||
      !dragRef.current.action ||
      !hostRef.current
    ) {
      return;
    }

    const cell = getCellFromPoint(hostRef.current, size, event.clientX, event.clientY);
    if (!cell || sameCell(cell, dragRef.current.startCell)) {
      return;
    }

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
    setFocusedCell(cell);
  }, [commitDragCell, size]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId || !hostRef.current) {
      return;
    }

    const fallbackCell = dragRef.current.startCell;
    const cell = getCellFromPoint(hostRef.current, size, event.clientX, event.clientY) ?? fallbackCell;

    if (!dragRef.current.hasDragged && cell && !isInteractionLocked) {
      queuePrimaryTap(cell);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetDrag();
  }, [isInteractionLocked, queuePrimaryTap, resetDrag, size]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isInteractionLocked || !hostRef.current) {
      return;
    }

    const cell = getCellFromPoint(hostRef.current, size, event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    const [row, col] = cell;
    useGameStore.getState().removeCell(row, col);
    setFocusedCell(cell);
  }, [isInteractionLocked, size]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractionLocked) {
      return;
    }

    const applySpaceActionToCell = (cell: CellCoord) => {
      if (!spaceActionRef.current) {
        return;
      }

      const [row, col] = cell;
      useGameStore.getState().setCellState(row, col, spaceActionRef.current === "mark" ? "mark" : "empty");
    };

    switch (event.key) {
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight": {
        event.preventDefault();
        const [row, col] = focusedCell;
        const nextCell: CellCoord =
          event.key === "ArrowUp"
            ? [Math.max(0, row - 1), col]
            : event.key === "ArrowDown"
              ? [Math.min(size - 1, row + 1), col]
              : event.key === "ArrowLeft"
                ? [row, Math.max(0, col - 1)]
                : [row, Math.min(size - 1, col + 1)];
        setFocusedCell(nextCell);
        applySpaceActionToCell(nextCell);
        break;
      }
      case " ": {
        event.preventDefault();
        if (!event.repeat) {
          const [row, col] = focusedCell;
          const state = useGameStore.getState();
          const action = toggleResult(row, col, state.queens, state.marks);
          state.setCellState(row, col, action);
          spaceActionRef.current = action;
        }
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (!event.repeat) {
          const [row, col] = focusedCell;
          useGameStore.getState().setCellState(row, col, "queen");
        }
        break;
      }
    }
  }, [focusedCell, isInteractionLocked, size]);

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      spaceActionRef.current = null;
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={hostRef}
        role="grid"
        aria-label="Queens puzzle board"
        aria-readonly={isInteractionLocked}
        aria-describedby="board-status"
        data-testid="game-board"
        data-board-size={size}
        tabIndex={0}
        className="relative rounded-[12px] outline-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-white/30"
        style={{
          width: boardPixels || undefined,
          height: boardPixels || undefined,
          boxShadow: isSolved ? "0 0 0 1px rgba(34,197,94,0.4), 0 0 32px rgba(34,197,94,0.18)" : "var(--glow-md)",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      >
        <div
          ref={canvasRef}
          className="h-full w-full overflow-hidden rounded-[12px]"
          style={{ background: "var(--surface-01)", border: "1px solid var(--border-default)" }}
        />
      </div>
      <p id="board-status" className="sr-only">
        {focusStatus}
      </p>
    </div>
  );
}
