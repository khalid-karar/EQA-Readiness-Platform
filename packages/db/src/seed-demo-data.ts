/**
 * Seeds the synthetic Seera-pilot demo assessment into tenant storage so Railway
 * Postgres matches the UI fixtures (rule 5 — synthetic only).
 */
import { AiReviewService, LocalStubModelAdapter } from "@eqa/ai";
import {
  loadBundledCatalog,
  type ReviewChecklistPin,
} from "@eqa/content";
import type { Kms } from "@eqa/crypto";
import { TenantCipher } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import {
  createMalwareScanHandler,
  EvidenceService,
  HmacSignedUrlSigner,
  InMemoryObjectStore,
  MALWARE_SCAN_JOB,
  type MalwareScanner,
} from "@eqa/storage";
import type { TenantDescriptor } from "@eqa/tenant";
import {
  AI_GAP_FLAG_JOB,
  createGapFlaggingHandler,
  createSeeraDemoAssessmentName,
  createSeeraDemoFinalConclusions,
  createSeeraDemoRemediationItems,
  createSeeraDemoResponses,
  GapFlaggingEngine,
  HumanReviewEngine,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_PACK_ID,
  SEERA_DEMO_PACK_VERSION,
  SEERA_DEMO_QUESTIONS,
  SEERA_DEMO_RETEST_FAIL_NOTE,
  SEERA_DEMO_STANDARDS,
  WorkingPaperReviewEngine,
  type GapFlaggingPayload,
} from "@eqa/workflows";
import type { Database } from "./database";
import {
  createEvidenceScanStatusWriter,
  createTenantJobAuditPort,
} from "./evidence-system";
import { createGapFlagSink } from "./gap-flag-system";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { contextOf, sessionFor } from "./testing/fixtures";

const SEED_MARKER = "seera-pilot-demo-data-v2";
const PDF_BYTES = Buffer.from("%PDF-1.7 synthetic seera demo seed");
const SIGNER_SECRET = "synthetic-seed-url-signer";
const EVIDENCE_CONFIG = {
  maxBytes: 512_000,
  allowedContentTypes: ["application/pdf"],
  downloadTtlSeconds: 300,
};

const {
  ETHICS_CHARTER,
  ETHICS_ACK,
  OBJECTIVITY_THREATS,
  COI_DECLARATIONS,
  FUNCTIONAL_REPORTING,
  BUDGET_INDEPENDENCE,
} = SEERA_DEMO_QUESTIONS;

const { ETHICS, OBJECTIVITY, ORG_INDEPENDENCE } = SEERA_DEMO_STANDARDS;

const EDITED_GAP_CONCLUSION =
  createSeeraDemoFinalConclusions()[0]?.conclusion ??
  "Reviewer-edited Seera conclusion: COI process gap confirmed.";

/**
 * Idempotently seeds demo assessment rows for the Seera-pilot tenant.
 * Safe to call on every deploy — skips when the marker is already set.
 */
export async function seedSeeraPilotDemoData(
  db: Database,
  kms: Kms,
  tenant: TenantDescriptor,
): Promise<void> {
  const cae = createTenantRepositories(db, sessionFor(contextOf(tenant), "cae"));
  if ((await cae.kv.get(SEED_MARKER)) === "done") {
    return;
  }

  const registry = new TenantRegistry(db, kms);
  const catalog = loadBundledCatalog();
  const pin = catalog.pinForAssessment(
    SEERA_DEMO_ASSESSMENT_ID,
    SEERA_DEMO_PACK_ID,
    SEERA_DEMO_PACK_VERSION,
  );
  const pack = catalog.get(SEERA_DEMO_PACK_ID, SEERA_DEMO_PACK_VERSION);
  const reviewPin: ReviewChecklistPin = {
    contentPackId: pack.meta.contentPackId,
    version: pack.meta.version,
    contentHash: pack.contentHash,
  };

  const objectStore = new InMemoryObjectStore(`seed-${tenant.slug}`);
  const scanner: MalwareScanner = {
    scan: () => Promise.resolve({ clean: true, scanner: "av-stub" }),
  };
  const queue = new InMemoryJobQueue(
    {
      [MALWARE_SCAN_JOB]: createMalwareScanHandler({
        objectStore,
        scanner,
        cipherFor: async (t) =>
          new TenantCipher(kms, await registry.getEncryptedDataKey(t.slug)),
        statusWriter: createEvidenceScanStatusWriter(db),
      }),
      [AI_GAP_FLAG_JOB]: createGapFlaggingHandler({
        engine: new GapFlaggingEngine(
          new AiReviewService(new LocalStubModelAdapter()),
        ),
        catalog,
        sink: createGapFlagSink(db),
      }),
    },
    { auditPort: createTenantJobAuditPort(db) },
  );

  const tenantCtx = contextOf(tenant);
  const cipher = new TenantCipher(
    kms,
    await registry.getEncryptedDataKey(tenant.slug),
  );
  const evidenceService = new EvidenceService({
    store: cae.evidence,
    objectStore,
    cipher,
    signer: new HmacSignedUrlSigner(SIGNER_SECRET),
    queue,
    tenant: tenantCtx,
    config: EVIDENCE_CONFIG,
  });

  const contentPin = {
    contentPackId: pin.contentPackId,
    version: pin.version,
    contentHash: pin.contentHash,
  };

  async function submitEvidence(questionId: string, links: readonly string[]) {
    await cae.itemStatus.transition({
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId,
      to: "evidence_requested",
    });
    await evidenceService.upload({
      fileName: `${questionId}-evidence.pdf`,
      contentType: "application/pdf",
      bytes: PDF_BYTES,
      links: [...links],
    });
    await queue.onIdle();
    await cae.itemStatus.transition({
      assessmentId: SEERA_DEMO_ASSESSMENT_ID,
      questionId,
      to: "evidence_submitted",
    });
  }

  async function runAiGapFlag(
    questionId: string,
    standardNumber: string,
  ): Promise<string> {
    const payload: GapFlaggingPayload = {
      questionId,
      standardNumber,
      pin,
      evidence: {
        excerpts: ["Synthetic excerpt for Seera-pilot demo seed."],
        identities: [],
      },
    };
    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: tenantCtx,
      payload,
    });
    await queue.onIdle();
    const drafts =
      await cae.draftFindings.getForAssessment(SEERA_DEMO_ASSESSMENT_ID);
    const draft = drafts.find((d) => d.questionId === questionId);
    if (!draft?.findingId) {
      throw new Error(`expected draft for ${questionId}`);
    }
    return draft.findingId;
  }

  // Budget independence — not applicable for this pilot scope.
  await cae.itemStatus.transition({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    questionId: BUDGET_INDEPENDENCE,
    to: "not_applicable",
  });

  // Questionnaire responses (synthetic EN copy).
  for (const response of createSeeraDemoResponses("en")) {
    const submitInput = {
      assessmentId: response.assessmentId,
      questionId: response.questionId,
      answer: response.answer,
      pin: contentPin,
      ...(response.note !== null ? { note: response.note } : {}),
    };
    await cae.responses.submit(submitInput);
  }

  // Ethics charter — accept gap, remediate with failed retest loop, then close.
  await submitEvidence(ETHICS_CHARTER, [ETHICS, ETHICS_CHARTER]);
  const charterFindingId = await runAiGapFlag(ETHICS_CHARTER, ETHICS);
  const review = new HumanReviewEngine(cae.humanReview);
  await review.review({ findingId: charterFindingId, action: "accept" });

  const charterRemediation = await cae.remediation.assign({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    questionId: ETHICS_CHARTER,
    standardNumber: ETHICS,
    action: createSeeraDemoRemediationItems("en")[0]?.action ?? "Update ethics process",
    owner: "Audit Manager",
    targetDate: "2026-12-31",
  });
  await cae.remediation.markReadyForRetest(charterRemediation.remediationId);
  await cae.remediation.recordRetestFail(
    charterRemediation.remediationId,
    SEERA_DEMO_RETEST_FAIL_NOTE,
  );
  await cae.itemStatus.transition({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    questionId: ETHICS_CHARTER,
    to: "gap_confirmed",
  });
  await cae.itemStatus.transition({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    questionId: ETHICS_CHARTER,
    to: "remediation_in_progress",
  });
  await cae.remediation.markReadyForRetest(charterRemediation.remediationId);
  await cae.remediation.recordRetestPass(charterRemediation.remediationId);

  // Ethics acknowledgement — reject AI draft.
  await submitEvidence(ETHICS_ACK, [ETHICS, ETHICS_ACK]);
  const ackFindingId = await runAiGapFlag(ETHICS_ACK, ETHICS);
  await review.review({ findingId: ackFindingId, action: "reject" });

  // Objectivity threats — edit-accept gap.
  await submitEvidence(OBJECTIVITY_THREATS, [OBJECTIVITY, OBJECTIVITY_THREATS]);
  const threatsFindingId = await runAiGapFlag(OBJECTIVITY_THREATS, OBJECTIVITY);
  await review.review({
    findingId: threatsFindingId,
    action: "edit_accept",
    editedConclusion: EDITED_GAP_CONCLUSION,
  });

  const coiRemediation = createSeeraDemoRemediationItems("en").find(
    (item) => item.questionId === OBJECTIVITY_THREATS,
  );
  await cae.remediation.assign({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    questionId: OBJECTIVITY_THREATS,
    standardNumber: OBJECTIVITY,
    action: coiRemediation?.action ?? "Update COI process",
    owner: coiRemediation?.owner ?? "Audit Manager",
    targetDate: coiRemediation?.targetDate ?? "2026-08-15",
  });

  // COI declarations — AI draft awaiting human review.
  await submitEvidence(COI_DECLARATIONS, [OBJECTIVITY, COI_DECLARATIONS]);
  await runAiGapFlag(COI_DECLARATIONS, OBJECTIVITY);
  await cae.itemStatus.transition({
    assessmentId: SEERA_DEMO_ASSESSMENT_ID,
    questionId: COI_DECLARATIONS,
    to: "under_human_review",
  });

  // Functional reporting — evidence submitted, remediation plan recorded separately in UI fixtures.
  await submitEvidence(FUNCTIONAL_REPORTING, [
    ORG_INDEPENDENCE,
    FUNCTIONAL_REPORTING,
  ]);

  // Working-paper checklists — partial review with unreviewed items per standard.
  const engagement = await cae.workingPaperReview.createEngagement({
    title: "Seera-pilot FY2026 Internal Audit",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    status: "completed",
  });
  const ethicsFile = await cae.workingPaperReview.createFile({
    engagementId: engagement.engagementId,
    name: "Ethics Working Papers",
  });
  const ethicsPaper = await cae.workingPaperReview.createWorkingPaper({
    fileId: ethicsFile.fileId,
    reference: "WP-1.1",
    title: "Code of Ethics Review",
  });
  const ethicsChecklist = await cae.workingPaperReview.createChecklist({
    workingPaperId: ethicsPaper.workingPaperId,
    standardNumber: ETHICS,
    pin: reviewPin,
  });
  const objectivityPaper = await cae.workingPaperReview.createWorkingPaper({
    fileId: ethicsFile.fileId,
    reference: "WP-1.2",
    title: "Objectivity Working Papers",
  });
  const objectivityChecklist = await cae.workingPaperReview.createChecklist({
    workingPaperId: objectivityPaper.workingPaperId,
    standardNumber: OBJECTIVITY,
    pin: reviewPin,
  });
  const independenceFile = await cae.workingPaperReview.createFile({
    engagementId: engagement.engagementId,
    name: "Independence Working Papers",
  });
  const independencePaper = await cae.workingPaperReview.createWorkingPaper({
    fileId: independenceFile.fileId,
    reference: "WP-2.1",
    title: "Organizational Independence Review",
  });
  await cae.workingPaperReview.createChecklist({
    workingPaperId: independencePaper.workingPaperId,
    standardNumber: ORG_INDEPENDENCE,
    pin: reviewPin,
  });

  const wpEngine = new WorkingPaperReviewEngine(cae.workingPaperReview, catalog);
  const ethicsView = await wpEngine.getChecklistReview(ethicsChecklist.checklistId);
  const objectivityView = await wpEngine.getChecklistReview(
    objectivityChecklist.checklistId,
  );
  if (ethicsView.items[0]) {
    await wpEngine.recordConformance({
      checklistId: ethicsChecklist.checklistId,
      checklistItemId: ethicsView.items[0].itemId,
      conformance: "conforms",
    });
  }
  if (objectivityView.items[0]) {
    await wpEngine.recordConformance({
      checklistId: objectivityChecklist.checklistId,
      checklistItemId: objectivityView.items[0].itemId,
      conformance: "conforms",
    });
  }

  await cae.kv.set(SEED_MARKER, "done");
  void createSeeraDemoAssessmentName();
}
