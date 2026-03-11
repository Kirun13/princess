"use client";

import { useEffect, useState } from "react";

function getMsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function CountdownTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const ms = getMsUntilMidnightUTC();
      setRemaining(ms);
      if (ms <= 0) window.location.reload();
    };

    // Defer initial call to avoid synchronous setState in effect body
    const timeout = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(id);
    };
  }, []);

  if (remaining === null) return null;

  return (
    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
      <span>Next challenge in</span>
      <span
        className="font-bold tabular-nums text-[var(--text)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}
