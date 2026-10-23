/* oxlint-disable react/set-state-in-effect */
import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  RotateCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { useOptionalWorkspace } from "../../contexts/WorkspaceContext.tsx";
import { Button } from "../ui/button.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog.tsx";
import { bridge } from "../../lib/bridge.ts";
import type {
  SafeInvitationSummary,
  InvitationLifecycle,
  DeliveryOutcome,
} from "../../../shared/invitation-contracts.ts";

export interface InvitationStatusListProps {
  className?: string;
  onInviteClick?: () => void;
}

export function InvitationStatusList({
  className = "",
  onInviteClick,
}: InvitationStatusListProps) {
  const { t } = useLocalization();
  const workspaceContext = useOptionalWorkspace();
  const activeWorkspace = workspaceContext?.currentWorkspace;
  const currentEnvelope = workspaceContext?.envelope;
  const isOffline =
    !activeWorkspace ||
    workspaceContext?.state?.lifecycle === "online_required";

  const [items, setItems] = React.useState<readonly SafeInvitationSummary[]>(
    [],
  );
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>(
    undefined,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [busyActionId, setBusyActionId] = React.useState<string | null>(null);

  // Confirmation dialog states
  const [resendTarget, setResendTarget] =
    React.useState<SafeInvitationSummary | null>(null);
  const [revokeTarget, setRevokeTarget] =
    React.useState<SafeInvitationSummary | null>(null);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  // Focus preservation reference
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  const lastActiveElementRef = React.useRef<HTMLElement | null>(null);

  const fetchInvitations = React.useCallback(async () => {
    if (!activeWorkspace) {
      queueMicrotask(() => {
        setItems([]);
        setNextCursor(undefined);
      });
      return;
    }
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    try {
      const envelope = currentEnvelope ?? {
        workspaceId: activeWorkspace.workspaceId,
        generation: activeWorkspace.authorityVersion ?? 1,
      };
      const result = await bridge.invitation.list({
        envelope,
        payload: { pageSize: 20 },
      });
      if (result && result.ok) {
        setItems(result.items);
        setNextCursor(result.nextCursor);
      } else if (result && !result.ok) {
        if (result.code === "online_required") {
          setError(t("invitation.error.onlineRequired"));
        } else if (result.code === "not_authorized") {
          setError(t("invitation.error.notAuthorized"));
        } else if (result.code === "stale_state") {
          setError(t("invitation.error.staleState"));
        } else {
          setError(t("invitation.error.temporarilyUnavailable"));
        }
      } else {
        setError(t("invitation.error.outcomeUnknown"));
      }
    } catch {
      setError(t("invitation.error.outcomeUnknown"));
    } finally {
      setLoading(false);
      // Restore focus if appropriate
      if (
        lastActiveElementRef.current &&
        document.contains(lastActiveElementRef.current)
      ) {
        lastActiveElementRef.current.focus();
      }
    }
  }, [activeWorkspace, currentEnvelope, t]);

  const fetchNextPage = React.useCallback(async () => {
    if (!activeWorkspace || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const envelope = currentEnvelope ?? {
        workspaceId: activeWorkspace.workspaceId,
        generation: activeWorkspace.authorityVersion ?? 1,
      };
      const result = await bridge.invitation.list({
        envelope,
        payload: { pageSize: 20, cursor: nextCursor },
      });
      if (result && result.ok) {
        setItems((prev) => [...prev, ...result.items]);
        setNextCursor(result.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeWorkspace, currentEnvelope, nextCursor, loadingMore]);

  React.useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const handleOpenResendConfirm = (item: SafeInvitationSummary) => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    setResendTarget(item);
    setConfirmError(null);
  };

  const handleOpenRevokeConfirm = (item: SafeInvitationSummary) => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    setRevokeTarget(item);
    setConfirmError(null);
  };

  const handleExecuteResend = async () => {
    if (!resendTarget || !activeWorkspace) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      const envelope = currentEnvelope ?? {
        workspaceId: activeWorkspace.workspaceId,
        generation: activeWorkspace.authorityVersion ?? 1,
      };
      const operationId = crypto.randomUUID();
      const result = await bridge.invitation.resend({
        envelope,
        payload: {
          operationId,
          invitationId: resendTarget.invitationId,
          expectedRevision: resendTarget.revision,
        },
      });

      if (result && result.ok) {
        setResendTarget(null);
        await fetchInvitations();
      } else if (result && !result.ok) {
        if (result.code === "stale_state") {
          setConfirmError(t("invitation.error.staleState"));
        } else if (result.code === "online_required") {
          setConfirmError(t("invitation.error.onlineRequired"));
        } else {
          setConfirmError(t("invitation.error.outcomeUnknown"));
        }
      } else {
        setConfirmError(t("invitation.error.outcomeUnknown"));
      }
    } catch {
      setConfirmError(t("invitation.error.outcomeUnknown"));
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleExecuteRevoke = async () => {
    if (!revokeTarget || !activeWorkspace) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      const envelope = currentEnvelope ?? {
        workspaceId: activeWorkspace.workspaceId,
        generation: activeWorkspace.authorityVersion ?? 1,
      };
      const operationId = crypto.randomUUID();
      const result = await bridge.invitation.revoke({
        envelope,
        payload: {
          operationId,
          invitationId: revokeTarget.invitationId,
          expectedRevision: revokeTarget.revision,
        },
      });

      if (result && result.ok) {
        setRevokeTarget(null);
        await fetchInvitations();
      } else if (result && !result.ok) {
        if (result.code === "stale_state") {
          setConfirmError(t("invitation.error.staleState"));
        } else if (result.code === "online_required") {
          setConfirmError(t("invitation.error.onlineRequired"));
        } else {
          setConfirmError(t("invitation.error.outcomeUnknown"));
        }
      } else {
        setConfirmError(t("invitation.error.outcomeUnknown"));
      }
    } catch {
      setConfirmError(t("invitation.error.outcomeUnknown"));
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleReconcileItem = async (item: SafeInvitationSummary) => {
    if (!activeWorkspace) return;
    setBusyActionId(item.invitationId);
    try {
      await fetchInvitations();
    } finally {
      setBusyActionId(null);
    }
  };

  const renderLifecycleBadge = (lifecycle: InvitationLifecycle) => {
    switch (lifecycle) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Pending</span>
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Accepted</span>
          </span>
        );
      case "revoked":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Revoked</span>
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Expired</span>
          </span>
        );
      case "superseded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Superseded</span>
          </span>
        );
      default:
        return null;
    }
  };

  const renderDeliveryBadge = (delivery: DeliveryOutcome) => {
    switch (delivery) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("invitation.status.delivered")}</span>
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("invitation.status.queued")}</span>
          </span>
        );
      case "provider_accepted":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("invitation.status.queued")}</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-rose-700 dark:text-rose-400 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("invitation.status.failed")}</span>
          </span>
        );
      case "bounced":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-rose-700 dark:text-rose-400 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("invitation.status.bounced")}</span>
          </span>
        );
      case "delayed":
      case "rate_limited":
      case "unknown":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("invitation.status.unknown")}</span>
          </span>
        );
    }
  };

  return (
    <div
      ref={listContainerRef}
      className={`w-full flex flex-col gap-4 text-foreground ${className}`}
      role="region"
      aria-label="Workspace Invitations"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2
              id="invitations-heading"
              className="text-base font-semibold text-foreground"
            >
              Workspace Invitations
            </h2>
            {isOffline && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Offline — Actions Disabled
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage active workspace member invitations and track delivery
            status.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvitations}
            disabled={loading || isOffline}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label={t("invitation.action.refresh")}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{t("invitation.action.refresh")}</span>
          </Button>
          {onInviteClick && (
            <Button
              size="sm"
              onClick={onInviteClick}
              disabled={isOffline}
              className="text-xs"
            >
              {t("invitation.submit")}
            </Button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
            <span className="font-medium text-xs sm:text-sm">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvitations}
            className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
          >
            {t("invitation.action.retry")}
          </Button>
        </div>
      )}

      {/* Main List */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm" role="table">
          <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
            <tr>
              <th scope="col" className="px-4 py-3">
                {t("invitation.recipientLabel")}
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Delivery
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-normal">
            {items.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  <Mail
                    className="w-7 h-7 mx-auto mb-2 opacity-30"
                    aria-hidden="true"
                  />
                  <div className="font-medium text-foreground text-sm">
                    No invitations recorded.
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Click "{t("invitation.submit")}" to invite members to this
                    workspace.
                  </div>
                </td>
              </tr>
            )}
            {loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  <div className="text-sm">Loading invitations...</div>
                </td>
              </tr>
            )}
            {items.map((item) => {
              const canResend =
                item.availableActions.includes("resend") && !isOffline;
              const canRevoke =
                item.availableActions.includes("revoke") && !isOffline;
              const hasDeliveryIssue =
                item.deliveryOutcome === "failed" ||
                item.deliveryOutcome === "unknown" ||
                item.deliveryOutcome === "bounced";

              return (
                <tr
                  key={item.invitationId}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      <BdiText>{item.recipientLabel}</BdiText>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.roleLabelKey && t(item.roleLabelKey as any)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {renderLifecycleBadge(item.lifecycle)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      {renderDeliveryBadge(item.deliveryOutcome)}
                      {hasDeliveryIssue && (
                        <button
                          type="button"
                          onClick={() => handleReconcileItem(item)}
                          disabled={
                            isOffline || busyActionId === item.invitationId
                          }
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 font-medium"
                          aria-label={t("invitation.action.reconcile")}
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${busyActionId === item.invitationId ? "animate-spin" : ""}`}
                          />
                          <span>{t("invitation.action.reconcile")}</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canResend && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResendConfirm(item)}
                          className="h-8 text-xs gap-1"
                          aria-label={t("invitation.action.resend")}
                        >
                          <Send className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t("invitation.action.resend")}</span>
                        </Button>
                      )}
                      {canRevoke && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRevokeConfirm(item)}
                          className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          aria-label={t("invitation.action.revoke")}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t("invitation.action.revoke")}</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {nextCursor && (
          <div className="flex justify-center p-3 border-t border-border bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNextPage}
              disabled={loadingMore || isOffline}
              className="text-xs"
            >
              {loadingMore ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : null}
              <span>Load More</span>
            </Button>
          </div>
        )}
      </div>

      {/* Resend Confirmation Dialog */}
      <Dialog
        open={Boolean(resendTarget)}
        onOpenChange={(open) => !open && setResendTarget(null)}
      >
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCw className="w-5 h-5 text-primary" />
              <span>{t("invitation.action.resend")}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("invitation.action.resendNotice")}
            </DialogDescription>
          </DialogHeader>

          {resendTarget && (
            <div className="py-3 text-sm rounded-md bg-muted/40 p-3 border border-border my-2">
              <p className="font-semibold text-foreground">
                <BdiText>{resendTarget.recipientLabel}</BdiText>
              </p>
            </div>
          )}

          {confirmError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 my-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{confirmError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResendTarget(null)}
              disabled={confirmBusy}
            >
              {t("invitation.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteResend}
              disabled={confirmBusy}
              className="gap-1.5"
            >
              {confirmBusy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{t("invitation.action.resend")}</span>
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span>{t("invitation.action.revoke")}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("invitation.action.revokeNotice")}
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="py-3 text-sm rounded-md bg-muted/40 p-3 border border-border my-2">
              <p className="font-semibold text-foreground">
                <BdiText>{revokeTarget.recipientLabel}</BdiText>
              </p>
            </div>
          )}

          {confirmError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 my-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{confirmError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevokeTarget(null)}
              disabled={confirmBusy}
            >
              {t("invitation.cancel")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleExecuteRevoke}
              disabled={confirmBusy}
              className="gap-1.5"
            >
              {confirmBusy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{t("invitation.action.confirmRevoke")}</span>
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
