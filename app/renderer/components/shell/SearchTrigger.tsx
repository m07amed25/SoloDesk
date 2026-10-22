import * as React from "react";
import { Search } from "lucide-react";
import { useCommandPalette } from "../../contexts/CommandPaletteContext.tsx";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import { getCommandPaletteShortcutText } from "../../lib/shortcuts.ts";

export function SearchTrigger() {
  const { toggle } = useCommandPalette();
  const { t } = useLocalization();
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  const shortcutText = getCommandPaletteShortcutText();

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => toggle(buttonRef.current)}
      aria-label={t("search.placeholder")}
      className="flex h-8 w-8 sm:w-36 md:w-44 lg:w-56 max-w-[240px] items-center justify-center sm:justify-between rounded-md border border-border bg-surface p-0 sm:px-2.5 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer transition-colors whitespace-nowrap shrink-0 sm:shrink"
    >
      <span className="flex items-center gap-2 truncate">
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline truncate">{t("search.trigger")}</span>
      </span>
      <kbd className="hidden md:inline-flex h-5 items-center rounded-sm border border-border bg-surface-subtle px-1.5 font-mono text-[10px] text-muted-foreground shrink-0">
        {shortcutText}
      </kbd>
    </button>
  );
}
