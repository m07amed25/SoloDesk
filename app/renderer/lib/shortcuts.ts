/**
 * Inspects a keyboard event to determine if it is an operating system reserved shortcut.
 * In accordance with FR-016 and acceptance scenario A-15, these shortcuts must NEVER
 * have preventDefault() called or be intercepted by application handlers.
 */
export function isOsReservedShortcut(event: KeyboardEvent): boolean {
  const { key, altKey, ctrlKey, metaKey } = event;
  const lowerKey = key.toLowerCase();

  // Alt+F4 (Windows / Linux window close)
  if (altKey && (key === "F4" || lowerKey === "f4")) {
    return true;
  }

  // Cmd+Q (macOS quit)
  if (metaKey && lowerKey === "q") {
    return true;
  }

  // Cmd+H (macOS hide)
  if (metaKey && lowerKey === "h") {
    return true;
  }

  // Alt+Tab / Cmd+Tab (App switching)
  if ((altKey || metaKey) && key === "Tab") {
    return true;
  }

  // Ctrl+Alt+Delete
  if (ctrlKey && altKey && (key === "Delete" || lowerKey === "delete")) {
    return true;
  }

  // Windows key / Meta key OS combinations (e.g. Win+L lock)
  if (key === "Meta" || key === "OS") {
    return true;
  }

  return false;
}

/**
 * Checks if the event matches the global Command Palette shortcut (Mod+K).
 * Mod = Cmd on macOS, Ctrl on Windows / Linux.
 */
export function isCommandPaletteShortcut(event: KeyboardEvent): boolean {
  if (isOsReservedShortcut(event)) {
    return false;
  }

  const isMod = Boolean(event.metaKey || event.ctrlKey);
  const isK = event.key === "k" || event.key === "K";

  return Boolean(isMod && isK && !event.altKey);
}

/**
 * Returns the human-readable shortcut badge based on platform.
 */
export function getCommandPaletteShortcutText(): string {
  if (typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent)) {
    return "⌘K";
  }
  return "Ctrl+K";
}
