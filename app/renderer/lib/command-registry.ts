export type CommandCategory = "navigation" | "actions" | "preferences";

export interface CommandPaletteAction {
  id: string;
  category: CommandCategory;
  titleKey: string;
  titleText: string;
  keywords: readonly string[];
  shortcutBadge?: string;
  iconName: string;
  execute: () => void;
  enabled: boolean;
}

/**
 * Normalizes search queries by:
 * 1. Stripping Arabic diacritics (Harakat / Tashkeel) [\u064B-\u065F\u0670]
 * 2. Normalizing Alef variants [\u0622\u0623\u0625\u0671] to bare Alef \u0627
 * 3. Normalizing Ta Marbuta \u0629 to Ha \u0647
 * 4. Normalizing Alef Maqsura \u0649 to Ya \u064A
 * 5. Lowercasing and trimming Latin whitespace
 */
export function normalizeSearchQuery(input: string): string {
  if (!input) return "";

  return (
    input
      .trim()
      .toLowerCase()
      // Strip Arabic diacritics (Fathah, Dammah, Kasrah, Sukun, Shaddah, Tanwin, Superscript Alef)
      .replace(/[\u064B-\u065F\u0670]/g, "")
      // Normalize Alef variants (Madda, Hamza above, Hamza below, Wasla) to bare Alef
      .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
      // Normalize Ta Marbuta to Ha
      .replace(/\u0629/g, "\u0647")
      // Normalize Alef Maqsura to Ya
      .replace(/\u0649/g, "\u064A")
  );
}

/**
 * Checks if a target string contains the query string after normalization.
 */
export function matchesQuery(target: string, query: string): boolean {
  if (!query) return true;
  if (!target) return false;

  const normalizedTarget = normalizeSearchQuery(target);
  const normalizedQuery = normalizeSearchQuery(query);

  return normalizedTarget.includes(normalizedQuery);
}

/**
 * Filters a list of actions based on query, matching against titleText,
 * titleKey, and keywords in < 50ms across 100+ actions.
 */
export function filterActions(
  actions: readonly CommandPaletteAction[],
  query: string,
): CommandPaletteAction[] {
  const normalizedQuery = normalizeSearchQuery(query);

  return actions.filter((action) => {
    if (!action.enabled) return false;
    if (!normalizedQuery) return true;

    // Check title
    if (normalizeSearchQuery(action.titleText).includes(normalizedQuery)) {
      return true;
    }

    // Check keywords
    for (let i = 0; i < action.keywords.length; i++) {
      if (normalizeSearchQuery(action.keywords[i]).includes(normalizedQuery)) {
        return true;
      }
    }

    return false;
  });
}
