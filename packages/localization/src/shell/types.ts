import type { en } from "./en.ts";

export type TranslationKey = keyof typeof en;
export type TranslationDictionary = Readonly<Record<TranslationKey, string>>;
export type SupportedLocale = "en" | "ar";
export type TextDirection = "ltr" | "rtl";

export const IDENTITY_RECOVERY_KEYS = Object.freeze([
  "shell.identity.action.retry",
  "shell.identity.action.cancel",
  "shell.identity.action.unlockProtection",
  "shell.identity.action.signIn",
  "shell.identity.action.chooseIsolatedProfile",
  "shell.identity.action.reconcile",
  "shell.identity.action.upgrade",
  "shell.identity.action.contactSupport",
] as const satisfies readonly TranslationKey[]);
