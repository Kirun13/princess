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
      const handleChange = (event: MediaQueryListEvent) => apply(event.matches);

      apply(mq.matches);
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    } else {
      html.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return <>{children}</>;
}
