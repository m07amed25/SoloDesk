import * as React from "react";
import { useLocalization } from "../contexts/LocalizationContext.tsx";
import { Button } from "../components/ui/button.tsx";
import { AlertTriangle, AlertCircle, CloudOff, X } from "lucide-react";
import type {
  QuotaTier,
  ProviderStatus,
} from "../../shared/cloud-contracts.ts";

export interface QuotaWarningBannerProps {
  tier?: QuotaTier;
  providerStatus?: ProviderStatus;
  dismissable?: boolean;
  onDismiss?: () => void;
  overrideLocale?: "en" | "ar";
}

export function QuotaWarningBanner({
  tier: propTier,
  providerStatus: propStatus,
  dismissable = true,
  onDismiss,
  overrideLocale,
}: QuotaWarningBannerProps) {
  const contextLoc = useLocalization();
  const locale = overrideLocale || contextLoc?.locale || "en";
  const t = contextLoc?.t || ((key: string) => key);

  const [eventTier, setEventTier] = React.useState<QuotaTier | null>(null);
  const [eventStatus, setEventStatus] = React.useState<ProviderStatus | null>(
    null,
  );
  const [dismissed, setDismissed] = React.useState(false);

  const localTier: QuotaTier = propTier ?? eventTier ?? "normal";
  const localStatus: ProviderStatus =
    propStatus ?? eventStatus ?? "operational";

  // Connect to global window events if available and props are omitted
  React.useEffect(() => {
    if (propTier !== undefined && propStatus !== undefined) return;
    if (typeof window === "undefined" || !window.solodesk?.cloud) return;

    const unsubQuota = window.solodesk.cloud.onQuotaChanged?.((profile) => {
      if (profile?.quotaTier) {
        setEventTier(profile.quotaTier);
        setDismissed(false);
      }
      if (profile?.providerStatus) {
        setEventStatus(profile.providerStatus);
      }
    });

    const unsubStatus = window.solodesk.cloud.onStatusChanged?.((payload) => {
      if (payload?.state === "offline_degraded") {
        setEventStatus("degraded");
        setDismissed(false);
      } else if (payload?.state === "quota_exhausted") {
        setEventTier("exhausted_100");
        setDismissed(false);
      } else if (payload?.state === "operational") {
        setEventStatus("operational");
      }
    });

    return () => {
      unsubQuota?.();
      unsubStatus?.();
    };
  }, [propTier, propStatus]);

  if (dismissed) {
    return null;
  }

  // Determine active warning mode
  const isExhausted = localTier === "exhausted_100";
  const isCritical = localTier === "critical_95";
  const isWarning85 = localTier === "warning_85";
  const isWarning70 = localTier === "warning_70";
  const isDegraded =
    localStatus === "degraded" ||
    localStatus === "paused" ||
    localStatus === "maintenance";

  if (
    !isExhausted &&
    !isCritical &&
    !isWarning85 &&
    !isWarning70 &&
    !isDegraded
  ) {
    return null;
  }

  let messageId = "quota.warning_70";
  let bannerClass =
    "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  let testId = "quota-warning-70-banner";
  let icon = (
    <AlertTriangle
      className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
      aria-hidden="true"
    />
  );
  const isAssertive = isExhausted || isCritical;

  if (isExhausted) {
    messageId = "quota.exhausted_100";
    bannerClass =
      "border-destructive/60 bg-destructive/15 text-destructive dark:text-red-300";
    testId = "quota-exhausted-banner";
    icon = (
      <AlertCircle
        className="h-5 w-5 shrink-0 text-destructive"
        aria-hidden="true"
      />
    );
  } else if (isCritical) {
    messageId = "quota.critical_95";
    bannerClass =
      "border-orange-500/60 bg-orange-500/15 text-orange-900 dark:text-orange-200";
    testId = "quota-critical-banner";
    icon = (
      <AlertTriangle
        className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400"
        aria-hidden="true"
      />
    );
  } else if (isWarning85) {
    messageId = "quota.warning_85";
    bannerClass =
      "border-amber-600/50 bg-amber-600/10 text-amber-950 dark:text-amber-300";
    testId = "quota-warning-85-banner";
    icon = (
      <AlertTriangle
        className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
    );
  } else if (isDegraded) {
    messageId = "quota.provider_degraded";
    bannerClass =
      "border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-200";
    testId = "quota-degraded-banner";
    icon = (
      <CloudOff
        className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
        aria-hidden="true"
      />
    );
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const messageText = t(messageId as any);

  const dismissText = t("quota.dismiss" as any);

  return (
    <section
      role="alert"
      aria-live={isAssertive ? "assertive" : "polite"}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-testid={testId}
      className={`mb-4 flex items-center justify-between gap-3 rounded-lg border p-3.5 text-sm transition-all duration-200 ${bannerClass}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium leading-normal">{messageText}</span>
      </div>

      {dismissable && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={dismissText}
          title={dismissText}
          onClick={handleDismiss}
          className="h-7 w-7 shrink-0 rounded p-1 text-inherit hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}
