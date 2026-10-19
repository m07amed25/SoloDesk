
export const LRM = "\u200E";
export const RLM = "\u200F";

export function isLtrToken(text: string): boolean {
  if (!text) return false;
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
  if (hasArabic) return false;
  return /[a-zA-Z0-9]/.test(text);
}

export function isolateBidi(text: string): string {
  if (!text) return text;
  return `${LRM}${text}${LRM}`;
}
