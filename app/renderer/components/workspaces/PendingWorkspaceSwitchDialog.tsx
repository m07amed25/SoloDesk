import * as React from "react";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { useWorkspace } from "../../contexts/WorkspaceContext.tsx";
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

export function PendingWorkspaceSwitchDialog() {
  const { t } = useLocalization();
  const {
    currentWorkspace,
    selectableWorkspaces,
    targetWorkspaceId,
    isPendingSwitchDialogOpen,
    confirmDiscardAndSwitch,
    confirmSaveAndSwitch,
    cancelSwitch,
    pendingEditors,
  } = useWorkspace();

  const [busy, setBusy] = React.useState(false);

  const targetWorkspace = React.useMemo(() => {
    return selectableWorkspaces.find((w) => w.workspaceId === targetWorkspaceId);
  }, [selectableWorkspaces, targetWorkspaceId]);

  const allCanSave = React.useMemo(() => {
    return (
      pendingEditors.length > 0 && pendingEditors.every((editor) => editor.canSave)
    );
  }, [pendingEditors]);

  const handleDiscard = async () => {
    setBusy(true);
    try {
      await confirmDiscardAndSwitch();
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await confirmSaveAndSwitch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={isPendingSwitchDialogOpen}
      onOpenChange={(open) => {
        if (!open && !busy) cancelSwitch();
      }}
    >
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("workspace.switch.title")}</DialogTitle>
          <DialogDescription>
            {t("workspace.switch.pendingChangesNotice")}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              {t("workspace.switch.current")}:
            </span>
            <span className="font-medium text-foreground">
              <BdiText>
                {currentWorkspace?.displayName || "Workspace"} (
                {currentWorkspace?.discriminator || "0000"})
              </BdiText>
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-border/50 pt-2">
            <span className="text-muted-foreground">
              {t("workspace.switch.title")}:
            </span>
            <span className="font-medium text-foreground">
              <BdiText>
                {targetWorkspace?.displayName || "Target"} (
                {targetWorkspace?.discriminator || targetWorkspaceId?.slice(-4) || "0000"})
              </BdiText>
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={cancelSwitch}
          >
            {t("workspace.switch.stay")}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handleDiscard}
            className="text-destructive hover:bg-destructive/10"
          >
            {t("workspace.switch.discardAndSwitch")}
          </Button>

          {allCanSave && (
            <Button
              type="button"
              disabled={busy}
              onClick={handleSave}
            >
              {t("workspace.switch.saveAndSwitch")}
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
