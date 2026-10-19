import {
  useLocalization,
  type SupportedLocale,
} from "../../contexts/LocalizationContext.tsx";
import { useTheme, type ThemeMode } from "../../contexts/ThemeContext.tsx";
import { Button } from "../ui/button.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import { Sun, Moon, Laptop, Globe, MonitorCheck } from "lucide-react";

export function SettingsView() {
  const { locale, setLocale, direction, t } = useLocalization();
  const { mode, setTheme, resolvedTheme, forcedColorsActive } = useTheme();

  const platform =
    typeof navigator !== "undefined"
      ? /mac/i.test(navigator.userAgent)
        ? "macOS"
        : /win/i.test(navigator.userAgent)
          ? "Windows"
          : "Linux"
      : "Desktop";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.description")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Language Section */}
        <section
          aria-labelledby="language-settings-heading"
          className="rounded-xl border border-border bg-surface p-6 shadow-xs"
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
          className="rounded-xl border border-border bg-surface p-6 shadow-xs"
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

          <div className="flex flex-wrap gap-3">
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
        </section>

        {/* Desktop Environment Details */}
        <section
          aria-labelledby="env-settings-heading"
          className="rounded-xl border border-border bg-surface p-6 shadow-xs"
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
