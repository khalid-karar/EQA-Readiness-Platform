import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EvidenceIndexEntry,
  EvidencePackManifest,
  QuestionPackDetail,
  StandardPackSection,
} from "./evidence-pack";
import {
  PACK_PDF_MARKERS,
  PACK_PDF_MARKERS_AR,
} from "./evidence-pack-pdf-markers";

const ASSETS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
);

const TEMPLATE_PATH = join(ASSETS_DIR, "templates", "evidence-pack.html");

const FONT_PATHS = {
  arabic: join(ASSETS_DIR, "fonts", "NotoSansArabic-Regular.ttf"),
  latin: join(ASSETS_DIR, "fonts", "NotoSans-Regular.ttf"),
  latinBold: join(ASSETS_DIR, "fonts", "NotoSans-Bold.ttf"),
} as const;

const LTR_ATOM_OPEN = '<bdi class="ltr-atom" dir="ltr">';
const LTR_ATOM_CLOSE = "</bdi>";

/** Human prose regions — freeform text may cite machine-like tokens intentionally. */
const HUMAN_PROSE_REGION_PATTERNS = [
  /<div class="note">[\s\S]*?<\/div>/gi,
  /<div class="finding">[\s\S]*?<\/div>/gi,
  /<p class="disclaimer">[\s\S]*?<\/p>/gi,
  /<p class="confidentiality">[\s\S]*?<\/p>/gi,
  /<p><strong>[^<]*<\/strong>\s*[^<]{10,}<\/p>/gi,
] as const;

/**
 * Machine-token shapes that must only appear inside {@link ltrAtom} wrappers in
 * structured emission paths (not human review notes).
 */
export const MACHINE_TOKEN_PATTERNS = [
  /\b[A-Za-z]*-?\d+(?:[-.:]\d+)+\b/g,
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\b/g,
  /\bsha256:[0-9a-f]+\b/gi,
  /\b\d+(?:\.\d+)?%/g,
  /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b/g,
  /\b[\w-]+\.(?:pdf|docx|txt|png)\b/gi,
] as const;

let cachedTemplate: string | undefined;
const fontDataUrls: Partial<Record<keyof typeof FONT_PATHS, string>> = {};

function loadTemplate(): string {
  if (!cachedTemplate) {
    cachedTemplate = readFileSync(TEMPLATE_PATH, "utf8");
    assertTemplateOffline(cachedTemplate);
  }
  return cachedTemplate;
}

function fontDataUrl(key: keyof typeof FONT_PATHS): string {
  if (!fontDataUrls[key]) {
    const bytes = readFileSync(FONT_PATHS[key]);
    fontDataUrls[key] = `data:font/ttf;base64,${bytes.toString("base64")}`;
  }
  return fontDataUrls[key]!;
}

/** Fails the build when the template references any external HTTP(S) resource. */
export function assertTemplateOffline(template: string): void {
  if (/https?:\/\//i.test(template)) {
    throw new Error(
      "Evidence pack HTML template must not reference external HTTP(S) URLs",
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Wraps machine-format values (IDs, timestamps, counts, filenames) so they
 * render as LTR atoms in RTL context without Unicode-Bidi reordering.
 */
export function ltrAtom(value: string | number): string {
  return `${LTR_ATOM_OPEN}${escapeHtml(String(value))}${LTR_ATOM_CLOSE}`;
}

/** Escapes prose then isolates any embedded machine-token spans. */
function emitProseWithMachineTokens(text: string): string {
  const combined = new RegExp(
    MACHINE_TOKEN_PATTERNS.map((pattern) => `(?:${pattern.source})`).join("|"),
    "g",
  );
  let result = "";
  let cursor = 0;

  for (const match of text.matchAll(combined)) {
    const index = match.index ?? 0;
    result += escapeHtml(text.slice(cursor, index));
    result += ltrAtom(match[0] ?? "");
    cursor = index + (match[0]?.length ?? 0);
  }

  return result + escapeHtml(text.slice(cursor));
}

function ltrAtomList(
  values: readonly (string | number)[],
  separator: string,
): string {
  return values.map((value) => ltrAtom(value)).join(separator);
}

function stripHumanProseRegions(html: string): string {
  let stripped = html;
  for (const pattern of HUMAN_PROSE_REGION_PATTERNS) {
    stripped = stripped.replace(pattern, "");
  }
  return stripped;
}

function stripLtrAtomBlocks(html: string): string {
  return html.replace(/<bdi class="ltr-atom" dir="ltr">[\s\S]*?<\/bdi>/gi, "");
}

function htmlToVisibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBareMachineTokens(text: string): string[] {
  const found: string[] = [];
  for (const pattern of MACHINE_TOKEN_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const token = match[0];
      if (token && !found.includes(token)) {
        found.push(token);
      }
    }
  }
  return found;
}

/**
 * Parses rendered HTML and fails when any machine-token pattern appears outside
 * an LTR-isolating `.ltr-atom` wrapper (excluding human prose regions).
 */
export function assertNoBareMachineTokensInHtml(html: string): void {
  const scoped = stripHumanProseRegions(html);
  const withoutAtoms = stripLtrAtomBlocks(scoped);
  const visible = htmlToVisibleText(withoutAtoms);
  const bare = findBareMachineTokens(visible);

  if (bare.length > 0) {
    throw new Error(
      `Bare machine token(s) outside .ltr-atom: ${bare.join(", ")}`,
    );
  }
}

function gapCounts(questions: readonly QuestionPackDetail[]): {
  readonly gapCount: number;
  readonly pendingCount: number;
} {
  let gapCount = 0;
  let pendingCount = 0;
  for (const question of questions) {
    const status = question.status;
    if (
      status === "gap_confirmed" ||
      status === "remediation_in_progress" ||
      status === "ready_for_retest"
    ) {
      gapCount += 1;
    }
    if (status === "ai_flagged" || status === "under_human_review") {
      pendingCount += 1;
    }
  }
  return { gapCount, pendingCount };
}

function renderGapStatusSummary(
  questions: readonly QuestionPackDetail[],
  locale: "en" | "ar",
): string {
  const { gapCount, pendingCount } = gapCounts(questions);
  if (locale === "ar") {
    return (
      `${ltrAtom(gapCount)} فجوة/فجوات مؤكدة أو قيد المعالجة؛ ` +
      `${ltrAtom(pendingCount)} بانتظار المراجعة`
    );
  }
  return (
    `${ltrAtom(gapCount)} confirmed/remediation gap(s); ` +
    `${ltrAtom(pendingCount)} pending human review`
  );
}

function renderEvidenceLinks(
  links: readonly string[],
  locale: "en" | "ar",
): string {
  if (links.length === 0) {
    return "";
  }
  const separator = locale === "ar" ? "، " : ", ";
  const joined = ltrAtomList(links, separator);
  return locale === "ar" ? ` — مرتبطة بـ ${joined}` : ` — linked to ${joined}`;
}

function renderEvidenceIndexLine(
  entry: EvidenceIndexEntry,
  locale: "en" | "ar",
): string {
  const labels = LABELS[locale];
  const ref =
    locale === "ar"
      ? `مرجع: ${ltrAtom(entry.evidenceId)} (إصدار ${ltrAtom(entry.version)})`
      : `Ref: ${ltrAtom(entry.evidenceId)} (v${ltrAtom(entry.version)})`;
  const separator = locale === "ar" ? "،" : ",";
  const links = renderEvidenceLinks(entry.links, locale);
  const uploaded =
    entry.uploadedAt.length > 0
      ? locale === "ar"
        ? ` — رُفع ${ltrAtom(entry.uploadedAt)}`
        : ` — uploaded ${ltrAtom(entry.uploadedAt)}`
      : "";

  return (
    `<p data-visual-region="evidence-index-row" data-region-id="evidence-index-${escapeHtml(entry.evidenceId)}">` +
    `• ${ref} — ${ltrAtom(entry.fileName)} ` +
    `(${ltrAtom(entry.scanStatus)}${separator} ${ltrAtom(entry.sizeBytes)} ${labels.bytes})` +
    `${links}${uploaded}</p>`
  );
}

function renderStandardSection(
  std: StandardPackSection,
  locale: "en" | "ar",
): string {
  const labels = LABELS[locale];
  const evidenceItems =
    std.evidenceIndex.length === 0
      ? `<p>${escapeHtml(labels.noEvidence)}</p>`
      : std.evidenceIndex
          .map((entry) => renderEvidenceIndexLine(entry, locale))
          .join("");

  const questions = std.questions
    .map((q) => {
      const parts = [
        `<div class="question">${ltrAtom(q.questionId)}: ${escapeHtml(q.statusLabel)}`,
      ];
      if (q.reviewerNote) {
        parts.push(
          `<div class="note">${escapeHtml(labels.note)} ${escapeHtml(q.reviewerNote)}</div>`,
        );
      }
      if (q.gapFinding) {
        parts.push(
          `<div class="finding">${escapeHtml(labels.finding)} ${escapeHtml(q.gapFinding)}</div>`,
        );
      }
      parts.push("</div>");
      return parts.join("");
    })
    .join("");

  const remediation = std.remediationSummary
    ? `<p><strong>${escapeHtml(labels.remediation)}</strong> ${emitProseWithMachineTokens(std.remediationSummary)}</p>`
    : "";

  return `<section class="standard">
    <h2>${ltrAtom(std.domainNumber)} › ${ltrAtom(std.standardNumber)} — ${escapeHtml(std.standardTitle)}</h2>
    <p><strong>${escapeHtml(labels.gapStatus)}</strong> ${renderGapStatusSummary(std.questions, locale)}</p>
    ${remediation}
    <div class="evidence-index">
      <h3>${escapeHtml(labels.evidenceIndex)}</h3>
      ${evidenceItems}
    </div>
    ${questions}
  </section>`;
}

function bundledLine(manifest: EvidencePackManifest): string {
  const count = ltrAtom(manifest.bundledFileCount);
  return manifest.locale === "ar"
    ? `ملفات خام مُضمَّنة: ${count} (مستبعدة افتراضياً)`
    : `Raw files bundled: ${count} (excluded by default)`;
}

/**
 * Builds the offline HTML document for an evidence pack manifest. Locale is
 * expressed via `dir` and `lang`; machine-format values are LTR-isolated.
 */
export function buildEvidencePackHtml(manifest: EvidencePackManifest): string {
  const locale = manifest.locale;
  const labels = LABELS[locale];
  const markers = locale === "ar" ? PACK_PDF_MARKERS_AR : PACK_PDF_MARKERS;
  const disclaimer =
    locale === "ar"
      ? manifest.assessorDisclaimer.ar
      : manifest.assessorDisclaimer.en;
  const confidentiality =
    locale === "ar"
      ? manifest.confidentialityFooter.ar
      : manifest.confidentialityFooter.en;
  const assessmentName =
    locale === "ar" ? manifest.assessmentName.ar : manifest.assessmentName.en;

  const standardsBody = manifest.standards
    .map((std) => renderStandardSection(std, locale))
    .join("");

  let html = loadTemplate();
  const replacements: Record<string, string> = {
    LANG: locale,
    DIR: locale === "ar" ? "rtl" : "ltr",
    META_TITLE: escapeHtml(markers.confidentiality),
    META_SUBJECT: escapeHtml(markers.disclaimer),
    META_KEYWORDS: escapeHtml(
      [markers.confidentiality, markers.disclaimer, markers.rawExcluded].join(
        " ",
      ),
    ),
    FONT_ARABIC: fontDataUrl("arabic"),
    FONT_LATIN: fontDataUrl("latin"),
    FONT_LATIN_BOLD: fontDataUrl("latinBold"),
    FOOTER_CONFIDENTIALITY: escapeHtml(markers.confidentiality),
    FOOTER_DISCLAIMER: escapeHtml(markers.disclaimer),
    FOOTER_RAW_EXCLUDED: escapeHtml(labels.footerRaw),
    TITLE: escapeHtml(labels.title),
    ASSESSOR_DISCLAIMER: escapeHtml(disclaimer),
    CONFIDENTIALITY: escapeHtml(confidentiality),
    LABEL_ASSESSMENT: escapeHtml(labels.assessment),
    ASSESSMENT_NAME: emitProseWithMachineTokens(assessmentName),
    LABEL_GENERATED: escapeHtml(labels.generated),
    GENERATED_AT: ltrAtom(manifest.generatedAt),
    LABEL_READINESS: escapeHtml(labels.readiness),
    READINESS_SCORE: ltrAtom(`${manifest.readinessSummary.score}%`),
    READINESS_LABEL: emitProseWithMachineTokens(
      manifest.readinessSummary.label,
    ),
    BUNDLED_LINE: bundledLine(manifest),
    STANDARDS_BODY: standardsBody,
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  assertTemplateOffline(html);
  assertNoBareMachineTokensInHtml(html);
  return html;
}

const LABELS = {
  en: {
    title: "EQA Readiness Evidence Pack",
    assessment: "Assessment:",
    generated: "Generated:",
    readiness: "Simulated overall readiness:",
    evidenceIndex: "Evidence index (references only):",
    noEvidence: "No linked evidence",
    gapStatus: "Gap status:",
    remediation: "Remediation:",
    note: "Note:",
    finding: "Finding:",
    footerRaw: `${PACK_PDF_MARKERS.rawExcluded} — reference index only`,
    bytes: "bytes",
  },
  ar: {
    title: "حزمة أدلة جاهزية EQA",
    assessment: "التقييم:",
    generated: "تاريخ التوليد:",
    readiness: "الجاهزية الإجمالية المحاكية:",
    evidenceIndex: "فهرس الأدلة (مراجع فقط):",
    noEvidence: "لا توجد أدلة مرتبطة",
    gapStatus: "حالة الفجوات:",
    remediation: "المعالجة:",
    note: "ملاحظة:",
    finding: "نتيجة المراجعة:",
    footerRaw: `${PACK_PDF_MARKERS_AR.rawExcluded} — مراجع الفهرس فقط`,
    bytes: "بايت",
  },
} as const;
