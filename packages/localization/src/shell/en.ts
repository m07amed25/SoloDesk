export const en = {
  // Application
  "app.title": "SoloDesk",
  "skip.content": "Skip to main content",

  // Navigation
  "nav.overview": "Overview",
  "nav.my_work": "My Work",
  "nav.projects": "Projects",
  "nav.clients": "Clients",
  "nav.time": "Time",
  "nav.finance": "Finance",
  "nav.reports": "Reports",
  "nav.knowledge": "Knowledge",
  "nav.settings": "Settings",

  // Sidebar
  "sidebar.expand": "Expand sidebar",
  "sidebar.collapse": "Collapse sidebar",
  "sidebar.main_nav": "Main Navigation",

  // Search & Command Palette
  "search.placeholder": "Search or type a command...",
  "search.trigger": "Search",
  "search.shortcut": "Mod+K",
  "search.no_results": 'No results found for "{query}"',
  "search.category.navigation": "Navigation",
  "search.category.actions": "Actions",
  "search.category.preferences": "Preferences",
  "search.close": "Close search",
  "search.clear": "Clear search",
  "search.available_commands": "Available commands",

  // Theme
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",
  "theme.toggle": "Toggle theme",
  "theme.switch_to": "Switch theme: {mode}",
  "theme.label": "Theme",

  // Language
  "language.en": "English",
  "language.ar": "العربية",
  "language.toggle": "Switch to Arabic",
  "language.label": "Language",

  // Utilities & Placeholders
  "placeholder.phase_badge": "Target: {phase}",
  "placeholder.workspaces.title": "Workspaces",
  "placeholder.workspaces.status": "Personal Workspace",
  "placeholder.workspaces.description":
    "Workspace switcher and organization management will be enabled in Phase P01 (F012).",

  "placeholder.timer.title": "Timer",
  "placeholder.timer.status": "00:00:00 (Inactive)",
  "placeholder.timer.description":
    "Native desktop time tracking and durable offline allocation will be enabled in Phase P04 (F036).",

  "placeholder.sync.title": "Sync Status",
  "placeholder.sync.status": "Local Desktop (Offline)",
  "placeholder.sync.description":
    "Cloud sync engine and offline delta reconciliation will be enabled in Phase P01 (F017).",

  "placeholder.notifications.title": "Notifications",
  "placeholder.notifications.status": "No notifications",
  "placeholder.notifications.description":
    "Desktop notifications and action center will be enabled in Phase P01 (F022).",

  "placeholder.unbuilt_module.title": "{module} Module",
  "placeholder.unbuilt_module.notice":
    "This capability is scheduled for delivery in an upcoming phase. No synthetic data or unbacked actions are displayed.",

  // Settings
  "settings.title": "Application Settings",
  "settings.description":
    "Manage local display preferences and view desktop runtime information.",
  "settings.language.title": "Interface Language",
  "settings.language.description":
    "Choose between English and Arabic. RTL layout direction and typography update immediately.",
  "settings.theme.title": "Appearance",
  "settings.theme.description":
    "Select light, dark, or follow your operating system appearance.",
  "settings.environment.title": "Desktop Environment",
  "settings.environment.platform": "Platform",
  "settings.environment.version": "Version",

  // Window Controls
  "window.minimize": "Minimize",
  "window.maximize": "Maximize",
  "window.restore": "Restore",
  "window.close": "Close",

  // Breadcrumbs
  "breadcrumb.home": "Home",

  // Local protection states
  "protection.title": "Local protection is unavailable",
  "protection.check_again": "Check again",
  "protection.vault_locked":
    "Unlock your device's key store, then check again. Existing protected work remains locked.",
  "protection.key_missing":
    "The device key for this local work is missing. Check a surviving device or separately protected backup if available. An account password reset cannot decrypt unsynced local work.",
  "protection.protection_denied":
    "The device denied key access. Check system permissions, then check again or contact support.",
  "protection.unprotected_backend":
    "This device's key store is not providing protected storage. Local protected work cannot be opened or saved until a protected key store is available.",
  "protection.integrity_failed":
    "Protected work could not be authenticated. Do not replace it with an empty copy; contact support with the diagnostic ID.",
  "protection.interrupted_rotation":
    "A key change was interrupted. The protected copies need validation before work can continue; contact support.",
  "protection.unsupported_format":
    "This protected format is not supported by this version. Update the app or contact support; the existing data has not been replaced.",

  // Quota & Degraded Alerts (F008)
  "quota.warning_70":
    "Storage utilization reached 70%. Consider archiving unused assets.",
  "quota.warning_85":
    "Storage utilization reached 85%. Free up space soon to prevent write interruptions.",
  "quota.critical_95":
    "Critical storage warning (95%). Approaching provider hard limit.",
  "quota.exhausted_100":
    "Cloud storage capacity exhausted (100%). New writes are halted until space is cleared.",
  "quota.provider_degraded":
    "Cloud backend is temporarily unavailable or degraded. Changes are safely saved locally.",
  "quota.dismiss": "Dismiss alert",

  // Authoritative Command Receipts & Audit (F009)
  "receipt.status.committed": "Authoritative change committed",
  "receipt.status.job_accepted": "Job accepted for processing",
  "receipt.status.conflict": "Revision conflict detected",
  "receipt.status.rejected": "Command rejected",
  "receipt.status.proven_not_applied": "Operation proven not applied",
  "receipt.status.reconciling": "Reconciling operation status...",
  "receipt.announcement.committed":
    "Command completed successfully. Receipt ID: {receiptId}",
  "receipt.announcement.conflict": "Command failed due to revision conflict.",
  "receipt.announcement.rejected": "Command was rejected by the server.",

  // Identity recovery (safe local copy; never provider error text)
  "shell.identity.action.retry": "Try again",
  "shell.identity.action.cancel": "Cancel",
  "shell.identity.action.unlockProtection": "Unlock protection",
  "shell.identity.action.signIn": "Sign in again",
  "shell.identity.action.chooseIsolatedProfile": "Choose an isolated profile",
  "shell.identity.action.reconcile": "Check enrollment status",
  "shell.identity.action.upgrade": "Update SoloDesk",
  "shell.identity.action.contactSupport": "Contact support",
  "shell.identity.recovery.unlockProtection":
    "Unlock protected device storage before continuing. Existing local data has not been replaced.",
  "shell.identity.recovery.signInAgain":
    "Your session is no longer current. Sign in again to continue.",
  "shell.identity.recovery.reconcile":
    "Enrollment may still be processing. Check its authoritative status before trying a new enrollment.",
  "shell.identity.recovery.upgrade":
    "This protected identity format needs a newer SoloDesk version. Existing data has not been replaced.",
  "shell.identity.recovery.contactSupport":
    "Protected identity data could not be verified. Keep the existing files and contact support.",
} as const;
