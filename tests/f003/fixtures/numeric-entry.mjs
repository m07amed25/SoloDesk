// Synthetic input-adapter example only; ambiguous grouping is never guessed.
export function normalizeEntry(text) {
  const ascii = text
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace("٫", ".");
  if (!/^[0-9]+\.[0-9]{2}$/.test(ascii))
    return { status: "needs_interpretation", original: text };
  return {
    status: "ready",
    value: { coefficient: ascii.replace(".", ""), scale: 2 },
  };
}
