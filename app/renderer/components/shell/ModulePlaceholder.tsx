import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { BdiText } from "../ui/bdi-text.tsx";
import { Info, ShieldAlert } from "lucide-react";

export interface ModulePlaceholderProps {
  moduleKey: string;
  title: string;
  statusText?: string;
  targetPhase: string;
  description?: string;
}

export function ModulePlaceholder({
  title,
  statusText,
  targetPhase,
  description,
}: ModulePlaceholderProps) {
  const { t } = useLocalization();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-border bg-surface p-8 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                <BdiText>{title}</BdiText>
              </h1>
              <span className="rounded-md bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                {t("placeholder.phase_badge", { phase: targetPhase })}
              </span>
            </div>
            {statusText && (
              <p className="mt-2 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
                <BdiText>{statusText}</BdiText>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-surface-subtle border border-border p-4 text-sm text-foreground flex items-start gap-3">
            <Info
              className="h-5 w-5 text-primary shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="leading-relaxed">
              {description || t("placeholder.unbuilt_module.notice")}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 p-4 text-xs text-muted-foreground flex items-start gap-3">
            <ShieldAlert
              className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="leading-normal">
              In accordance with Constitutional Principle I (Authorized Scope)
              and Principle IV (Exact Financial Evidence), this placeholder
              contains zero synthetic revenue, artificial records, or simulated
              cloud sync checkmarks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
