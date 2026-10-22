import * as React from "react";
import {
  LogOut,
  ChevronDown,
  LogIn,
  SlidersHorizontal,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { useNavigation } from "../../contexts/NavigationContext.tsx";
import { useIdentity } from "../../contexts/IdentityContext.tsx";
import { useTheme } from "../../contexts/ThemeContext.tsx";
import { getNextThemeMode } from "../../lib/theme.ts";
import { BdiText } from "../ui/bdi-text.tsx";

function getInitials(name?: string, identifier?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (identifier && identifier.trim()) {
    return identifier.trim().slice(0, 2).toUpperCase();
  }
  return "U";
}

export function UserMenu() {
  const { t, direction } = useLocalization();
  const { navigateTo } = useNavigation();
  const { mode, toggleTheme } = useTheme();
  const {
    state,
    isAuthenticated,
    isEnrolled,
    isEnrolling,
    displayName,
    displayIdentifier,
    avatarUrl,
    safeDeviceLabel,
    openAuthDialog,
    signOut,
  } = useIdentity();

  const [isOpen, setIsOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = React.useState<string>();
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on click outside or Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
    } finally {
      setSigningOut(false);
    }
  };

  const handleOpenSettings = () => {
    setIsOpen(false);
    navigateTo("settings");
  };

  const getThemeIcon = () => {
    switch (mode) {
      case "light":
        return (
          <Sun
            className="h-4 w-4 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
        );
      case "dark":
        return (
          <Moon
            className="h-4 w-4 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
        );
      case "system":
        return (
          <Laptop
            className="h-4 w-4 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
        );
    }
  };

  const dropdownClassName = `absolute end-0 top-full mt-1.5 z-50 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-popover text-popover-foreground shadow-md transition-transform duration-150 ease-out animate-in fade-in-0 zoom-in-95 ${
    direction === "rtl" ? "origin-top-left" : "origin-top-right"
  }`;

  const renderDropdownContent = () => {
    if (!isAuthenticated && !isEnrolling) {
      return (
        <div
          role="dialog"
          aria-label={t("auth.title")}
          className={`${dropdownClassName} w-72 p-5`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="mt-4 text-base font-semibold tracking-tight text-foreground">
            {t("auth.title")}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t("auth.menuDescription")}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              openAuthDialog();
            }}
            className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors"
          >
            <span>{t("auth.signIn")}</span>
            <LogIn className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      );
    }

    return (
    <div
      role="dialog"
      aria-label={t("auth.account")}
      className={`${dropdownClassName} w-64 p-1.5`}
    >
      {/* Account Info Header */}
      {isEnrolling ? (
        <div className="px-2.5 py-2">
          <div className="text-sm font-semibold text-foreground truncate">
            <BdiText>
              {displayName || displayIdentifier || t("auth.account")}
            </BdiText>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>{t("auth.deviceNotEnrolled")}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              openAuthDialog();
            }}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors"
          >
            <span>{t("auth.enrollDevicePrompt")}</span>
          </button>
        </div>
      ) : (
        <div className="px-2.5 py-2">
          <div className="text-sm font-semibold text-foreground truncate">
            <BdiText>{displayName || t("settings.account.noName")}</BdiText>
          </div>
          {displayIdentifier && (
            <div className="text-xs text-muted-foreground truncate font-mono mt-0.5">
              <BdiText>{displayIdentifier}</BdiText>
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                isEnrolled ? "bg-emerald-500" : "bg-amber-500"
              }`}
              aria-hidden="true"
            />
            <span className="truncate">
              {isEnrolled ? (
                safeDeviceLabel ? (
                  <BdiText>{safeDeviceLabel}</BdiText>
                ) : (
                  t("auth.deviceEnrolled")
                )
              ) : (
                t("auth.deviceNotEnrolled")
              )}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="truncate">
              {state?.protectionStatus === "ready"
                ? t("auth.protectionReady")
                : t("auth.protectionBlocked")}
            </span>
          </div>
        </div>
      )}

      <div className="h-px bg-border/60 my-1" />

      {/* Action: Theme Switcher */}
      <button
        type="button"
        onClick={toggleTheme}
        className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none cursor-pointer transition-colors"
        aria-label={t("theme.switch_to", {
          mode: t(`theme.${getNextThemeMode(mode)}`),
        })}
        title={t("theme.switch_to", {
          mode: t(`theme.${getNextThemeMode(mode)}`),
        })}
      >
        <div className="flex items-center gap-2.5">
          {getThemeIcon()}
          <span>{t("theme.label")}</span>
        </div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
          {t(`theme.${mode}`)}
        </span>
      </button>

      {/* Action: Settings */}
      <button
        type="button"
        onClick={handleOpenSettings}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none cursor-pointer transition-colors"
      >
        <SlidersHorizontal
          className="h-4 w-4 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <span>{t("auth.manageAccount")}</span>
      </button>

      {/* Action: Sign Out */}
      {isAuthenticated && (
        <>
          <div className="h-px bg-border/60 my-1" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none cursor-pointer transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{signingOut ? t("auth.signingOut") : t("auth.signOut")}</span>
          </button>
        </>
      )}
    </div>
    );
  };

  // 1. Not authenticated: render clean Sign In / Menu trigger
  if (!isAuthenticated && !isEnrolling) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="inline-flex h-8 items-center gap-1.5 sm:gap-2 rounded-md border border-border bg-surface px-2 sm:px-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors transition-transform active:scale-[0.97] shrink-0"
          aria-label={t("auth.signIn")}
        >
          <LogIn
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{t("auth.signIn")}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground/70 shrink-0 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && renderDropdownContent()}
      </div>
    );
  }

  // 2. Waiting for device enrollment confirmation
  if (isEnrolling) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="inline-flex h-8 items-center gap-1.5 sm:gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 sm:px-2.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors shrink-0"
          aria-label={t("auth.enrollDevicePrompt")}
          title={t("auth.enrollDevicePrompt")}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="hidden sm:inline truncate max-w-[130px]">
            <BdiText>
              {displayName || displayIdentifier || t("auth.account")}
            </BdiText>
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-90">
            {t("auth.deviceNotEnrolled")}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-amber-700/70 dark:text-amber-300/70 shrink-0 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && renderDropdownContent()}
      </div>
    );
  }

  // 3. Authenticated: render profile avatar & menu
  const initials = getInitials(displayName, displayIdentifier);
  const primaryLabel = displayName || displayIdentifier || t("auth.account");

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="inline-flex h-8 items-center gap-1.5 sm:gap-2 rounded-md border border-border bg-surface px-2 sm:px-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors transition-transform active:scale-[0.97] shrink-0"
        aria-label={`${t("auth.account")}: ${primaryLabel}`}
      >
        {/* User Avatar Circle with tiny status indicator */}
        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-visible rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary select-none">
          {avatarUrl && avatarUrl !== failedAvatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              decoding="async"
              onError={() => setFailedAvatarUrl(avatarUrl)}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
          <span
            className={`absolute -bottom-0.5 -end-0.5 h-1.5 w-1.5 rounded-full border border-surface ${
              isEnrolled ? "bg-emerald-500" : "bg-amber-500"
            }`}
            aria-hidden="true"
          />
        </div>

        <span className="hidden sm:inline truncate max-w-[110px] sm:max-w-[150px] text-start">
          <BdiText>{primaryLabel}</BdiText>
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground/70 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && renderDropdownContent()}
    </div>
  );
}
