import * as React from "react";
import { AlertCircle } from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import {
  validateDisplayName,
  type WorkspaceCreationPolicySafe,
  type WorkspaceCreationResult,
} from "../../../shared/workspace-contracts.ts";

export interface WorkspaceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: WorkspaceCreationPolicySafe;
  onCreated?: (result: WorkspaceCreationResult) => void;
}

export function WorkspaceCreateDialog({
  open,
  onOpenChange,
  policy,
  onCreated,
}: WorkspaceCreateDialogProps) {
  const { t, locale } = useLocalization();

  const [displayName, setDisplayName] = React.useState("");
  const [legalName, setLegalName] = React.useState("");
  const [tradeName, setTradeName] = React.useState("");
  const [defaultTimezone, setDefaultTimezone] = React.useState("UTC");
  const [selectedCurrency, setSelectedCurrency] = React.useState<string | null>(
    null,
  );
  const [defaultLocale, setDefaultLocale] = React.useState<"en" | "ar">(
    locale === "ar" ? "ar" : "en",
  );

  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pendingIntentId, setPendingIntentId] = React.useState<string | null>(
    null,
  );

  const isPolicyDisabled = !policy?.enabled;

  const allowedCurrencies = React.useMemo(() => {
    if (policy?.currencyCodes && policy.currencyCodes.length > 0) {
      return policy.currencyCodes;
    }
    return [];
  }, [policy]);

  const defaultCurrency =
    selectedCurrency && allowedCurrencies.includes(selectedCurrency)
      ? selectedCurrency
      : (allowedCurrencies[0] ?? "");

  const displayedError =
    error ??
    (isPolicyDisabled ? t("workspace.create.error.policyDisabled") : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPolicyDisabled) {
      setError(t("workspace.create.error.policyDisabled"));
      return;
    }

    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.valid) {
      if (nameValidation.error?.includes("between 1 and 120")) {
        setError(
          nameValidation.trimmed.length === 0
            ? t("workspace.create.error.nameRequired")
            : t("workspace.create.error.nameTooLong"),
        );
      } else {
        setError(t("workspace.create.error.nameRequired"));
      }
      return;
    }

    if (!allowedCurrencies.includes(defaultCurrency.toUpperCase())) {
      setError(t("workspace.create.error.invalidCurrency"));
      return;
    }

    setError(null);
    setBusy(true);

    try {
      const intentId = pendingIntentId ?? crypto.randomUUID();
      setPendingIntentId(intentId);

      const requestPayload = {
        profile: {
          displayName: nameValidation.trimmed,
          legalName: legalName.trim() || undefined,
          tradeName: tradeName.trim() || undefined,
          defaultTimezone,
          defaultCurrency: defaultCurrency.toUpperCase(),
          defaultLocale,
          profileVersion: 1 as const,
          creationPolicyVersion: policy!.policyVersion,
        },
        intentId,
      };

      const result = await window.solodesk.workspace?.create(requestPayload);

      if (!result) {
        setError(t("shell.workspace.recovery.serviceUnavailable"));
        return;
      }

      if (result.status === "committed") {
        setDisplayName("");
        setLegalName("");
        setTradeName("");
        setPendingIntentId(null);
        onOpenChange(false);
        onCreated?.(result);
      } else if (result.status === "rejected") {
        setError(
          t(`shell.workspace.rejection.${result.code}`) ||
            t("shell.workspace.rejection.validation"),
        );
      } else {
        // outcome_unknown
        setError(t("shell.workspace.recovery.outcomeUnknown"));
      }
    } catch {
      setError(t("shell.workspace.recovery.serviceUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async () => {
    if (!pendingIntentId) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        await window.solodesk.workspace?.reconcileCreation(pendingIntentId);
      if (result?.status === "committed") {
        setDisplayName("");
        setLegalName("");
        setTradeName("");
        setPendingIntentId(null);
        onOpenChange(false);
        onCreated?.(result);
      } else if (result?.status === "rejected") {
        setError(t(`shell.workspace.rejection.${result.code}`));
      } else {
        setError(t("shell.workspace.recovery.outcomeUnknown"));
      }
    } catch {
      setError(t("shell.workspace.recovery.serviceUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("workspace.create.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("workspace.create.incompleteReadinessNotice")}
            </DialogDescription>
          </DialogHeader>

          {displayedError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm leading-5 text-destructive"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <BdiText className="min-w-0">{displayedError}</BdiText>
            </div>
          )}

          <div className="space-y-3 text-start">
            <div>
              <label
                htmlFor="ws-display-name"
                className="block text-xs font-medium text-foreground mb-1"
              >
                {t("workspace.create.displayNameLabel")} *
              </label>
              <input
                id="ws-display-name"
                type="text"
                autoFocus
                disabled={busy || isPolicyDisabled}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("workspace.create.displayNamePlaceholder")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={120}
                required
              />
            </div>

            <div>
              <label
                htmlFor="ws-legal-name"
                className="block text-xs font-medium text-foreground mb-1"
              >
                {t("workspace.create.legalNameLabel")}
              </label>
              <input
                id="ws-legal-name"
                type="text"
                disabled={busy || isPolicyDisabled}
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder={t("workspace.create.legalNamePlaceholder")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={200}
              />
            </div>

            <div>
              <label
                htmlFor="ws-trade-name"
                className="block text-xs font-medium text-foreground mb-1"
              >
                {t("workspace.create.tradeNameLabel")}
              </label>
              <input
                id="ws-trade-name"
                type="text"
                disabled={busy || isPolicyDisabled}
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder={t("workspace.create.tradeNamePlaceholder")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ws-currency"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  {t("workspace.create.currencyLabel")}
                </label>
                <select
                  id="ws-currency"
                  disabled={busy || isPolicyDisabled}
                  value={defaultCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {allowedCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ws-locale"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  {t("workspace.create.localeLabel")}
                </label>
                <select
                  id="ws-locale"
                  disabled={busy || isPolicyDisabled}
                  value={defaultLocale}
                  onChange={(e) =>
                    setDefaultLocale(e.target.value as "en" | "ar")
                  }
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="en">English (en)</option>
                  <option value="ar">العربية (ar)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="ws-timezone"
                className="block text-xs font-medium text-foreground mb-1"
              >
                {t("workspace.create.timezoneLabel")}
              </label>
              <input
                id="ws-timezone"
                type="text"
                disabled={busy || isPolicyDisabled}
                value={defaultTimezone}
                onChange={(e) => setDefaultTimezone(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            {pendingIntentId ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleReconcile}
              >
                {t("shell.workspace.action.reconcileCreation")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {t("workspace.create.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={busy || isPolicyDisabled}
              className="min-w-28"
            >
              {busy
                ? t("workspace.create.creating")
                : t("workspace.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
