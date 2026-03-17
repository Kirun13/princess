import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import {
  getUIFontCssVar,
  normalizeUIFont,
  resolveUserSettings,
  type AppTheme,
} from "@/lib/user-settings";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Princess Puzzle",
  description: "A chess-themed logic puzzle game. Place queens without conflict.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  let theme: AppTheme = "dark";
  let uiFont = getUIFontCssVar(resolveUserSettings().uiFont);

  if (session?.user?.id) {
    const settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { theme: true, uiFont: true },
    });
    const resolvedSettings = resolveUserSettings({
      theme:
        settings?.theme === "light" || settings?.theme === "auto"
          ? settings.theme
          : "dark",
      uiFont: normalizeUIFont(settings?.uiFont),
    });
    theme = resolvedSettings.theme;
    uiFont = getUIFontCssVar(resolvedSettings.uiFont);
  }

  return (
    <html lang="en" data-theme={theme === "auto" ? "dark" : theme} className={`${inter.variable} ${mono.variable}`}>
      <body
        className="antialiased min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]"
        style={{ "--app-ui-font": uiFont } as CSSProperties}
      >
        <ThemeProvider theme={theme}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
