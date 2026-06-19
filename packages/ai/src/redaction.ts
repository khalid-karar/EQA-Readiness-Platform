import { RedactionError } from "./errors";
import type { Identity } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The role token a name is replaced with, e.g. "Audit Staff" → "[AUDIT_STAFF]". */
export function roleToken(role: string): string {
  const normalized = role
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `[${normalized || "PERSON"}]`;
}

/**
 * Builds a matcher for a name that only matches whole words (so "Sam" does not
 * match inside "Samir"), case-insensitively, across Unicode letters/digits.
 */
function nameMatcher(name: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(name.trim())}(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

export interface RedactionResult {
  readonly text: string;
  /** Number of identifier occurrences replaced. */
  readonly replacements: number;
}

/**
 * Replaces every occurrence of each identity's name with its role token. Longer
 * names are replaced first so a full name ("Khalid Al-Otaibi") is tokenised
 * before any shorter constituent. This is the redaction guard: personal
 * identifiers become role tokens before any text reaches the model.
 */
export function redactNames(
  text: string,
  identities: readonly Identity[],
): RedactionResult {
  let out = text;
  let replacements = 0;
  const ordered = [...identities].sort(
    (a, b) => b.name.trim().length - a.name.trim().length,
  );
  for (const identity of ordered) {
    if (!identity.name.trim()) continue;
    const token = roleToken(identity.role);
    out = out.replace(nameMatcher(identity.name), () => {
      replacements += 1;
      return token;
    });
  }
  return { text: out, replacements };
}

/**
 * Throws {@link RedactionError} if any identity's name still appears in `text`.
 * Called after redaction, immediately before inference, so no un-redacted
 * personal data can cross the model boundary even if redaction missed a variant.
 * The error never echoes the offending value.
 */
export function assertNoNames(
  text: string,
  identities: readonly Identity[],
): void {
  for (const identity of identities) {
    if (!identity.name.trim()) continue;
    if (nameMatcher(identity.name).test(text)) {
      throw new RedactionError(
        "An un-redacted personal identifier reached the inference boundary.",
      );
    }
  }
}
