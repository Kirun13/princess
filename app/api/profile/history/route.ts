import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const [solves, total] = await Promise.all([
    db.solve.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: "desc" },
      skip,
      take: limit,
      include: {
        level: { select: { name: true, number: true } },
        dailyChallenge: { select: { number: true, date: true } },
      },
    }),
    db.solve.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    solves: solves.map((s) => ({
      timeMs: s.timeMs,
      completedAt: s.completedAt,
      level: s.level ? { name: s.level.name, number: s.level.number } : null,
      daily: s.dailyChallenge
        ? { number: s.dailyChallenge.number, date: s.dailyChallenge.date }
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
