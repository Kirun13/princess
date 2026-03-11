"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Design system region colors
const REGION_COLORS = [
  "#E74C3C", // Red
  "#1ABC9C", // Teal
  "#F1C40F", // Gold
  "#2ECC71", // Green
  "#9B59B6", // Purple
  "#3498DB", // Blue
  "#E67E22", // Orange
  "#E91E8C", // Pink
  "#7C3AED", // Brand purple
  "#22C55E", // Success green
];

function useIsLightTheme() {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsLight(document.documentElement.dataset.theme === "light");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return isLight;
}

type GameCellProps = {
  row: number;
  col: number;
  regionId: number;
  hasQueen: boolean;
  hasMark: boolean;
  isConflict: boolean;
  isSolved: boolean;
  cellPx: number | null;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onRemove: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
};

export default function GameCell({
  row,
  col,
  regionId,
  hasQueen,
  hasMark,
  isConflict,
  isSolved,
  cellPx,
  onClick,
  onMouseDown,
  onMouseEnter,
  onRemove,
  onKeyDown,
}: GameCellProps) {
  const isLight = useIsLightTheme();
  const color = REGION_COLORS[regionId % REGION_COLORS.length];

  // Use higher opacity in light theme so colors aren't washed out on white bg
  const bgOpacity = isLight ? "55" : "66";
  const borderOpacity = isLight ? "DD" : "CC";

  const bgColor = isConflict ? "#EF444430" : color + bgOpacity;
  const borderColor = isConflict ? "#EF444480" : hasQueen ? color : color + borderOpacity;
  const borderWidth = hasQueen && !isConflict ? "2px" : "1px";
  const boxShadow =
    hasQueen && !isConflict
      ? `0 0 14px ${color}60, inset 0 0 0 1px ${color}`
      : undefined;

  return (
    <motion.div
      id={`cell-${row}-${col}`}
      role="gridcell"
      tabIndex={0}
      aria-label={`Row ${row + 1}, Column ${col + 1}, region ${regionId + 1}, ${
        hasQueen ? "queen placed" : hasMark ? "marked" : "empty"
      }${isConflict ? ", conflict" : ""}`}
      animate={isConflict ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).focus();
        onMouseDown(e);
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).focus();
        onMouseEnter();
      }}
      onContextMenu={(e) => { e.preventDefault(); onRemove(); }}
      onKeyDown={onKeyDown}
      className={[
        "relative flex items-center justify-center",
        // cellPx overrides these when provided (computed for mobile)
        cellPx ? "" : "w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] md:w-[90px] md:h-[90px]",
        "rounded-[6px] cursor-pointer select-none",
        "transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
        isSolved ? "cursor-default" : !isConflict ? "hover:brightness-110" : "",
      ].join(" ")}
      style={{
        backgroundColor: bgColor,
        border: `${borderWidth} solid ${borderColor}`,
        boxShadow,
        ...(cellPx ? { width: cellPx, height: cellPx } : {}),
      }}
    >
      <AnimatePresence>
        {hasQueen && (
          <motion.span
            key="queen"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="text-xl sm:text-2xl md:text-3xl leading-none pointer-events-none"
            style={{
              color: isConflict ? "#ef9090" : color,
              filter: isConflict ? "none" : `drop-shadow(0 0 6px ${color})`,
            }}
          >
            ♛
          </motion.span>
        )}
        {hasMark && !hasQueen && (
          <motion.span
            key="mark"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="text-base sm:text-lg md:text-2xl leading-none pointer-events-none font-bold"
            style={{ color: color + "99" }}
          >
            ×
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

