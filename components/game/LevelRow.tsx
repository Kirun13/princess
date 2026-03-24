import Link from "next/link";
import { formatTime } from "@/lib/format";
import type { LevelWithSolve } from "./LevelCard";

const DIFFICULTY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  easy:   { color: "#22C55E", bg: "#22C55E20", border: "#22C55E50" },
  medium: { color: "#F59E0B", bg: "#F59E0B15", border: "#F59E0B40" },
  hard:   { color: "#EF4444", bg: "#EF444415", border: "#EF444440" },
  expert: { color: "#A855F7", bg: "#A855F720", border: "#A855F760" },
};

type Props = { level: LevelWithSolve };

export default function LevelRow({ level }: Props) {
  const badge = DIFFICULTY_STYLES[level.difficulty] ?? {
    color: "#8B5CF6",
    bg: "#7C3AED20",
    border: "#7C3AED50",
  };

  return (
    <Link
      href={`/play/${level.id}`}
      className="group flex items-center gap-3 px-4 py-2.5 transition-colors duration-100"
      style={{
        borderLeft: level.solve ? "2px solid #22C55E" : "2px solid transparent",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--surface-01)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Level number */}
      <span
        className="text-xs w-10 flex-shrink-0 tabular-nums"
        style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
      >
        #{String(level.number).padStart(3, "0")}
      </span>

      {/* Name */}
      <span
        className="text-sm font-semibold flex-1 truncate transition-colors duration-100 group-hover:text-white"
        style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
      >
        {level.name}
      </span>

      {/* Difficulty badge */}
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full border capitalize flex-shrink-0 hidden sm:inline-block"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: badge.color,
          background: badge.bg,
          borderColor: badge.border,
          fontSize: "10px",
        }}
      >
        {level.difficulty}
      </span>

      {/* Size */}
      <span
        className="text-xs flex-shrink-0 w-10 text-right hidden md:block"
        style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
      >
        {level.size}×{level.size}
      </span>

      {/* Rating */}
      <span
        className="text-xs flex-shrink-0 w-14 text-right hidden lg:block tabular-nums"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: level.ratingCount > 0 ? "#F59E0B" : "var(--text-muted)",
        }}
      >
        {level.ratingCount > 0 ? `★${level.avgRating.toFixed(1)}` : "—"}
      </span>

      {/* Solve status */}
      <span
        className="text-xs flex-shrink-0 w-20 text-right tabular-nums font-bold"
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: level.solve ? "#22C55E" : "var(--text-muted)",
        }}
      >
        {level.solve ? `✓ ${formatTime(level.solve.timeMs)}` : "—"}
      </span>
    </Link>
  );
}
