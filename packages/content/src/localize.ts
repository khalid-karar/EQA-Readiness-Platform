import type { Locale, LocalizedText } from "./types";

/**
 * Resolves a bilingual field to a single locale. Both languages are always
 * present (enforced at load time), but a defensive fallback to the other locale
 * is provided in case a field is ever empty.
 */
export function localize(text: LocalizedText, locale: Locale): string {
  const primary = text[locale];
  if (primary && primary.trim() !== "") return primary;
  const fallback: Locale = locale === "en" ? "ar" : "en";
  return text[fallback];
}
