import { loadBundledCatalog } from "@eqa/content";
import { renderQuestionnaire } from "./render";
import type { EvidencePackAssemblyInput } from "./evidence-pack";
import type { FinalConclusion } from "./findings";
import {
  MOCK_EQA_DISCLAIMER,
  READINESS_SIMULATION_KIND,
  type MockEqaSimulationResult,
} from "./mock-eqa-scoring";
import type { ItemStatus } from "./state-machine";

/** Fixed clock — deterministic torture renders. */
export const MIXED_SCRIPT_TORTURE_GENERATED_AT = "2026-06-19T12:00:00.000Z";

/** Pin tied to the bundled content pack (deterministic). */
export const MIXED_SCRIPT_TORTURE_CONTENT_HASH =
  "e3b0c44298fc1c149afbfc4cd8992ebf4c8993fb92427ae41e4649b934ca495991b7922af";

const ASSESSMENT_ID = "assessment-bidi-torture-2026";
const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";

const TORTURE_EVIDENCE_ID = "ev-99-qa-001";
const TORTURE_QUESTION_PRIMARY = "Q-1-1-1";
const TORTURE_QUESTION_SECONDARY = "Q-1-1-2";
const TORTURE_FILENAME = "report-2026-v2-final.pdf";
const TORTURE_VERSION = 20260219;
const TORTURE_SIZE_BYTES = -128_000;
const TORTURE_SCAN_STATUS = `sha256:${MIXED_SCRIPT_TORTURE_CONTENT_HASH.slice(0, 16)}`;
const TORTURE_READINESS_SCORE = -7;

function tortureSimulation(locale: "en" | "ar"): MockEqaSimulationResult {
  return {
    kind: READINESS_SIMULATION_KIND,
    simulationId: "sim-bidi-torture",
    assessmentId: ASSESSMENT_ID,
    runAt: MIXED_SCRIPT_TORTURE_GENERATED_AT,
    runBy: "synthetic:mixed-script-torture",
    locale,
    overall: {
      score: TORTURE_READINESS_SCORE,
      level: "red",
      label:
        locale === "ar"
          ? "اختبار الحدود −15% (EQA v2) — «تقييم»؟"
          : "Boundary test −15% (EQA v2) — “rating”?",
    },
    domains: [],
    disclaimer: MOCK_EQA_DISCLAIMER,
  };
}

/**
 * Synthetic manifest input that deliberately stresses Arabic/Latin/digit bidi
 * boundaries: ISO timestamps, negatives, percentages, version hashes, digit-heavy
 * IDs, digit filenames, parenthesized Arabic/Latin runs, and RTL punctuation.
 */
export function createMixedScriptTortureEvidencePackInput(
  locale: "en" | "ar" = "ar",
): EvidencePackAssemblyInput {
  const catalog = loadBundledCatalog();
  const pack = catalog.get(PACK_ID, PACK_VERSION);
  const questionnaire = renderQuestionnaire(pack, locale);
  const pin = {
    contentPackId: pack.meta.contentPackId,
    version: pack.meta.version,
    contentHash: MIXED_SCRIPT_TORTURE_CONTENT_HASH,
  };

  const statusesByQuestion = new Map<string, ItemStatus>([
    [TORTURE_QUESTION_PRIMARY, "gap_confirmed"],
    [TORTURE_QUESTION_SECONDARY, "under_human_review"],
    ["Q-1-2-1", "remediation_in_progress"],
  ]);

  const finalConclusions: FinalConclusion[] = [
    {
      kind: "final_conclusion",
      assessmentId: ASSESSMENT_ID,
      questionId: TORTURE_QUESTION_PRIMARY,
      standardNumber: "1.1",
      conclusion:
        locale === "ar"
          ? "فجوة مؤكدة؛ النتيجة (Gap) −2 معيار — «تأكيد»؟ المرجع: EQA-2026"
          : "Confirmed gap; outcome (فجوة) −2 standard — “confirmed”? Ref: EQA-2026",
    },
  ];

  return {
    assessmentId: ASSESSMENT_ID,
    assessmentName: {
      en: 'Mixed-script torture (EQA) — punctuation "test"? [v2] −15%',
      ar: "اختبار الحدود المختلطة (EQA) — «علامات»؟ [v2] −15%",
    },
    locale,
    questionnaire,
    statusesByQuestion,
    responses: [
      {
        assessmentId: ASSESSMENT_ID,
        questionId: TORTURE_QUESTION_SECONDARY,
        answer: "Partial",
        note:
          locale === "ar"
            ? "(EQA) ملاحظة المراجع: النسبة −15%، المعرّف Q-1-1-1 (مرجع ev-99) — «اقتباس»؟"
            : '(EQA) Reviewer note: rate −15%, id Q-1-1-1 (ref ev-99) — "quote"?',
        pin,
        respondedBy: "audit-analyst",
        respondedAt: "2026-05-10T10:00:00.000Z",
      },
    ],
    finalConclusions,
    remediationItems: [
      {
        remediationId: "rem-torture-1",
        assessmentId: ASSESSMENT_ID,
        questionId: "Q-1-2-1",
        standardNumber: "1.2",
        action:
          locale === "ar"
            ? "معالجة (EQA): تحديث v2.0 — الموعد 2026-08-01؟"
            : "Remediation (EQA): update v2.0 — due 2026-08-01?",
        owner: locale === "ar" ? "مدير التدقيق (CAE)" : "Audit Manager (CAE)",
        targetDate: "2026-08-01",
        createdBy: "synthetic",
        createdAt: "2026-04-01T10:00:00.000Z",
        updatedBy: "synthetic",
        updatedAt: "2026-04-10T10:00:00.000Z",
        closedAt: null,
        retestNote: null,
      },
    ],
    evidenceMetadata: [
      {
        evidenceId: TORTURE_EVIDENCE_ID,
        version: TORTURE_VERSION,
        fileName: TORTURE_FILENAME,
        contentType: "application/pdf",
        sizeBytes: TORTURE_SIZE_BYTES,
        scanStatus: TORTURE_SCAN_STATUS,
        links: ["1.1", TORTURE_QUESTION_PRIMARY, TORTURE_QUESTION_SECONDARY],
        uploadedAt: "2026-03-15T09:00:00.000Z",
      },
    ],
    simulation: tortureSimulation(locale),
    exportId: "pack-bidi-torture",
    generatedAt: MIXED_SCRIPT_TORTURE_GENERATED_AT,
    generatedBy: "synthetic:mixed-script-torture",
  };
}

/** Distinctive machine-format tokens the torture manifest must LTR-isolate. */
export function mixedScriptTortureMachineTokens(): readonly string[] {
  return [
    MIXED_SCRIPT_TORTURE_GENERATED_AT,
    String(TORTURE_READINESS_SCORE),
    "1.1",
    "1.2",
    TORTURE_QUESTION_PRIMARY,
    TORTURE_QUESTION_SECONDARY,
    TORTURE_EVIDENCE_ID,
    String(TORTURE_VERSION),
    TORTURE_FILENAME,
    String(TORTURE_SIZE_BYTES),
    TORTURE_SCAN_STATUS,
  ];
}
