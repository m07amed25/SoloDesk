import * as React from "react";
import type { CommandPaletteAction } from "../lib/command-registry.ts";

export interface CommandPaletteContextValue {
  isOpen: boolean;
  open: (triggerElement?: HTMLElement | null) => void;
  close: () => void;
  toggle: (triggerElement?: HTMLElement | null) => void;
  registerAction: (action: CommandPaletteAction) => () => void;
  actions: readonly CommandPaletteAction[];
}

const CommandPaletteContext = React.createContext<
  CommandPaletteContextValue | undefined
>(undefined);

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [actions, setActions] = React.useState<readonly CommandPaletteAction[]>(
    [],
  );
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const open = React.useCallback((triggerElement?: HTMLElement | null) => {
    if (triggerElement) {
      triggerRef.current = triggerElement;
    } else if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      triggerRef.current = document.activeElement;
    }
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    // Focus restoration to trigger element
    if (triggerRef.current && typeof triggerRef.current.focus === "function") {
      setTimeout(() => {
        triggerRef.current?.focus();
        triggerRef.current = null;
      }, 0);
    }
  }, []);

  const toggle = React.useCallback(
    (triggerElement?: HTMLElement | null) => {
      if (isOpen) {
        close();
      } else {
        open(triggerElement);
      }
    },
    [isOpen, open, close],
  );

  const registerAction = React.useCallback((action: CommandPaletteAction) => {
    setActions((prev) => {
      // Avoid duplicates
      const filtered = prev.filter((a) => a.id !== action.id);
      return [...filtered, action];
    });

    return () => {
      setActions((prev) => prev.filter((a) => a.id !== action.id));
    };
  }, []);

  const value = React.useMemo<CommandPaletteContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      registerAction,
      actions,
    }),
    [isOpen, open, close, toggle, registerAction, actions],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const context = React.useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider",
    );
  }
  return context;
}
