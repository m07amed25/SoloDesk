import type { en } from "./en.ts";

export type TranslationKey = keyof typeof en;
export type TranslationDictionary = Readonly<Record<TranslationKey, string>>;
export type SupportedLocale = "en" | "ar";
export type TextDirection = "ltr" | "rtl";
