import * as React from "react";
import {
  LocalizationProvider,
  useLocalization,
} from "../contexts/LocalizationContext.tsx";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext.tsx";
import {
  NavigationProvider,
  useNavigation,
} from "../contexts/NavigationContext.tsx";
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "../contexts/CommandPaletteContext.tsx";
import { ShellLayout } from "../components/shell/ShellLayout.tsx";
import { SidebarNav } from "../components/shell/SidebarNav.tsx";
import { BreadcrumbTrail } from "../components/shell/BreadcrumbTrail.tsx";
import { HeaderUtilities } from "../components/shell/HeaderUtilities.tsx";
import { CommandPalette } from "../components/shell/CommandPalette.tsx";
import { SettingsView } from "../components/shell/SettingsView.tsx";
import { ModulePlaceholder } from "../components/shell/ModulePlaceholder.tsx";
import { BdiText } from "../components/ui/bdi-text.tsx";
import { isCommandPaletteShortcut } from "../lib/shortcuts.ts";
import { getRouteDefinition, type RouteId } from "../lib/routes.ts";
import { Button } from "../components/ui/button.tsx";
import { ChevronDown } from "lucide-react";
import logoIcon from "@/assets/solodesk_no_bg_no_text.png";
import { guidance } from "../../shared/desktop-contracts.ts";
import {
  blockedProtection,
  isProtectionResult,
  type ProtectionResult,
} from "../../shared/protection-contracts.ts";
import type { PersistenceStatusDto } from "../../shared/persistence-contracts.ts";
import { PersistenceRecoveryModal } from "./PersistenceRecoveryModal.tsx";

function PersistenceRecoveryNotice() {
  const { locale } = useLocalization();
  const [state, setState] = React.useState<PersistenceStatusDto | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => window.solodesk.persistence.onStateChanged(setState), []);
  if (!state || state.status !== "recovery_required") return null;
  const retry = async () => {
    setBusy(true);
    try { setState(await window.solodesk.persistence.retryOpen(state.workspaceId)); }
    catch { /* Keep the last safe guidance visible. */ }
    finally { setBusy(false); }
  };
  return <PersistenceRecoveryModal state={state} locale={locale} busy={busy}
    onRetry={() => { void retry(); }}
    onQuit={() => { void window.solodesk.window.requestClose(); }} />;
}

function ProtectionNotice() {
  const { locale, t } = useLocalization();
  const [state, setState] = React.useState<ProtectionResult | null>(null);
  const [checking, setChecking] = React.useState(false);
  const check = React.useCallback(async (retry = false) => {
    if (retry) setChecking(true);
    try {
      const response = retry
        ? await window.solodesk.protection.retry()
        : await window.solodesk.protection.getState();
      setState(
        response.status === "ok" && isProtectionResult(response.data)
          ? response.data
          : blockedProtection("protection_denied"),
      );
    } catch {
      setState(blockedProtection("protection_denied"));
    } finally {
      if (retry) setChecking(false);
    }
  }, []);
  React.useEffect(() => {
    let active = true;
    void window.solodesk.protection.getState()
      .then((response) => {
        if (active) setState(response.status === "ok" && isProtectionResult(response.data)
          ? response.data : blockedProtection("protection_denied"));
      })
      .catch(() => { if (active) setState(blockedProtection("protection_denied")); });
    return () => { active = false; };
  }, []);
  if (!state || state.status !== "blocked") return null;
  return (
    <section
      role="alert"
      aria-live="polite"
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
    >
      <h2 className="font-semibold">{t("protection.title")}</h2>
      <p className="mt-1">{t(`protection.${state.reason}`)}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={checking}
          onClick={() => void check(true)}
        >
          {t("protection.check_again")}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {state.correlationId}
        </span>
      </div>
    </section>
  );
}

function MainContentRenderer() {
  const { activeRoute } = useNavigation();
  const { locale, t } = useLocalization();
  const [showPlan, setShowPlan] = React.useState(false);
  const [notice, setNotice] = React.useState<keyof typeof guidance.en | "">("");

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.solodesk?.links?.onDecision)
      return;
    const stopLinks = window.solodesk.links.onDecision((event: unknown) => {
      if (
        event &&
        typeof event === "object" &&
        "status" in event &&
        (event as { status: string }).status === "denied"
      ) {
        setNotice("linkDenied");
      } else if (
        event &&
        typeof event === "object" &&
        "status" in event &&
        (event as { status: string }).status === "unavailable"
      ) {
        setNotice("linkUnavailable");
      }
    });
    return () => {
      stopLinks?.();
    };
  }, []);

  if (activeRoute === "settings") {
    return <SettingsView />;
  }

  if (activeRoute === "overview") {
    return (
      <div className="mx-auto max-w-4xl space-y-6 prevent-zoom-overflow">
        {notice && (
          <p
            className="rounded-md border border-border bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {guidance[locale][notice]}
          </p>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            A workspace for your independent work.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Desktop shell ready
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            SoloDesk starts here. Your upcoming projects, clients, time
            tracking, and invoices will live here as we build the next steps.
          </p>

          <div className="mt-4">
            <Button
              variant="outline"
              aria-expanded={showPlan}
              aria-controls="planned-features"
              onClick={() => setShowPlan((open) => !open)}
            >
              {showPlan ? "Hide planned features" : "View planned features"}
              <ChevronDown
                className={showPlan ? "rotate-180" : ""}
                aria-hidden="true"
              />
            </Button>
          </div>

          <section
            id="planned-features"
            hidden={!showPlan}
            className="mt-4 border-t border-border pt-4"
          >
            <h2 className="text-base font-semibold text-foreground">
              Planned next
            </h2>
            <ul className="mt-2 grid gap-x-8 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
              <li>Projects and clients</li>
              <li>Tasks and deadlines</li>
              <li>Time tracking</li>
              <li>Invoices and payment records</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              These features are not implemented yet.
            </p>
          </section>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div className="flex items-center gap-3.5">
            <img
              src={logoIcon}
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                <BdiText>{t("app.title")}</BdiText>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                {t("placeholder.unbuilt_module.notice")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-surface-subtle p-4 border border-border">
              <span className="text-muted-foreground text-xs block font-medium">
                {t("placeholder.sync.title")}
              </span>
              <span className="font-semibold text-foreground mt-1 block">
                {t("placeholder.sync.status")}
              </span>
              <span className="text-[11px] text-muted-foreground mt-2 block">
                Target: F017
              </span>
            </div>

            <div className="rounded-lg bg-surface-subtle p-4 border border-border">
              <span className="text-muted-foreground text-xs block font-medium">
                Active Tenant / Workspace
              </span>
              <span className="font-semibold text-foreground mt-1 block">
                {t("placeholder.workspaces.status")}
              </span>
              <span className="text-[11px] text-muted-foreground mt-2 block">
                Target: F012
              </span>
            </div>

            <div className="rounded-lg bg-surface-subtle p-4 border border-border">
              <span className="text-muted-foreground text-xs block font-medium">
                Sample Bidi Identifier
              </span>
              <span className="font-mono font-semibold text-foreground mt-1 block">
                <BdiText>INV-2026-001</BdiText>
              </span>
              <span className="text-[11px] text-muted-foreground mt-2 block truncate">
                <BdiText>support@solodesk.app</BdiText>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const routeDef = getRouteDefinition(activeRoute);
  return (
    <ModulePlaceholder
      moduleKey={activeRoute}
      title={t(routeDef?.labelKey ?? activeRoute)}
      targetPhase={routeDef?.targetPhase ?? "P01"}
      statusText={
        activeRoute === "time" ? t("placeholder.timer.status") : undefined
      }
    />
  );
}

function ShellRoot() {
  const { toggleLocale, t } = useLocalization();
  const { toggleTheme, setTheme } = useTheme();
  const { navigateTo, routes } = useNavigation();
  const { toggle, registerAction } = useCommandPalette();

  // Listen for global shortcut Mod+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCommandPaletteShortcut(e)) {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  // Register navigation & preferences commands in palette
  React.useEffect(() => {
    const cleanups: Array<() => void> = [];

    // Register all routes
    for (const route of routes) {
      const cleanup = registerAction({
        id: `nav-${route.id}`,
        category: "navigation",
        titleKey: route.labelKey,
        titleText: t(route.labelKey),
        keywords: [route.id, t(route.labelKey)],
        iconName: route.iconName,
        execute: () => navigateTo(route.id as RouteId),
        enabled: true,
      });
      cleanups.push(cleanup);
    }

    // Register theme actions
    cleanups.push(
      registerAction({
        id: "pref-toggle-theme",
        category: "preferences",
        titleKey: "theme.toggle",
        titleText: t("theme.toggle"),
        keywords: ["theme", "dark", "light", "system", "مظهر", "داكن", "فاتح"],
        iconName: "SunMoon",
        execute: toggleTheme,
        enabled: true,
      }),
    );

    cleanups.push(
      registerAction({
        id: "pref-theme-light",
        category: "preferences",
        titleKey: "theme.light",
        titleText: t("theme.switch_to", { mode: t("theme.light") }),
        keywords: ["light", "فاتح", "مظهر"],
        iconName: "Sun",
        execute: () => setTheme("light"),
        enabled: true,
      }),
    );

    cleanups.push(
      registerAction({
        id: "pref-theme-dark",
        category: "preferences",
        titleKey: "theme.dark",
        titleText: t("theme.switch_to", { mode: t("theme.dark") }),
        keywords: ["dark", "داكن", "مظهر"],
        iconName: "Moon",
        execute: () => setTheme("dark"),
        enabled: true,
      }),
    );

    // Register language action
    cleanups.push(
      registerAction({
        id: "pref-toggle-lang",
        category: "preferences",
        titleKey: "language.toggle",
        titleText: t("language.toggle"),
        keywords: ["language", "arabic", "english", "ترجمة", "لغة"],
        shortcutBadge: "Alt+L",
        iconName: "Languages",
        execute: toggleLocale,
        enabled: true,
      }),
    );

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [
    routes,
    registerAction,
    t,
    navigateTo,
    toggleLocale,
    toggleTheme,
    setTheme,
  ]);

  return (
    <ShellLayout
      sidebar={<SidebarNav />}
      breadcrumbs={<BreadcrumbTrail />}
      headerUtilities={<HeaderUtilities />}
    >
      <CommandPalette />
      <ProtectionNotice />
      <PersistenceRecoveryNotice />
      <MainContentRenderer />
    </ShellLayout>
  );
}

export function App() {
  return (
    <LocalizationProvider>
      <ThemeProvider>
        <NavigationProvider>
          <CommandPaletteProvider>
            <ShellRoot />
          </CommandPaletteProvider>
        </NavigationProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}
