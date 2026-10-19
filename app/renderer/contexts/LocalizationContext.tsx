import * as React from "react";
import { en } from "../../../packages/localization/src/shell/en.ts";
import { ar } from "../../../packages/localization/src/shell/ar.ts";
import type {
  SupportedLocale,
  TextDirection,
} from "../../../packages/localization/src/shell/types.ts";
import { preferencesManager } from "../lib/preferences.ts";
import { isolateBidi } from "../lib/bidi.ts";

export type { SupportedLocale, TextDirection };

export interface LocalizationContextValue {
  locale: SupportedLocale;
  direction: TextDirection;
  setLocale: (locale: SupportedLocale) => void;
  toggleLocale: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isolateBidi: (text: string) => string;
}

const dictionaries: Record<
  SupportedLocale,
  Readonly<Record<string, string>>
> = {
  en,
  ar,
};

const LocalizationContext = React.createContext<
  LocalizationContextValue | undefined
>(undefined);

export function LocalizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<SupportedLocale>(() => {
    return preferencesManager.load().locale;
  });

  const direction: TextDirection = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", direction);
      document.documentElement.setAttribute("lang", locale);
      document.documentElement.style.fontFamily =
        locale === "ar" ? "var(--font-arabic)" : "var(--font-sans)";
    }
  }, [locale, direction]);

  const setLocale = React.useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    preferencesManager.save({ locale: nextLocale });
  }, []);

  const toggleLocale = React.useCallback(() => {
    setLocale(locale === "en" ? "ar" : "en");
  }, [locale, setLocale]);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[locale] ?? dictionaries.en;
      let text = dict[key] ?? dictionaries.en[key] ?? key;
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          text = text.replaceAll(`{${paramKey}}`, String(paramValue));
        }
      }
      return text;
    },
    [locale],
  );

  const value = React.useMemo<LocalizationContextValue>(
    () => ({
      locale,
      direction,
      setLocale,
      toggleLocale,
      t,
      isolateBidi,
    }),
    [locale, direction, setLocale, toggleLocale, t],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  const context = React.useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      "useLocalization must be used within a LocalizationProvider",
    );
  }
  return context;
}
