"use server";

import { db } from "@/lib/db";
import { sendResetEmail } from "@/lib/email";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import crypto from "crypto";

let forgotRatelimit: Ratelimit | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  forgotRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "ratelimit:forgot",
  });
}

export async function forgotPassword(email: string): Promise<{ success: boolean; rateLimited?: boolean }> {
  if (forgotRatelimit) {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
      headersList.get("x-real-ip") ??
      "127.0.0.1";

    const { success } = await forgotRatelimit.limit(ip);
    if (!success) return { success: false, rateLimited: true };
  }

  // Always run this regardless of whether user exists (prevent enumeration)
  try {
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      // Remove any previous tokens for this identifier
      await db.verificationToken.deleteMany({ where: { identifier: email } });

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.verificationToken.create({
        data: { identifier: email, token, expires },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/reset-password?token=${token}`;
      await sendResetEmail(email, resetUrl);
    }
  } catch {
    // Silently fail — caller gets the same success response either way
  }

  return { success: true };
}
