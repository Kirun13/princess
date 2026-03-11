import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

function formatTimeMs(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const solveId = searchParams.get("solveId");

  if (!solveId) {
    return new Response("Missing solveId", { status: 400 });
  }

  const solve = await db.solve.findUnique({
    where: { id: solveId },
    include: {
      user: { select: { username: true, image: true } },
      level: { select: { name: true, number: true } },
      dailyChallenge: { select: { number: true } },
    },
  });

  if (!solve) {
    return new Response("Not found", { status: 404 });
  }

  const challengeName = solve.level
    ? `Level ${solve.level.number}: ${solve.level.name}`
    : solve.dailyChallenge
    ? `Daily Challenge #${solve.dailyChallenge.number}`
    : "Princess Puzzle";

  const initial = solve.user.username[0]?.toUpperCase() ?? "?";

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 539,
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Corner accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 40, color: "#7c3aed" }}>♛</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "white",
              letterSpacing: -0.5,
            }}
          >
            Princess
          </span>
        </div>

        {/* Challenge name */}
        <div
          style={{
            fontSize: 18,
            color: "#888888",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          {challengeName}
        </div>

        {/* Time */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "white",
            marginBottom: 20,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          {formatTimeMs(solve.timeMs)}
        </div>

        {/* CTA */}
        <div
          style={{
            fontSize: 20,
            color: "#7c3aed",
            fontWeight: 700,
            marginBottom: 48,
            letterSpacing: 0.5,
          }}
        >
          Can you beat me?
        </div>

        {/* User row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {solve.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={solve.user.image}
              width={52}
              height={52}
              style={{ borderRadius: 26, border: "2px solid rgba(124,58,237,0.6)" }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                background: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color: "white",
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          )}
          <span style={{ fontSize: 20, color: "#cccccc" }}>
            @{solve.user.username}
          </span>
        </div>
      </div>
    ),
    { width: 600, height: 539 }
  );
}
