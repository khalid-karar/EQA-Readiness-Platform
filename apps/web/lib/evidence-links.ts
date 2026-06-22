/** A standard number and question ids listed after it in the evidence links array. */
export interface ParsedStandardLink {
  readonly standardNumber: string;
  readonly questionIds: readonly string[];
}

const STANDARD_NUMBER_PATTERN = /^\d+\.\d+$/;

/** True when `link` is a structural standard number (e.g. `1.1`). */
export function isStandardNumberLink(link: string): boolean {
  return STANDARD_NUMBER_PATTERN.test(link);
}

/**
 * Parses the evidence `links` JSON array into standard groupings.
 * Upload paths store `[standardNumber, questionId, …]`; reuse adds further
 * `[standardNumber, questionId]` pairs in the same array.
 */
export function parseEvidenceLinks(
  links: readonly string[],
): readonly ParsedStandardLink[] {
  const groups: ParsedStandardLink[] = [];
  let current: ParsedStandardLink | null = null;

  for (const link of links) {
    if (isStandardNumberLink(link)) {
      current = { standardNumber: link, questionIds: [] };
      groups.push(current);
      continue;
    }
    if (current) {
      current = {
        standardNumber: current.standardNumber,
        questionIds: [...current.questionIds, link],
      };
      groups[groups.length - 1] = current;
    }
  }

  return groups;
}

/** Distinct standard numbers referenced in `links`, in encounter order. */
export function standardNumbersFromLinks(links: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const numbers: string[] = [];
  for (const link of links) {
    if (isStandardNumberLink(link) && !seen.has(link)) {
      seen.add(link);
      numbers.push(link);
    }
  }
  return numbers;
}
