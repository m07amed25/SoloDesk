export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type ThemePreset =
  | "modern-minimal"
  | "amber-mono"
  | "graphite"
  | "high-contrast"
  | "solar"
  | "chakra-industrial"
  | "cobalt"
  | "amber-outfit";

export interface ThemePresetOption {
  id: ThemePreset;
  titleKey:
    | "theme.preset.modern"
    | "theme.preset.amber"
    | "theme.preset.graphite"
    | "theme.preset.high_contrast"
    | "theme.preset.solar"
    | "theme.preset.chakra"
    | "theme.preset.cobalt"
    | "theme.preset.amber_outfit";
  accentColor: string;
  keywords: readonly string[];
}

export const THEME_PRESET_OPTIONS: readonly ThemePresetOption[] = [
  {
    id: "modern-minimal",
    titleKey: "theme.preset.modern",
    accentColor: "oklch(0.6231 0.1880 259.8145)",
    keywords: ["preset", "modern", "minimal", "نمط", "حديث"],
  },
  {
    id: "amber-mono",
    titleKey: "theme.preset.amber",
    accentColor: "oklch(0.6716 0.1368 48.5130)",
    keywords: ["preset", "amber", "mono", "warm", "عنبري", "نمط"],
  },
  {
    id: "graphite",
    titleKey: "theme.preset.graphite",
    accentColor: "oklch(0.0600 0.0100 270)",
    keywords: ["preset", "graphite", "neutral", "رمادي", "نمط"],
  },
  {
    id: "high-contrast",
    titleKey: "theme.preset.high_contrast",
    accentColor: "oklch(0.2138 0.0019 286.2347)",
    keywords: ["preset", "contrast", "black", "white", "تباين", "نمط"],
  },
  {
    id: "solar",
    titleKey: "theme.preset.solar",
    accentColor: "oklch(0.6958 0.2043 43.4910)",
    keywords: ["preset", "solar", "orange", "warm", "برتقالي", "نمط"],
  },
  {
    id: "chakra-industrial",
    titleKey: "theme.preset.chakra",
    accentColor: "oklch(0.6152 0.1657 26.9800)",
    keywords: [
      "preset",
      "chakra",
      "industrial",
      "cyber",
      "sharp",
      "شاكرا",
      "صناعي",
      "نمط",
    ],
  },
  {
    id: "cobalt",
    titleKey: "theme.preset.cobalt",
    accentColor: "oklch(0.5296 0.1506 255.1121)",
    keywords: ["preset", "cobalt", "blue", "slate", "كوبالت", "أزرق", "نمط"],
  },
  {
    id: "amber-outfit",
    titleKey: "theme.preset.amber_outfit",
    accentColor: "oklch(0.6716 0.1368 48.5130)",
    keywords: [
      "preset",
      "amber",
      "outfit",
      "warm",
      "copper",
      "عنبري",
      "آوتفت",
      "نمط",
    ],
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
