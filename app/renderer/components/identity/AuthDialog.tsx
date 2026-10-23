import * as React from "react";
import { AlertCircle } from "lucide-react";
import type { RendererIdentityState } from "../../../shared/identity-contracts.ts";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog.tsx";

type AuthMode = "sign_in" | "sign_up";

export function AuthDialog({
  open,
  onOpenChange,
  onReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReady: () => void | Promise<void>;
}) {
  const { t } = useLocalization();
  const [mode, setMode] = React.useState<AuthMode>("sign_in");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [deviceLabel, setDeviceLabel] = React.useState("SoloDesk device");
  const [state, setState] = React.useState<RendererIdentityState | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    void window.solodesk.identity
      .getState()
      .then((next) => active && setState(next))
      .catch(() => active && setLocalError(t("auth.error.unavailable")));
    const unsubscribe = window.solodesk.identity.onStateChanged((next) => {
      if (!active) return;
      setState(next);
      setBusy(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [open, t]);

  React.useEffect(() => {
    if (!open || state?.lifecycle !== "enrolled") return;
    void Promise.resolve(onReady()).then(() => onOpenChange(false));
  }, [onOpenChange, onReady, open, state?.lifecycle]);

  const run = async (operation: () => Promise<RendererIdentityState>) => {
    setBusy(true);
    setLocalError(null);
    try {
      const next = await operation();
      setState(next);
    } catch {
      setLocalError(t("auth.error.unavailable"));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = (event: React.FormEvent) => {
    event.preventDefault();
    void run(() =>
      mode === "sign_in"
        ? window.solodesk.identity.signInWithPassword(email, password)
        : window.solodesk.identity.signUpWithPassword(email, password),
    );
  };

  const isEnrolling = state?.lifecycle === "enrolling";
  const isWaitingForBrowser = state?.lifecycle === "signing_in";
  const needsIsolatedProfile = state?.nextActions.includes(
    "choose_isolated_profile",
  );
  const stateMessage =
    state?.messageKey === "shell.identity.invalidCredentials" ||
    state?.messageKey === "shell.identity.providerUnavailable" ||
    state?.messageKey === "shell.identity.checkEmail" ||
    state?.lifecycle === "recovery_required"
      ? t(state.messageKey)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEnrolling ? t("auth.enrollment.title") : t("auth.title")}
          </DialogTitle>
          <DialogDescription>
            {isEnrolling
              ? t("auth.enrollment.description")
              : t("auth.description")}
          </DialogDescription>
        </DialogHeader>

        {(localError || stateMessage) && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{localError ?? stateMessage}</span>
          </div>
        )}

        {isEnrolling ? (
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() =>
                window.solodesk.identity.confirmEnrollment(
                  deviceLabel.trim() || undefined,
                ),
              );
            }}
          >
            <div>
              <label
                htmlFor="auth-device-label"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                {t("auth.enrollment.deviceLabel")}
              </label>
              <input
                id="auth-device-label"
                value={deviceLabel}
                maxLength={64}
                disabled={busy}
                onChange={(event) => setDeviceLabel(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy ? t("auth.working") : t("auth.enrollment.confirm")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            {needsIsolatedProfile && (
              <Button
                type="button"
                className="mt-5 w-full"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    window.solodesk.identity.confirmAccountSwitch(),
                  )
                }
              >
                {t("shell.identity.action.chooseIsolatedProfile")}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              className={needsIsolatedProfile ? "mt-3 w-full" : "mt-5 w-full"}
              disabled={busy || isWaitingForBrowser}
              onClick={() => void run(() => window.solodesk.identity.startSignIn())}
            >
              <span aria-hidden className="font-semibold">G</span>
              {t("auth.google")}
            </Button>

            <div className="my-4 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 rounded-md bg-surface-subtle p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "sign_in" ? "default" : "ghost"}
                aria-pressed={mode === "sign_in"}
                onClick={() => setMode("sign_in")}
              >
                {t("auth.signIn")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "sign_up" ? "default" : "ghost"}
                aria-pressed={mode === "sign_up"}
                onClick={() => setMode("sign_up")}
              >
                {t("auth.signUp")}
              </Button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={submitPassword}>
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  {t("auth.email")}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                  disabled={busy || isWaitingForBrowser}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  {t("auth.password")}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  maxLength={1024}
                  disabled={busy || isWaitingForBrowser}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <DialogFooter className="pt-2">
                {isWaitingForBrowser ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void run(() => window.solodesk.identity.cancelSignIn())
                    }
                  >
                    {t("auth.cancel")}
                  </Button>
                ) : (
                  <Button type="submit" disabled={busy}>
                    {busy
                      ? t("auth.working")
                      : mode === "sign_in"
                        ? t("auth.signIn")
                        : t("auth.signUp")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}
