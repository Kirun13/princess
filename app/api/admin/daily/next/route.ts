import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin";
import { serializeTomorrowDailyChallenge } from "@/lib/daily-challenge";

export async function GET() {
  const admin = await requireAdminApiUser();
  if (!admin.ok) {
    return admin.response;
  }

  const preview = await serializeTomorrowDailyChallenge();
  return NextResponse.json(preview);
}
