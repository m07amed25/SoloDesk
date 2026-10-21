import React, { useEffect, useState, useRef } from "react";
import { Button } from "../ui/button.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import type { RendererAccountSecurityState } from "../../../shared/identity-security-contracts.ts";

interface AccountSecurityPanelProps {
  t: (key: string) => string;
  isRtl?: boolean;
}

export function AccountSecurityPanel({
  t,
  isRtl = false,
}: AccountSecurityPanelProps) {
  const [state, setState] = useState<RendererAccountSecurityState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const api = window.identitySecurity ?? window.solodesk?.identitySecurity;
    if (!api) return;

    api
      .getState()
      .then((s) => setState(s))
      .catch(() => {});
    const unsubscribe = api.onStateChanged((s) => {
      setState(s);
      setIsLoading(false);
      // Predictable focus recovery on transition
      setTimeout(() => {
        actionButtonRef.current?.focus();
      }, 50);
    });

    return unsubscribe;
  }, []);

  const handleStart = async () => {
    const api = window.identitySecurity ?? window.solodesk?.identitySecurity;
    if (!api) return;
    setIsLoading(true);
    try {
      const s = await api.start("factor_enroll");
      setState(s);
    } catch {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    const api = window.identitySecurity ?? window.solodesk?.identitySecurity;
    if (!api) return;
    setIsLoading(true);
    try {
      const s = await api.acknowledgeRecoveryCodes();
      setState(s);
    } catch {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    const api = window.identitySecurity ?? window.solodesk?.identitySecurity;
    if (!api) return;
    setIsLoading(true);
    try {
      const s = await api.cancel();
      setState(s);
    } catch {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    const api = window.identitySecurity ?? window.solodesk?.identitySecurity;
    if (!api) return;
    setIsLoading(true);
    try {
      const s = await api.retryReconciliation();
      setState(s);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async () => {
    const api = window.identitySecurity ?? window.solodesk?.identitySecurity;
    if (!api) return;
    setIsLoading(true);
    try {
      const s = await api.start("lost_factor_recover");
      setState(s);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChallenge = async () => {
    const api = window.identitySecurity ?? window.solodesk?.identitySecurity;
    if (!api) return;
    setIsLoading(true);
    try {
      const s = await api.start("mfa_challenge");
      setState(s);
    } finally {
      setIsLoading(false);
    }
  };

  const readiness = state?.readiness ?? "factor_not_configured";
  const policyStatus = state?.policy_status ?? "optional";
  const isRateLimited =
    state?.message_key === "identity.security.status.rate_limited";
  const isExpired =
    state?.message_key === "identity.security.status.challenge_expired";

  return (
    <div
      className="p-6 max-w-xl mx-auto space-y-6 bg-card text-card-foreground border rounded-lg shadow-sm"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("identity.security.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {policyStatus === "required"
            ? t("identity.security.policy.required")
            : t("identity.security.policy.optional")}
        </p>
      </div>

      <div
        className="p-4 rounded-md border text-sm"
        role="status"
        aria-live="polite"
      >
        <p className="font-medium">
          {state?.message_key
            ? t(state.message_key)
            : t("identity.security.status.not_configured")}
        </p>

        {state?.diagnostic_reference && (
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            <BdiText>{state.diagnostic_reference}</BdiText>
          </p>
        )}
      </div>

      {isRateLimited && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-medium">
          <p>{t("identity.security.status.rate_limited")}</p>
        </div>
      )}

      {isExpired && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-medium">
          <p>{t("identity.security.status.challenge_expired")}</p>
        </div>
      )}

      {readiness === "recovery_codes_pending" && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-md text-sm">
          <p>{t("identity.security.recovery_codes.confined_warning")}</p>
        </div>
      )}

      {readiness === "ready" && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-800 dark:text-green-300 rounded-md text-sm font-medium">
          <p>{t("identity.security.status.ready")}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        {readiness === "factor_not_configured" && !state?.action_key && (
          <Button
            ref={actionButtonRef}
            onClick={handleStart}
            disabled={isLoading}
          >
            {t("identity.security.action.enroll_factor")}
          </Button>
        )}

        {readiness === "recovery_codes_pending" && (
          <>
            <Button
              ref={actionButtonRef}
              onClick={handleAcknowledge}
              disabled={isLoading}
            >
              {t("identity.security.action.acknowledge_recovery_codes")}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {t("identity.security.action.cancel")}
            </Button>
          </>
        )}

        {state?.action_key === "identity.security.action.enroll_factor" &&
          readiness !== "recovery_codes_pending" && (
            <Button
              ref={actionButtonRef}
              onClick={handleStart}
              disabled={isLoading}
            >
              {t("identity.security.action.enroll_factor")}
            </Button>
          )}

        {state?.action_key === "identity.security.action.open_challenge" && (
          <>
            <Button
              ref={actionButtonRef}
              onClick={handleChallenge}
              disabled={isLoading}
            >
              {t("identity.security.action.open_challenge")}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {t("identity.security.action.cancel")}
            </Button>
          </>
        )}

        {state?.action_key === "identity.security.action.retry" && (
          <Button
            ref={actionButtonRef}
            onClick={handleRetry}
            disabled={isLoading}
          >
            {t("identity.security.action.retry")}
          </Button>
        )}

        {state?.action_key === "identity.security.action.recover" && (
          <Button
            ref={actionButtonRef}
            onClick={handleRecover}
            disabled={isLoading}
          >
            {t("identity.security.action.recover")}
          </Button>
        )}

        {state?.action_key === "identity.security.action.unlock_local" && (
          <Button
            ref={actionButtonRef}
            onClick={handleRetry}
            disabled={isLoading}
          >
            {t("identity.security.action.unlock_local")}
          </Button>
        )}

        {state?.action_key ===
          "identity.security.action.revalidate_workspace" && (
          <Button
            ref={actionButtonRef}
            onClick={handleRetry}
            disabled={isLoading}
          >
            {t("identity.security.action.revalidate_workspace")}
          </Button>
        )}

        {state?.action_key === "identity.security.action.reauthenticate" && (
          <Button
            ref={actionButtonRef}
            onClick={handleChallenge}
            disabled={isLoading}
          >
            {t("identity.security.action.reauthenticate")}
          </Button>
        )}

        {state?.action_key === "identity.security.action.confirm_change" && (
          <Button
            ref={actionButtonRef}
            onClick={handleRetry}
            disabled={isLoading}
          >
            {t("identity.security.action.confirm_change")}
          </Button>
        )}
      </div>
    </div>
  );
}
