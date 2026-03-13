import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if (!process.env.EMAIL_SERVER_HOST) {
    logger.info({ action: "auth.verify_email.dev_fallback" }, "email.send.skipped");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: process.env.EMAIL_SERVER_PORT === "465",
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
      to,
      subject: "Verify your Princess Puzzle email address",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Verify your email</h2>
          <p>Thanks for signing up for Princess Puzzle! Please verify your email address.</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:6px;text-decoration:none;">
              Verify Email Address
            </a>
          </p>
          <p>This link expires in <strong>24 hours</strong>.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error(
      { action: "auth.verify_email.send_failed", err: error },
      "email.send.failed"
    );
    throw error;
  }
}

export async function sendResetEmail(to: string, resetUrl: string) {
  if (!process.env.EMAIL_SERVER_HOST) {
    logger.info({ action: "auth.reset_email.dev_fallback" }, "email.send.skipped");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: process.env.EMAIL_SERVER_PORT === "465",
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
      to,
      subject: "Reset your Princess Puzzle password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>You requested a password reset for your Princess Puzzle account.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:6px;text-decoration:none;">
              Reset Password
            </a>
          </p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error(
      { action: "auth.reset_email.send_failed", err: error },
      "email.send.failed"
    );
    throw error;
  }
}
