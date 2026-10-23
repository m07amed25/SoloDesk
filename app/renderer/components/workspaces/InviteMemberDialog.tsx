/* oxlint-disable react/set-state-in-effect */
import * as React from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { useOptionalWorkspace } from "../../contexts/WorkspaceContext.tsx";
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
import { bridge } from "../../lib/bridge.ts";
import {
  normalizeAndValidateRecipientEmail,
  type GetInvitationPolicyResult,
  type SafeInvitationSummary,
  INVITATION_BOUNDS,
} from "../../../shared/invitation-contracts.ts";

export interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (summary: SafeInvitationSummary) => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: InviteMemberDialogProps) {
  const { t } = useLocalization();
  const workspaceContext = useOptionalWorkspace();
  const activeWorkspace = workspaceContext?.currentWorkspace;
  const currentEnvelope = workspaceContext?.envelope;

  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [selectedOfferRef, setSelectedOfferRef] = React.useState<string>("");
  const [policy, setPolicy] = React.useState<GetInvitationPolicyResult | null>(
    null,
  );
  const [loadingPolicy, setLoadingPolicy] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastOperationId, setLastOperationId] = React.useState<string | null>(
    null,
  );
  const [createdSummary, setCreatedSummary] =
    React.useState<SafeInvitationSummary | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Fetch invitation policy whenever dialog opens or active workspace changes
  const fetchPolicy = React.useCallback(async () => {
    if (!open || !activeWorkspace) return;
    queueMicrotask(() => {
      setLoadingPolicy(true);
      setError(null);
    });
    try {
      const envelope = currentEnvelope ?? {
        workspaceId: activeWorkspace.workspaceId,
        generation: activeWorkspace.authorityVersion ?? 1,
      };
      const res = await bridge.invitation.getPolicy(envelope);
      if (res && res.ok) {
        setPolicy(res);
        if (res.offers.length > 0 && !selectedOfferRef) {
          setSelectedOfferRef(res.offers[0].offerRef);
        }
      } else if (res && !res.ok) {
        setPolicy(res);
        setError(
          t(`invitation.error.${res.code}` as any) ||
            t("invitation.error.policyUnavailable"),
        );
      } else {
        setError(t("invitation.error.temporarilyUnavailable"));
      }
    } catch {
      setError(t("invitation.error.temporarilyUnavailable"));
    } finally {
      setLoadingPolicy(false);
    }
  }, [open, activeWorkspace, currentEnvelope, selectedOfferRef, t]);

  React.useEffect(() => {
    if (open) {
      void fetchPolicy();
    } else {
      queueMicrotask(() => {
        setCreatedSummary(null);
        setError(null);
        setBusy(false);
      });
    }
  }, [open, fetchPolicy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    if (!policy || !policy.ok || !policy.canInvite) {
      setError(t("invitation.error.policyUnavailable"));
      return;
    }

    const emailCheck = normalizeAndValidateRecipientEmail(recipientEmail);
    if (!emailCheck.ok) {
      setError(t("invitation.error.invalidEmail"));
      return;
    }

    if (!selectedOfferRef) {
      setError(t("invitation.error.policyUnavailable"));
      return;
    }

    setError(null);
    setBusy(true);

    const operationId = globalThis.crypto.randomUUID();
    setLastOperationId(operationId);

    try {
      const envelope = currentEnvelope ?? {
        workspaceId: activeWorkspace.workspaceId,
        generation: activeWorkspace.authorityVersion ?? 1,
      };
      const payload = {
        operationId,
        recipient: { kind: "email", value: emailCheck.email },
        offerRef: selectedOfferRef,
        policyRevision: policy.policyRevision,
      };

      const result = await bridge.invitation.create({
        envelope,
        payload,
      });

      if (result && result.ok) {
        setCreatedSummary(result.invitation);
        onCreated?.(result.invitation);
      } else if (result && !result.ok) {
        if (result.code === "recipient_already_member") {
          setError(t("invitation.error.alreadyMember"));
        } else if (result.code === "invitation_already_pending") {
          setError(t("invitation.error.alreadyPending"));
        } else if (result.code === "online_required") {
          setError(t("invitation.error.onlineRequired"));
        } else if (result.code === "not_authorized") {
          setError(t("invitation.error.notAuthorized"));
        } else if (result.code === "stale_state") {
          setError(t("invitation.error.staleState"));
        } else if (result.code === "outcome_unknown") {
          setError(t("invitation.error.outcomeUnknown"));
        } else {
          setError(t("invitation.error.temporarilyUnavailable"));
        }
      } else {
        setError(t("invitation.error.outcomeUnknown"));
      }
    } catch {
      setError(t("invitation.error.outcomeUnknown"));
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async () => {
    if (!lastOperationId || !activeWorkspace) return;
    setBusy(true);
    setError(null);
    try {
      const envelope = currentEnvelope ?? {
        workspaceId: activeWorkspace.workspaceId,
        generation: activeWorkspace.authorityVersion ?? 1,
      };
      const result = await bridge.invitation.reconcile({
        envelope,
        payload: { operationId: lastOperationId },
      });
      if (result && result.ok) {
        if (result.outcome === "committed" && result.invitation) {
          setCreatedSummary(result.invitation);
          onCreated?.(result.invitation);
        } else if (result.outcome === "not_committed") {
          setError(t("invitation.error.temporarilyUnavailable"));
        } else {
          setError(t("invitation.error.outcomeUnknown"));
        }
      } else {
        setError(t("invitation.error.outcomeUnknown"));
      }
    } catch {
      setError(t("invitation.error.outcomeUnknown"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invitation.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("invitation.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        {createdSummary ? (
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{t("invitation.success")}</div>
                <div className="text-xs leading-relaxed">
                  {t("invitation.successNotice")}
                </div>
              </div>
            </div>

            <div className="text-sm border rounded-md p-3 space-y-2 bg-muted/40">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invitation.workspaceLabel")}:
                </span>
                <span className="font-medium">
                  <BdiText>{activeWorkspace?.displayName ?? ""}</BdiText>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invitation.recipientLabel")}:
                </span>
                <span className="font-medium">
                  <BdiText>{createdSummary.recipientLabel}</BdiText>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invitation.expiryLabel")}:
                </span>
                <span className="font-medium">
                  {t("invitation.expiry.sevenDays")}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("invitation.cancel")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div>{error}</div>
                  {lastOperationId &&
                    error === t("invitation.error.outcomeUnknown") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 h-7 text-xs"
                        onClick={() => void handleReconcile()}
                        disabled={busy}
                      >
                        <RefreshCw className="w-3 h-3 me-1" />
                        {t("invitation.action.reconcile")}
                      </Button>
                    )}
                </div>
              </div>
            )}

            {/* Current Workspace (Read-only truthful context) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("invitation.workspaceLabel")}
              </label>
              <div className="px-3 py-2 rounded-md bg-muted text-sm font-medium">
                <BdiText>{activeWorkspace?.displayName ?? ""}</BdiText>
              </div>
            </div>

            {/* Recipient Email */}
            <div className="space-y-1">
              <label
                htmlFor="invitation-recipient"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("invitation.recipientLabel")}
              </label>
              <input
                ref={inputRef}
                id="invitation-recipient"
                type="email"
                required
                maxLength={INVITATION_BOUNDS.maxRecipientLength}
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={t("invitation.recipientPlaceholder")}
                disabled={busy || loadingPolicy}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Approved Access Offers */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                {t("invitation.offerLabel")}
              </label>
              {loadingPolicy ? (
                <div className="text-xs text-muted-foreground p-3 border rounded-md">
                  {t("invitation.submitting")}
                </div>
              ) : policy && policy.ok && policy.offers.length > 0 ? (
                <div className="space-y-2">
                  {policy.offers.map((offer) => (
                    <label
                      key={offer.offerRef}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedOfferRef === offer.offerRef
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="offerRef"
                        value={offer.offerRef}
                        checked={selectedOfferRef === offer.offerRef}
                        onChange={() => setSelectedOfferRef(offer.offerRef)}
                        disabled={busy}
                        className="mt-1"
                      />
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold text-foreground">
                          {t(`invitation.offer.${offer.offerRef}`) ||
                            t(
                              `invitation.offer.${offer.offerRef === "member_standard" ? "memberStandard" : "readOnly"}` as any,
                            ) ||
                            offer.offerRef}
                        </div>
                        <div className="text-muted-foreground">
                          {t(offer.consequenceLabelKey as any) ||
                            (offer.offerRef === "read_only"
                              ? t("invitation.consequence.readOnly")
                              : t("invitation.consequence.memberStandard"))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-destructive p-3 border rounded-md">
                  {t("invitation.error.policyUnavailable")}
                </div>
              )}
            </div>

            {/* Expiry & Truthful Consequence Notice */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-md border space-y-1">
              <div className="font-medium text-foreground">
                {t("invitation.expiryLabel")}:{" "}
                {t("invitation.expiry.sevenDays")}
              </div>
              <p>{t("invitation.consequenceNotice")}</p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                {t("invitation.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  busy || loadingPolicy || !policy?.ok || !policy?.canInvite
                }
              >
                {busy ? t("invitation.submitting") : t("invitation.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogPopup>
    </Dialog>
  );
}
