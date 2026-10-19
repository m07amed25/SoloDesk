import * as React from "react";
import { Search, X } from "lucide-react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useCommandPalette } from "../../contexts/CommandPaletteContext.tsx";
import { useLocalization } from "../../contexts/LocalizationContext.tsx";
import {
  filterActions,
  type CommandPaletteAction,
} from "../../lib/command-registry.ts";
import { BdiText } from "../ui/bdi-text.tsx";

export function CommandPalette() {
  const { isOpen, close, actions } = useCommandPalette();
  const { t } = useLocalization();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const filtered = React.useMemo(() => {
    return filterActions(actions, query);
  }, [actions, query]);

  // Focus input when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = React.useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    close();
  }, [close]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, handleClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex(
          (prev) => (prev - 1 + filtered.length) % filtered.length,
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        filtered[activeIndex].execute();
        handleClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const handleSelectAction = (action: CommandPaletteAction) => {
    action.execute();
    handleClose();
  };

  const activeAction = filtered[activeIndex];

  // Group by category
  const categories: Array<"navigation" | "actions" | "preferences"> = [
    "navigation",
    "actions",
    "preferences",
  ];

  return (
    <BaseDialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          onClick={handleClose}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-150 cursor-pointer"
        />
        <BaseDialog.Popup
          aria-label={t("search.placeholder")}
          className="fixed left-1/2 top-1/4 z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden focus:outline-none"
        >
          {/* Search Input Bar */}
          <div className="flex items-center border-b border-border px-4 py-3 gap-2">
            <Search
              className="h-4 w-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-controls="command-palette-results"
              aria-activedescendant={
                activeAction ? `action-${activeAction.id}` : undefined
              }
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(0);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-sm focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                aria-label={t("search.clear")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-sm focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
              aria-label={t("search.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results List */}
          <div
            id="command-palette-results"
            role="listbox"
            aria-label={t("search.available_commands")}
            className="max-h-80 overflow-y-auto p-2"
          >
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("search.no_results", { query })}
              </div>
            ) : (
              categories.map((category) => {
                const categoryActions = filtered.filter(
                  (a) => a.category === category,
                );
                if (categoryActions.length === 0) return null;

                return (
                  <div key={category} className="mb-2 last:mb-0">
                    <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(`search.category.${category}`)}
                    </div>
                    <ul role="group" className="space-y-0.5">
                      {categoryActions.map((action) => {
                        const globalIndex = filtered.indexOf(action);
                        const isSelected = globalIndex === activeIndex;

                        return (
                          <li
                            key={action.id}
                            id={`action-${action.id}`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelectAction(action)}
                            onMouseEnter={() => setActiveIndex(globalIndex)}
                            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer select-none transition-colors ${
                              isSelected
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-foreground hover:bg-surface-hover"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <BdiText>{action.titleText}</BdiText>
                            </span>
                            {action.shortcutBadge && (
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded-sm bg-surface-subtle border border-border text-muted-foreground">
                                {action.shortcutBadge}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
