"use server";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const VERIFY_PREFIX = "verify:";
const VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function credentialsSignIn(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error; // re-throw NEXT_REDIRECT
  }
}

export async function signUp(
  username: string,
  email: string,
  password: string
) {
  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    if (existing.email === email)
      return { error: "An account with this email already exists." };
    return { error: "This username is already taken." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { username, email, passwordHash },
  });

  // Send verification email in the background (don't block sign-in on failure)
  try {
    const identifier = VERIFY_PREFIX + email;
    await db.verificationToken.deleteMany({ where: { identifier } });
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_EXPIRY_MS);
    await db.verificationToken.create({ data: { identifier, token, expires } });
    const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/verify-email?token=${token}`;
    await sendVerificationEmail(email, verifyUrl);
  } catch {
    // Non-fatal: user can resend from settings
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    throw error; // re-throw NEXT_REDIRECT
  }
}

export async function oauthSignIn(provider: "google" | "github") {
  await signIn(provider, { redirectTo: "/" });
}
