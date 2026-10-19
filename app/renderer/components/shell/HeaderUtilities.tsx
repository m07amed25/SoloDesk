import * as React from "react";
import { Briefcase, Clock, CloudOff, Bell, Languages } from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { SearchTrigger } from "./SearchTrigger.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { Button } from "../ui/button.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogCloseButton,
} from "../ui/dialog.tsx";

interface UtilityDialogState {
  title: string;
  statusText: string;
  targetPhase: string;
  description: string;
}

export function HeaderUtilities() {
  const { locale, toggleLocale, t } = useLocalization();
  const [activeDialog, setActiveDialog] =
    React.useState<UtilityDialogState | null>(null);

  const openUtilityDialog = (
    titleKey: string,
    statusKey: string,
    descKey: string,
    phase: string,
  ) => {
    setActiveDialog({
      title: t(titleKey),
      statusText: t(statusKey),
      description: t(descKey),
      targetPhase: phase,
    });
  };

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <SearchTrigger />

        <button
          type="button"
          onClick={() =>
            openUtilityDialog(
              "placeholder.workspaces.title",
              "placeholder.workspaces.status",
              "placeholder.workspaces.description",
              "F012",
            )
          }
          className="hidden xl:inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors whitespace-nowrap shrink-0"
          aria-label={t("placeholder.workspaces.title")}
        >
          <Briefcase
            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <span className="truncate max-w-[120px]">
            <BdiText>{t("placeholder.workspaces.status")}</BdiText>
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            openUtilityDialog(
              "placeholder.timer.title",
              "placeholder.timer.status",
              "placeholder.timer.description",
              "F036",
            )
          }
          className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors whitespace-nowrap shrink-0"
          aria-label={t("placeholder.timer.title")}
        >
          <Clock
            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <span className="font-mono text-[11px] whitespace-nowrap">
            <BdiText>00:00:00</BdiText>
          </span>
          <span className="hidden 2xl:inline text-[11px] text-muted-foreground whitespace-nowrap">
            <BdiText>(Inactive)</BdiText>
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            openUtilityDialog(
              "placeholder.sync.title",
              "placeholder.sync.status",
              "placeholder.sync.description",
              "F017",
            )
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors shrink-0"
          aria-label={t("placeholder.sync.title")}
          title={t("placeholder.sync.status")}
        >
          <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() =>
            openUtilityDialog(
              "placeholder.notifications.title",
              "placeholder.notifications.status",
              "placeholder.notifications.description",
              "F022",
            )
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors shrink-0"
          aria-label={t("placeholder.notifications.title")}
          title={t("placeholder.notifications.status")}
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <ThemeToggle />

        <Button
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="h-8 gap-1.5 px-2.5 text-xs whitespace-nowrap shrink-0"
          aria-label="Switch language"
        >
          <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{locale === "en" ? "العربية" : "English"}</span>
        </Button>
      </div>

      {activeDialog && (
        <Dialog
          open={true}
          onOpenChange={(open) => !open && setActiveDialog(null)}
        >
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup className="max-w-md">
              <DialogCloseButton />
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>
                    <BdiText>{activeDialog.title}</BdiText>
                  </DialogTitle>
                  <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                    {t("placeholder.phase_badge", {
                      phase: activeDialog.targetPhase,
                    })}
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">
                  <BdiText>{activeDialog.statusText}</BdiText>
                </div>
              </DialogHeader>

              <div className="mt-4 text-sm leading-relaxed text-foreground">
                <DialogDescription>
                  {activeDialog.description}
                </DialogDescription>
              </div>
            </DialogPopup>
          </DialogPortal>
        </Dialog>
      )}
    </>
  );
}
