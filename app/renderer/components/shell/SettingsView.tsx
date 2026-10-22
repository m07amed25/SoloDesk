import * as React from "react";
import {
  useLocalization,
  type SupportedLocale,
} from "../../contexts/LocalizationContext.tsx";
import { useTheme, type ThemeMode } from "../../contexts/ThemeContext.tsx";
import { useIdentity } from "../../contexts/IdentityContext.tsx";
import { THEME_PRESET_OPTIONS } from "../../lib/theme.ts";
import { Button } from "../ui/button.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import {
  Sun,
  Moon,
  Laptop,
  Globe,
  MonitorCheck,
  User,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  LogIn,
} from "lucide-react";

export function SettingsView() {
  const { locale, setLocale, direction, t } = useLocalization();
  const {
    mode,
    setTheme,
    resolvedTheme,
    forcedColorsActive,
    themePreset,
    setThemePreset,
  } = useTheme();
  const {
    state,
    isAuthenticated,
    isEnrolled,
    isEnrolling,
    displayName,
    displayIdentifier,
    safeDeviceLabel,
    openAuthDialog,
    signOut,
  } = useIdentity();

  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const platform =
    typeof navigator !== "undefined"
      ? /mac/i.test(navigator.userAgent)
        ? "macOS"
        : /win/i.test(navigator.userAgent)
          ? "Windows"
          : "Linux"
      : "Desktop";

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.description")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Account & Device Section */}
        <section
          aria-labelledby="account-settings-heading"
          className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2
              id="account-settings-heading"
              className="text-base font-semibold text-foreground"
            >
              {t("settings.account.title")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.account.description")}
          </p>

          {isAuthenticated || isEnrolling ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-surface-subtle border border-border p-3">
                  <span className="text-xs text-muted-foreground block">
                    {t("settings.account.profileName")}
                  </span>
                  <span className="font-medium text-foreground">
                    <BdiText>
                      {displayName || t("settings.account.noName")}
                    </BdiText>
                  </span>
                </div>

                <div className="rounded-lg bg-surface-subtle border border-border p-3">
                  <span className="text-xs text-muted-foreground block">
                    {t("settings.account.identifier")}
                  </span>
                  <span className="font-mono font-medium text-foreground truncate block">
                    <BdiText>{displayIdentifier || "—"}</BdiText>
                  </span>
                </div>

                <div className="rounded-lg bg-surface-subtle border border-border p-3">
                  <span className="text-xs text-muted-foreground block flex items-center gap-1.5">
                    {isEnrolled ? (
                      <ShieldCheck
                        className="h-3.5 w-3.5 text-emerald-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <ShieldAlert
                        className="h-3.5 w-3.5 text-amber-500"
                        aria-hidden="true"
                      />
                    )}
                    <span>{t("settings.account.device")}</span>
                  </span>
                  <span className="font-medium text-foreground">
                    <BdiText>
                      {safeDeviceLabel ||
                        (isEnrolled
                          ? t("auth.deviceEnrolled")
                          : t("settings.account.notEnrolled"))}
                    </BdiText>
                  </span>
                </div>

                <div className="rounded-lg bg-surface-subtle border border-border p-3">
                  <span className="text-xs text-muted-foreground block flex items-center gap-1.5">
                    <Lock
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span>{t("settings.account.protection")}</span>
                  </span>
                  <span className="font-medium text-foreground">
                    <BdiText>
                      {state?.protectionStatus === "ready"
                        ? t("auth.protectionReady")
                        : t("auth.protectionBlocked")}
                    </BdiText>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {isEnrolling && (
                  <Button
                    variant="default"
                    onClick={openAuthDialog}
                    className="gap-2"
                  >
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                    <span>{t("auth.enrollDevicePrompt")}</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="gap-2 text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {signingOut ? t("auth.signingOut") : t("auth.signOut")}
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-surface-subtle border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-foreground block">
                  {t("auth.notSignedIn")}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {t("auth.description")}
                </span>
              </div>
              <Button
                variant="default"
                onClick={openAuthDialog}
                className="gap-2 shrink-0"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>{t("auth.signIn")}</span>
              </Button>
            </div>
          )}
        </section>

        {/* Language Section */}
        <section
          aria-labelledby="language-settings-heading"
          className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2
              id="language-settings-heading"
              className="text-base font-semibold text-foreground"
            >
              {t("settings.language.title")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.language.description")}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={locale === "en" ? "default" : "outline"}
              onClick={() => setLocale("en" as SupportedLocale)}
              className="gap-2"
            >
              English (LTR)
            </Button>
            <Button
              variant={locale === "ar" ? "default" : "outline"}
              onClick={() => setLocale("ar" as SupportedLocale)}
              className="gap-2"
            >
              العربية (RTL)
            </Button>
          </div>
        </section>

        {/* Theme Section */}
        <section
          aria-labelledby="theme-settings-heading"
          className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sun className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2
              id="theme-settings-heading"
              className="text-base font-semibold text-foreground"
            >
              {t("settings.theme.title")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.theme.description")}
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              variant={mode === "system" ? "default" : "outline"}
              onClick={() => setTheme("system" as ThemeMode)}
              className="gap-2"
            >
              <Laptop className="h-4 w-4" aria-hidden="true" />
              <span>{t("theme.system")}</span>
            </Button>
            <Button
              variant={mode === "light" ? "default" : "outline"}
              onClick={() => setTheme("light" as ThemeMode)}
              className="gap-2"
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
              <span>{t("theme.light")}</span>
            </Button>
            <Button
              variant={mode === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark" as ThemeMode)}
              className="gap-2"
            >
              <Moon className="h-4 w-4" aria-hidden="true" />
              <span>{t("theme.dark")}</span>
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground mb-1">
              {t("theme.preset.title")}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t("theme.preset.description")}
            </p>
            <div className="flex flex-wrap gap-3">
              {THEME_PRESET_OPTIONS.map((preset) => (
                <Button
                  key={preset.id}
                  variant={themePreset === preset.id ? "default" : "outline"}
                  onClick={() => setThemePreset(preset.id)}
                  className="gap-2.5"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.accentColor }}
                    aria-hidden="true"
                  />
                  <span>{t(preset.titleKey)}</span>
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Desktop Environment Details */}
        <section
          aria-labelledby="env-settings-heading"
          className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <MonitorCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2
              id="env-settings-heading"
              className="text-base font-semibold text-foreground"
            >
              {t("settings.environment.title")}
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-surface-subtle border border-border p-3">
              <span className="text-xs text-muted-foreground block">
                {t("settings.environment.platform")}
              </span>
              <span className="font-medium text-foreground">
                <BdiText>{platform}</BdiText>
              </span>
            </div>
            <div className="rounded-lg bg-surface-subtle border border-border p-3">
              <span className="text-xs text-muted-foreground block">
                {t("settings.environment.version")}
              </span>
              <span className="font-mono font-medium text-foreground">
                <BdiText>SoloDesk v0.0.0 (F005 Shell)</BdiText>
              </span>
            </div>
            <div className="rounded-lg bg-surface-subtle border border-border p-3">
              <span className="text-xs text-muted-foreground block">
                Layout Direction & Font
              </span>
              <span className="font-medium text-foreground">
                <BdiText>
                  {direction.toUpperCase()} (
                  {direction === "rtl" ? "Noto Sans Arabic" : "Inter"})
                </BdiText>
              </span>
            </div>
            <div className="rounded-lg bg-surface-subtle border border-border p-3">
              <span className="text-xs text-muted-foreground block">
                Effective Theme & Contrast
              </span>
              <span className="font-medium text-foreground">
                <BdiText>
                  {resolvedTheme}{" "}
                  {forcedColorsActive ? "(High Contrast Forced)" : ""}
                </BdiText>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
