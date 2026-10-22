import * as React from "react";
import { Check, Plus, AlertCircle, RefreshCw, Briefcase } from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { useWorkspace } from "../../contexts/WorkspaceContext.tsx";
import { Button } from "../ui/button.tsx";
import { BdiText } from "../ui/bdi-text.tsx";

export interface WorkspaceSwitcherProps {
  onOpenCreateDialog?: () => void;
  onSelectWorkspace?: (workspaceId: string) => void;
  className?: string;
}

export function WorkspaceSwitcher({
  onOpenCreateDialog,
  onSelectWorkspace,
  className = "",
}: WorkspaceSwitcherProps) {
  const { t } = useLocalization();
  const {
    state,
    currentWorkspace,
    selectableWorkspaces,
    isSwitching,
    requestSwitch,
    refresh,
  } = useWorkspace();

  const isLocked = state?.lifecycle === "locked";
  const isOnlineRequired = state?.lifecycle === "online_required";

  return (
    <div className={`space-y-4 text-start ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Briefcase
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          {t("workspace.title")}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void refresh()}
          disabled={isSwitching}
          className="h-7 px-2 text-xs text-muted-foreground"
          aria-label={t("shell.workspace.action.refresh_options")}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isSwitching ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {isSwitching && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-primary/20 bg-primary/10 p-2.5 text-xs text-primary flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>{t("workspace.switch.switching")}</span>
        </div>
      )}

      {isLocked && state?.messageKey && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground space-y-2"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {t(state.messageKey as any) ||
                t("shell.workspace.recovery.localPartitionMissing")}
            </span>
          </div>
          {state.nextActions && state.nextActions.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-2">
              {state.nextActions.includes("reconnect") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                >
                  {t("shell.workspace.action.reconnect")}
                </Button>
              )}
              {state.nextActions.includes("retry") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                >
                  {t("shell.workspace.action.retry")}
                </Button>
              )}
              {state.nextActions.includes("refresh") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                >
                  {t("shell.workspace.action.refresh")}
                </Button>
              )}
              {state.nextActions.includes("unlock") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                >
                  {t("shell.workspace.action.unlock")}
                </Button>
              )}
              {state.nextActions.includes("approved_recovery") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                >
                  {t("shell.workspace.action.approved_recovery")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {isOnlineRequired && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-2"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <BdiText>{t("shell.workspace.recovery.onlineRequired")}</BdiText>
          </div>
          <div className="pt-1 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refresh()}
              disabled={isSwitching}
            >
              {t("shell.workspace.action.reconnect")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {selectableWorkspaces.map((ws) => {
          const isSelected = currentWorkspace?.workspaceId === ws.workspaceId;
          const isSetupIncomplete = ws.readinessState === "setup_incomplete";

          return (
            <button
              key={ws.workspaceId}
              type="button"
              disabled={isSwitching || isSelected}
              onClick={async () => {
                await requestSwitch(ws.workspaceId);
                onSelectWorkspace?.(ws.workspaceId);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs text-start transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground font-medium"
                  : "border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="truncate">
                    <BdiText>{ws.displayName}</BdiText>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    <BdiText>({ws.discriminator})</BdiText>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span>{ws.defaultCurrency}</span>
                  <span>•</span>
                  <span>
                    {isSetupIncomplete
                      ? t("workspace.readiness.setupIncomplete")
                      : t("workspace.readiness.ready")}
                  </span>
                </div>
              </div>

              {isSelected && (
                <Check className="h-4 w-4 text-primary shrink-0 ml-1" />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          className="w-full text-xs flex items-center justify-center gap-1.5"
          onClick={onOpenCreateDialog}
          disabled={isSwitching}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("workspace.create.dialogTitle")}</span>
        </Button>
      </div>
    </div>
  );
}
