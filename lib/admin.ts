import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type AdminSessionResult =
  | { ok: true; user: { id: string; username: string; role: "ADMIN" } }
  | { ok: false; response: NextResponse };

export async function requireAdminPageUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true },
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}

export async function requireAdminApiUser(): Promise<AdminSessionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: "ADMIN",
    },
  };
}
