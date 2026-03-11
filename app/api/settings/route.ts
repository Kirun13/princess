import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const SettingsSchema = z.object({
  soundEffects: z.boolean().optional(),
  confirmReset: z.boolean().optional(),
  highlightConflicts: z.boolean().optional(),
  showTimer: z.boolean().optional(),
  theme: z.enum(["dark", "light", "auto"]).optional(),
  uiFont: z.string().min(1).max(100).optional(),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await db.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json(settings);
}
