import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import SettingsClient from "@/components/settings/SettingsClient";
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings — Princess" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in?callbackUrl=/settings");
  }

  const [settings, user, credentialsAccount] = await Promise.all([
    db.userSettings.findUnique({ where: { userId: session.user.id } }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, email: true, emailVerified: true },
    }),
    db.account.findFirst({
      where: { userId: session.user.id, provider: "credentials" },
      select: { id: true },
    }),
  ]);

  const isCredentialsUser = !!credentialsAccount;
  const isUnverified = isCredentialsUser && !user?.emailVerified;

  return (
    <>
      {isUnverified && user?.email && (
        <EmailVerificationBanner email={user.email} />
      )}
      <SettingsClient
        initialSettings={{
          soundEffects: settings?.soundEffects ?? true,
          confirmReset: settings?.confirmReset ?? false,
          highlightConflicts: settings?.highlightConflicts ?? true,
          showTimer: settings?.showTimer ?? true,
          theme: (settings?.theme as "dark" | "light" | "auto") ?? "dark",
          uiFont: settings?.uiFont ?? "JetBrains Mono",
        }}
        username={user?.username ?? ""}
        email={user?.email ?? ""}
        isCredentialsUser={isCredentialsUser}
      />
    </>
  );
}
