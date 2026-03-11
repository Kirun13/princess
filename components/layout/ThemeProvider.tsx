"use client";

import { useEffect } from "react";

type Theme = "dark" | "light" | "auto";

interface ThemeProviderProps {
  theme: Theme;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    const html = document.documentElement;

    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = (dark: boolean) =>
        html.setAttribute("data-theme", dark ? "dark" : "light");

      apply(mq.matches);
      mq.addEventListener("change", (e) => apply(e.matches));
      return () => mq.removeEventListener("change", (e) => apply(e.matches));
    } else {
      html.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return <>{children}</>;
}
