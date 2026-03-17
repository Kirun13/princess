export type AppTheme = "dark" | "light" | "auto";
export type UIFont = "JetBrains Mono" | "Inter";

export interface ResolvedUserSettings {
  soundEffects: boolean;
  confirmReset: boolean;
  highlightConflicts: boolean;
  showTimer: boolean;
  theme: AppTheme;
  uiFont: UIFont;
}

export const defaultUserSettings: ResolvedUserSettings = {
  soundEffects: true,
  confirmReset: false,
  highlightConflicts: true,
  showTimer: true,
  theme: "dark",
  uiFont: "JetBrains Mono",
};

export function normalizeUIFont(value?: string | null): UIFont {
  return value === "Inter" ? "Inter" : "JetBrains Mono";
}

export function resolveUserSettings(
  settings?: Partial<ResolvedUserSettings> | null
): ResolvedUserSettings {
  return {
    soundEffects: settings?.soundEffects ?? defaultUserSettings.soundEffects,
    confirmReset: settings?.confirmReset ?? defaultUserSettings.confirmReset,
    highlightConflicts:
      settings?.highlightConflicts ?? defaultUserSettings.highlightConflicts,
    showTimer: settings?.showTimer ?? defaultUserSettings.showTimer,
    theme: settings?.theme ?? defaultUserSettings.theme,
    uiFont: normalizeUIFont(settings?.uiFont),
  };
}

export function getUIFontCssVar(font: UIFont): string {
  return font === "Inter" ? "var(--font-inter)" : "var(--font-mono)";
}
