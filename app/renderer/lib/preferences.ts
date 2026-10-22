export type SupportedLocale = "en" | "ar";
export type ThemeMode = "light" | "dark" | "system";
export type ThemePreset = "modern-minimal" | "amber-mono";

export interface UserPreferenceRecord {
  schemaVersion: 1;
  locale: SupportedLocale;
  theme: ThemeMode;
  themePreset?: ThemePreset;
  sidebarCollapsed: boolean;
  lastUpdated: string;
}

export const DEFAULT_USER_PREFERENCES: Readonly<UserPreferenceRecord> =
  Object.freeze({
    schemaVersion: 1,
    locale: "en",
    theme: "system",
    sidebarCollapsed: false,
    lastUpdated: "1970-01-01T00:00:00.000Z",
  });

export const PREFERENCES_STORAGE_KEY = "solodesk_shell_prefs";

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function getSafeStorage(): StorageAdapter {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      return globalThis.localStorage;
    }
  } catch {
    // Fail closed if localStorage is blocked or restricted
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export function validatePreferences(
  data: unknown,
): UserPreferenceRecord | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    return null;
  }
  if (record.locale !== "en" && record.locale !== "ar") {
    return null;
  }
  if (
    record.theme !== "light" &&
    record.theme !== "dark" &&
    record.theme !== "system"
  ) {
    return null;
  }
  if (typeof record.sidebarCollapsed !== "boolean") {
    return null;
  }
  const lastUpdated =
    typeof record.lastUpdated === "string"
      ? record.lastUpdated
      : new Date().toISOString();

  const themePreset: ThemePreset | undefined =
    record.themePreset === "amber-mono"
      ? "amber-mono"
      : record.themePreset === "modern-minimal"
        ? "modern-minimal"
        : undefined;

  return {
    schemaVersion: 1,
    locale: record.locale,
    theme: record.theme,
    ...(themePreset ? { themePreset } : {}),
    sidebarCollapsed: record.sidebarCollapsed,
    lastUpdated,
  };
}

export class PreferencesManager {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter = getSafeStorage()) {
    this.storage = storage;
  }

  load(): UserPreferenceRecord {
    try {
      const raw = this.storage.getItem(PREFERENCES_STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_USER_PREFERENCES };
      }
      const parsed: unknown = JSON.parse(raw);
      const validated = validatePreferences(parsed);
      if (!validated) {
        return { ...DEFAULT_USER_PREFERENCES };
      }
      return validated;
    } catch {
      // Corrupted, unparseable, or inaccessible storage fails closed
      return { ...DEFAULT_USER_PREFERENCES };
    }
  }

  save(
    patch: Partial<Omit<UserPreferenceRecord, "schemaVersion">>,
  ): UserPreferenceRecord {
    const current = this.load();
    const updated: UserPreferenceRecord = {
      ...current,
      ...patch,
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
    };
    try {
      this.storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Inability to write (quota or security error) does not crash the shell
    }
    return updated;
  }
}

export const preferencesManager = new PreferencesManager();
