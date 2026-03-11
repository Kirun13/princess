"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function resetPassword(
  token: string,
  password: string
): Promise<{ success?: boolean; error?: string }> {
  const verificationToken = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const email = verificationToken.identifier;
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return { error: "User not found." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.user.update({
      where: { email },
      data: {
        passwordHash,
        emailVerified: user.emailVerified ?? new Date(),
      },
    }),
    // Single-use: delete token immediately after use
    db.verificationToken.delete({ where: { token } }),
  ]);

  return { success: true };
}
