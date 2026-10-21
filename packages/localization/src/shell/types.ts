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

export const IDENTITY_SECURITY_KEYS = Object.freeze([
  "identity.security.title",
  "identity.security.policy.optional",
  "identity.security.policy.required",
  "identity.security.status.not_configured",
  "identity.security.status.recovery_codes_pending",
  "identity.security.status.ready",
  "identity.security.announcement.browser_opened",
  "identity.security.action.enroll_factor",
  "identity.security.action.acknowledge_recovery_codes",
  "identity.security.action.cancel",
  "identity.security.recovery_codes.confined_warning",
  "identity.security.error.verification_failed",
  "identity.security.status.challenge_required",
  "identity.security.status.challenge_waiting",
  "identity.security.status.challenge_expired",
  "identity.security.status.rate_limited",
  "identity.security.action.open_challenge",
  "identity.security.action.retry",
  "identity.security.action.recover",
  "identity.security.action.sign_in_again",
  "identity.security.status.recovery_requested",
  "identity.security.status.factor_reset_required",
  "identity.security.status.local_unlock_required",
  "identity.security.status.workspace_revalidation",
  "identity.security.action.unlock_local",
  "identity.security.action.revalidate_workspace",
  "identity.security.status.reauth_required",
  "identity.security.status.stale_action",
  "identity.security.status.session_impact",
  "identity.security.action.reauthenticate",
  "identity.security.action.confirm_change",
] as const satisfies readonly TranslationKey[]);
