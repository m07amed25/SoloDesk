export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type ThemePreset = "modern-minimal" | "amber-mono";

export interface ThemePresetOption {
  id: ThemePreset;
  titleKey: "theme.preset.modern" | "theme.preset.amber";
  accentColor: string;
}

export const THEME_PRESET_OPTIONS: readonly ThemePresetOption[] = [
  {
    id: "modern-minimal",
    titleKey: "theme.preset.modern",
    accentColor: "oklch(0.6231 0.1880 259.8145)",
  },
  {
    id: "amber-mono",
    titleKey: "theme.preset.amber",
    accentColor: "oklch(0.6716 0.1368 48.5130)",
  },
] as const;

export function resolveTheme(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return systemPrefersDark ? "dark" : "light";
}

export function getNextThemeMode(current: ThemeMode): ThemeMode {
  switch (current) {
    case "system":
      return "light";
    case "light":
      return "dark";
    case "dark":
      return "system";
  }
}
