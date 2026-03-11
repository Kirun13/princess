"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import crypto from "crypto";

const VERIFY_PREFIX = "verify:";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

let verifyRatelimit: Ratelimit | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  verifyRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "ratelimit:verify",
  });
}

export async function requestEmailVerification(): Promise<{
  success: boolean;
  rateLimited?: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { success: false, error: "Not authenticated" };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });

  if (!user) return { success: false, error: "User not found" };
  if (user.emailVerified) return { success: false, error: "Email already verified" };

  if (verifyRatelimit) {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
      headersList.get("x-real-ip") ??
      "127.0.0.1";

    const { success } = await verifyRatelimit.limit(ip);
    if (!success) return { success: false, rateLimited: true };
  }

  const identifier = VERIFY_PREFIX + user.email;

  // Remove any existing verification tokens for this email
  await db.verificationToken.deleteMany({ where: { identifier } });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + EXPIRY_MS);

  await db.verificationToken.create({
    data: { identifier, token, expires },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, verifyUrl);

  return { success: true };
}

export async function verifyEmailToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: "Missing token" };

  const verificationToken = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    return { success: false, error: "Invalid or already-used verification link." };
  }

  if (!verificationToken.identifier.startsWith(VERIFY_PREFIX)) {
    return { success: false, error: "Invalid verification link." };
  }

  if (verificationToken.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    return { success: false, error: "This verification link has expired. Please request a new one." };
  }

  const email = verificationToken.identifier.slice(VERIFY_PREFIX.length);

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: "User not found." };

  await db.$transaction([
    db.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    db.verificationToken.delete({ where: { token } }),
  ]);

  return { success: true };
}
