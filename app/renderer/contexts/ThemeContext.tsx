import * as React from "react";
import { preferencesManager } from "../lib/preferences.ts";
import {
  resolveTheme,
  getNextThemeMode,
  type ThemeMode,
  type ResolvedTheme,
} from "../lib/theme.ts";

export type { ThemeMode, ResolvedTheme };

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  forcedColorsActive: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>(() => {
    return preferencesManager.load().theme;
  });

  const [systemPrefersDark, setSystemPrefersDark] = React.useState<boolean>(
    () => {
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    },
  );

  const [forcedColorsActive, setForcedColorsActive] = React.useState<boolean>(
    () => {
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(forced-colors: active)").matches;
      }
      return false;
    },
  );

  // Listen to OS system color scheme changes
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Listen to forced-colors (Windows high contrast) changes
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const forcedMediaQuery = window.matchMedia("(forced-colors: active)");
    const handleForcedChange = (e: MediaQueryListEvent) => {
      setForcedColorsActive(e.matches);
    };

    forcedMediaQuery.addEventListener("change", handleForcedChange);
    return () =>
      forcedMediaQuery.removeEventListener("change", handleForcedChange);
  }, []);

  const resolvedTheme = React.useMemo(() => {
    return resolveTheme(mode, systemPrefersDark);
  }, [mode, systemPrefersDark]);

  // Synchronize DOM root class for Tailwind .dark variant
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      if (resolvedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [resolvedTheme]);

  const setTheme = React.useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    preferencesManager.save({ theme: nextMode });
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(getNextThemeMode(mode));
  }, [mode, setTheme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      forcedColorsActive,
      setTheme,
      toggleTheme,
    }),
    [mode, resolvedTheme, forcedColorsActive, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
