import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin";
import { listAdminLevels, parseAdminLevelFilters } from "@/lib/admin-levels";

export async function GET(req: NextRequest) {
  const admin = await requireAdminApiUser();
  if (!admin.ok) {
    return admin.response;
  }

  let filters;
  try {
    filters = parseAdminLevelFilters(new URL(req.url).searchParams);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid filters" },
      { status: 400 }
    );
  }

  const levels = await listAdminLevels(filters);

  return NextResponse.json({ levels });
}
