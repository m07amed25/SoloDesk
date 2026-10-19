import * as React from "react";
import type { PersistenceStatusDto } from "../../shared/persistence-contracts.ts";
import { Button } from "../components/ui/button.tsx";
import { wrappedFocusIndex } from "./recovery-focus.ts";

type Locale = "en" | "ar";
type Props = Readonly<{
  state: PersistenceStatusDto;
  locale: Locale;
  busy: boolean;
  onRetry: () => void;
  onQuit: () => void;
}>;

const copy = {
  en: {
    synced: "Cloud-synced records can be downloaded again after you reconnect.",
    unsynced: "Unsynced local drafts may exist only on this device. Keep this storage and any verified backup until recovery is complete.",
    unverified: "SoloDesk cannot yet verify whether every unsynced edit is intact.",
    retained: "Unsynced local work remains in the protected store.",
    retry: "Try again",
    quit: "Quit SoloDesk",
    working: "Checking storage…",
  },
  ar: {
    synced: "يمكن تنزيل السجلات المتزامنة مع السحابة مجدداً بعد الاتصال.",
    unsynced: "قد تكون المسودات المحلية غير المتزامنة موجودة على هذا الجهاز فقط. احتفظ بالتخزين وأي نسخة احتياطية موثوقة حتى تكتمل الاستعادة.",
    unverified: "لا يستطيع SoloDesk بعد التحقق من سلامة جميع التعديلات غير المتزامنة.",
    retained: "لا يزال العمل المحلي غير المتزامن محفوظاً في المخزن المحمي.",
    retry: "أعد المحاولة",
    quit: "إنهاء SoloDesk",
    working: "جارٍ فحص التخزين…",
  },
} as const;

export function PersistenceRecoveryModal({ state, locale, busy, onRetry, onQuit }: Props) {
  const details = state.recoveryDetails;
  const dialog = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!details) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, [details]);
  if (state.status !== "recovery_required" || !details) return null;
  const labels = copy[locale];
  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    if (buttons.length === 0) { event.preventDefault(); return; }
    const current = buttons.findIndex((button) => button === document.activeElement);
    const next = wrappedFocusIndex(current, buttons.length, event.shiftKey);
    if (next !== null) { event.preventDefault(); buttons[next]?.focus(); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <div ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="persistence-recovery-title" aria-describedby="persistence-recovery-description" onKeyDown={trapFocus}
        className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 text-foreground shadow-xl">
        <h2 id="persistence-recovery-title" className="text-xl font-semibold">{details.localizedTitle[locale]}</h2>
        <div id="persistence-recovery-description" className="mt-3 space-y-3 text-sm leading-relaxed">
          <p>{details.localizedMessage[locale]}</p>
          <p>{details.localizedGuidance[locale]}</p>
          <p>{labels.synced}</p>
          <p className="font-medium">{labels.unsynced}</p>
          <p>{details.unsyncedWorkRetained ? labels.retained : labels.unverified}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {details.permittedActions.includes("retry") &&
            <Button type="button" disabled={busy} onClick={onRetry}>{busy ? labels.working : labels.retry}</Button>}
          {details.permittedActions.includes("quit") &&
            <Button type="button" variant="outline" onClick={onQuit}>{labels.quit}</Button>}
        </div>
      </div>
    </div>
  );
}
