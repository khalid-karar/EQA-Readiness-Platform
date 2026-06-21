/**
 * Step 17 — single end-to-end integration test on the synthetic Seera-pilot tenant.
 * Walks the full readiness loop and asserts standing-rule invariants inline.
 */
import { randomBytes } from "node:crypto";
import { inspect } from "node:util";
import { AiReviewService, LocalStubModelAdapter } from "@eqa/ai";
import {
  ContentCatalog,
  ContentVersionImmutableError,
  loadBundledCatalog,
  type ContentPack,
  type ContentPin,
  type ReviewChecklistPin,
} from "@eqa/content";
import { LocalKms, TenantCipher } from "@eqa/crypto";
import { InMemoryJobQueue } from "@eqa/jobs";
import {
  createMalwareScanHandler,
  EvidenceNotReadyError,
  EvidenceService,
  HmacSignedUrlSigner,
  InMemoryObjectStore,
  MALWARE_SCAN_JOB,
  type MalwareScanner,
} from "@eqa/storage";
import { MissingTenantContextError, type TenantDescriptor } from "@eqa/tenant";
import {
  AI_GAP_FLAG_JOB,
  assertFormalAssessmentResult,
  assertTransition,
  buildDashboardView,
  createEvidencePackHandler,
  createGapFlaggingHandler,
  createMockEqaScoringHandler,
  defaultEvidencePackRenderer,
  EVIDENCE_PACK_EXPORT_JOB,
  EVIDENCE_PACK_KIND,
  GapFlaggingEngine,
  HumanReviewEngine,
  IllegalStatusTransitionError,
  MOCK_EQA_DISCLAIMER,
  MOCK_EQA_SIMULATION_JOB,
  NotFormalAssessmentResultError,
  READINESS_SIMULATION_KIND,
  renderQuestionnaire,
  verifyPdfPackCompliance,
  WorkingPaperReviewEngine,
  SEERA_DEMO_ASSESSMENT_ID,
  SEERA_DEMO_QUESTIONS,
  SEERA_DEMO_RETEST_FAIL_NOTE,
  SEERA_DEMO_STANDARDS,
  createSeeraDemoAssessmentName,
  createSeeraDemoFinalConclusions,
  type GapFlaggingPayload,
  type ItemStatus,
} from "@eqa/workflows";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientFor, type Database } from "./database";
import {
  createEvidencePackLoader,
  createEvidencePackSink,
} from "./evidence-pack-system";
import {
  createEvidenceScanStatusWriter,
  createTenantJobAuditPort,
} from "./evidence-system";
import { createGapFlagSink } from "./gap-flag-system";
import {
  createMockEqaScoringLoader,
  createMockEqaSimulationSink,
} from "./mock-eqa-system";
import { TenantRegistry } from "./registry";
import { createTenantRepositories } from "./repositories";
import { SEERA_PILOT, seedSeeraPilot } from "./seed";
import { contextOf, sessionFor } from "./testing/fixtures";
import { createInMemoryDatabase } from "./testing/in-memory";
import { closeEvidencePackBrowser } from "@eqa/workflows";

const PACK_ID = "eqa-foundations";
const PACK_VERSION = "1.0.0";
const ASSESSMENT = SEERA_DEMO_ASSESSMENT_ID;
const SIGNER_SECRET = "url-signing-secret";
const PDF_BYTES = Buffer.from("%PDF-1.7 synthetic seera evidence");
const RAW_EVIDENCE_MARKER = "%PDF-1.7 synthetic seera evidence";

const {
  ETHICS_CHARTER: Q_ACCEPT,
  ETHICS_ACK: Q_REJECT,
  OBJECTIVITY_THREATS: Q_EDIT,
  COI_DECLARATIONS: Q_PENDING,
  FUNCTIONAL_REPORTING: Q_DOMAIN2,
} = SEERA_DEMO_QUESTIONS;

const {
  ETHICS: STD_11,
  OBJECTIVITY: STD_12,
  ORG_INDEPENDENCE: STD_21,
} = SEERA_DEMO_STANDARDS;

const EDITED_GAP_CONCLUSION =
  createSeeraDemoFinalConclusions()[0]?.conclusion ??
  "Reviewer-edited Seera conclusion: COI process gap confirmed.";

const EVIDENCE_CONFIG = {
  maxBytes: 512_000,
  allowedContentTypes: ["application/pdf"],
  downloadTtlSeconds: 300,
};

describe("Seera-pilot full-loop integration (Step 17)", () => {
  let db: Database;
  let registry: TenantRegistry;
  let kms: LocalKms;
  let queue: InMemoryJobQueue;
  let objectStore: InMemoryObjectStore;
  let catalog: ReturnType<typeof loadBundledCatalog>;
  let seera: TenantDescriptor;
  let pin: ContentPin;
  let reviewPin: ReviewChecklistPin;

  const scanner: MalwareScanner = {
    scan: () => Promise.resolve({ clean: true, scanner: "av-stub" }),
  };

  beforeEach(async () => {
    db = createInMemoryDatabase();
    kms = new LocalKms(randomBytes(32), "test-master");
    registry = new TenantRegistry(db, kms);
    seera = await seedSeeraPilot(db, kms);
    catalog = loadBundledCatalog();
    pin = catalog.pinForAssessment(ASSESSMENT, PACK_ID, PACK_VERSION);
    const pack = catalog.get(PACK_ID, PACK_VERSION);
    reviewPin = {
      contentPackId: pack.meta.contentPackId,
      version: pack.meta.version,
      contentHash: pack.contentHash,
    };

    objectStore = new InMemoryObjectStore("seera-integration-ksa");
    await objectStore.put("raw/evidence/seed.pdf", PDF_BYTES);

    queue = new InMemoryJobQueue(
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
        [MOCK_EQA_SIMULATION_JOB]: createMockEqaScoringHandler({
          loader: createMockEqaScoringLoader(db, catalog),
          sink: createMockEqaSimulationSink(db),
        }),
        [EVIDENCE_PACK_EXPORT_JOB]: createEvidencePackHandler({
          loader: createEvidencePackLoader(db, catalog),
          renderer: defaultEvidencePackRenderer,
          sink: createEvidencePackSink(db, objectStore),
        }),
      },
      { auditPort: createTenantJobAuditPort(db) },
    );
  }, 30_000);

  afterEach(async () => {
    await closeEvidencePackBrowser();
    await db.close();
  }, 30_000);

  afterAll(async () => {
    await closeEvidencePackBrowser();
  }, 30_000);

  function reposFor(
    t: TenantDescriptor,
    role: "cae" | "audit_staff" | "board" = "cae",
  ) {
    return createTenantRepositories(db, sessionFor(contextOf(t), role), {
      jobQueue: queue,
      objectStore,
    });
  }

  async function evidenceServiceFor(t: TenantDescriptor) {
    const tenant = contextOf(t);
    const repos = reposFor(t);
    const cipher = new TenantCipher(
      kms,
      await registry.getEncryptedDataKey(t.slug),
    );
    const service = new EvidenceService({
      store: repos.evidence,
      objectStore,
      cipher,
      signer: new HmacSignedUrlSigner(SIGNER_SECRET),
      queue,
      tenant,
      config: EVIDENCE_CONFIG,
    });
    return { service, repos };
  }

  async function loadStatuses(
    repos: ReturnType<typeof reposFor>,
  ): Promise<Map<string, ItemStatus>> {
    const rows = await repos.itemStatus.getForAssessment(ASSESSMENT);
    return new Map(rows.map((r) => [r.questionId, r.status]));
  }

  function gapPayload(
    questionId: string,
    standardNumber: string,
  ): GapFlaggingPayload {
    return {
      questionId,
      standardNumber,
      pin,
      evidence: {
        excerpts: ["Synthetic excerpt for Seera-pilot integration test."],
        identities: [],
      },
    };
  }

  async function assertDecoyTenantIsolated(
    betaRepos: ReturnType<typeof reposFor>,
    stage: string,
  ): Promise<void> {
    expect(
      await betaRepos.responses.getForAssessment(ASSESSMENT),
      `${stage}: decoy must not read Seera responses`,
    ).toEqual([]);
    expect(
      await betaRepos.draftFindings.getForAssessment(ASSESSMENT),
      `${stage}: decoy must not read Seera drafts`,
    ).toEqual([]);
    expect(
      await betaRepos.humanReview.getForAssessment(ASSESSMENT),
      `${stage}: decoy must not read Seera finals`,
    ).toEqual([]);
    expect(
      await betaRepos.evidence.list(),
      `${stage}: decoy must not read Seera evidence`,
    ).toEqual([]);
    expect(
      await betaRepos.mockEqa.getLatest(ASSESSMENT),
      `${stage}: decoy must not read Seera simulation`,
    ).toBeNull();
    expect(
      await betaRepos.evidencePack.getLatest(ASSESSMENT),
      `${stage}: decoy must not read Seera pack export`,
    ).toBeNull();
  }

  async function prepareEvidenceAndSubmit(
    questionId: string,
    links: readonly string[],
  ): Promise<void> {
    const { service, repos } = await evidenceServiceFor(seera);
    const tenant = contextOf(seera);
    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId,
      to: "evidence_requested",
    });
    const uploaded = await service.upload({
      fileName: `${questionId}-evidence.pdf`,
      contentType: "application/pdf",
      bytes: PDF_BYTES,
      links: [...links],
    });
    expect(uploaded.scanStatus).toBe("quarantined");

    // Rule 9: no download path until scan gate clears.
    await expect(
      service.createDownloadUrl(uploaded.evidenceId, uploaded.version),
    ).rejects.toBeInstanceOf(EvidenceNotReadyError);
    const objectKey = `${tenant.schemaName}/evidence/${uploaded.evidenceId}/v${uploaded.version}`;
    const forged = new HmacSignedUrlSigner(SIGNER_SECRET).sign(
      {
        key: objectKey,
        evidenceId: uploaded.evidenceId,
        version: uploaded.version,
      },
      300,
    );
    await expect(service.resolveDownload(forged.token)).rejects.toBeInstanceOf(
      EvidenceNotReadyError,
    );

    await queue.onIdle();
    const meta = await repos.evidence.get(
      uploaded.evidenceId,
      uploaded.version,
    );
    expect(meta?.scanStatus).toBe("clean");

    const url = await service.createDownloadUrl(
      uploaded.evidenceId,
      uploaded.version,
    );
    const { bytes } = await service.resolveDownload(url.token);
    expect(bytes.equals(PDF_BYTES)).toBe(true);

    await repos.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId,
      to: "evidence_submitted",
    });
  }

  async function runAiGapFlag(
    questionId: string,
    standardNumber: string,
  ): Promise<string> {
    await queue.enqueue({
      name: AI_GAP_FLAG_JOB,
      tenant: contextOf(seera),
      payload: gapPayload(questionId, standardNumber),
    });
    await queue.onIdle();
    const drafts =
      await reposFor(seera).draftFindings.getForAssessment(ASSESSMENT);
    const draft = drafts.find((d) => d.questionId === questionId);
    if (!draft) throw new Error(`expected draft for ${questionId}`);
    expect(draft.status).toBe("draft");
    expect(draft.kind).toBe("draft_finding");
    expect(draft.provenance.promptVersion).toBeTruthy();
    expect(draft.provenance.rubricVersion).toBeTruthy();
    expect(draft.provenance.modelAdapter).toBeTruthy();
    expect(draft.provenance.adapterLocation).toBe("local");
    expect(draft.provenance.inputSummary.length).toBeGreaterThan(0);
    expect(draft.provenance.output).toBe(draft.draftSummary);
    expect(draft.provenance.timestamp).toBeTruthy();
    expect(draft.contentPin.contentHash).toBe(pin.contentHash);
    if (!draft.findingId)
      throw new Error(`expected findingId for ${questionId}`);
    return draft.findingId;
  }

  it("walks the full Seera-pilot synthetic loop end-to-end", async () => {
    const cae = reposFor(seera, "cae");
    const beta = await registry.createTenant({
      slug: "beta-co",
      name: "Beta Co",
    });
    const betaRepos = reposFor(beta, "cae");

    // --- unscoped repository access fails (rule 7) ---
    expect(() => createTenantRepositories(db, null)).toThrow(
      MissingTenantContextError,
    );
    expect(() => createTenantRepositories(db, undefined)).toThrow(
      MissingTenantContextError,
    );

    // --- envelope encryption: no plaintext data key persisted (rule 8) ---
    const { rows: keyRows } = await clientFor(db).query<{
      data_key_ciphertext: string;
    }>(`SELECT data_key_ciphertext FROM platform.tenants WHERE slug = $1`, [
      seera.slug,
    ]);
    const storedKey = keyRows[0]?.data_key_ciphertext ?? "";
    expect(storedKey.length).toBeGreaterThan(40);
    const encrypted = await registry.getEncryptedDataKey(seera.slug);
    const roundTrip = await kms.decryptDataKey(encrypted);
    expect(storedKey).not.toBe(roundTrip.toString("base64"));
    expect(JSON.stringify(encrypted)).not.toContain(roundTrip.toString("hex"));
    expect(inspect(kms)).toMatch(/REDACTED/i);

    // --- pinned content version is immutable once used (rule 11) ---
    const immutCatalog = new ContentCatalog();
    const bundledPack = catalog.get(PACK_ID, PACK_VERSION);
    immutCatalog.register(bundledPack);
    immutCatalog.pinForAssessment(ASSESSMENT, PACK_ID, PACK_VERSION);
    const tamperedPack: ContentPack = {
      ...bundledPack,
      contentHash: "b".repeat(64),
    };
    expect(() => immutCatalog.register(tamperedPack)).toThrow(
      ContentVersionImmutableError,
    );
    expect(immutCatalog.isInUse(PACK_ID, PACK_VERSION)).toBe(true);

    // Decoy tenant activity while Seera walk proceeds (rule 1 isolation).
    await betaRepos.kv.set("decoy-marker", "beta-only");
    await betaRepos.responses.submit({
      assessmentId: "assessment-beta-decoy",
      questionId: "Q-9-9-9",
      answer: "decoy",
      pin: {
        contentPackId: pin.contentPackId,
        version: pin.version,
        contentHash: pin.contentHash,
      },
    });
    await assertDecoyTenantIsolated(betaRepos, "after decoy seed");

    // --- illegal state transition rejected (rule 8 state machine) ---
    await expect(
      cae.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: Q_ACCEPT,
        to: "gap_confirmed",
      }),
    ).rejects.toBeInstanceOf(IllegalStatusTransitionError);

    expect(() =>
      assertTransition("under_human_review", "closed_ready"),
    ).toThrow(IllegalStatusTransitionError);

    // --- questionnaire responses pinned to content version (rules 3, 11) ---
    await cae.responses.submit({
      assessmentId: ASSESSMENT,
      questionId: Q_ACCEPT,
      answer: "4",
      note: "Synthetic Seera ethics response",
      pin: {
        contentPackId: pin.contentPackId,
        version: pin.version,
        contentHash: pin.contentHash,
      },
    });
    await cae.responses.submit({
      assessmentId: ASSESSMENT,
      questionId: Q_REJECT,
      answer: "3",
      pin: {
        contentPackId: pin.contentPackId,
        version: pin.version,
        contentHash: pin.contentHash,
      },
    });
    await cae.responses.submit({
      assessmentId: ASSESSMENT,
      questionId: Q_EDIT,
      answer: "2",
      pin: {
        contentPackId: pin.contentPackId,
        version: pin.version,
        contentHash: pin.contentHash,
      },
    });

    const responses = await cae.responses.getForAssessment(ASSESSMENT);
    expect(responses).toHaveLength(3);
    for (const row of responses) {
      expect(row.pin.contentHash).toBe(pin.contentHash);
      expect(row.pin.version).toBe(PACK_VERSION);
    }
    await assertDecoyTenantIsolated(betaRepos, "after questionnaire");

    // --- evidence upload + scan gate (rule 9) ---
    await prepareEvidenceAndSubmit(Q_ACCEPT, [STD_11, Q_ACCEPT]);
    await prepareEvidenceAndSubmit(Q_REJECT, [STD_11, Q_REJECT]);
    await prepareEvidenceAndSubmit(Q_EDIT, [STD_12, Q_EDIT]);
    await assertDecoyTenantIsolated(betaRepos, "after evidence uploads");

    // --- AI drafts gap findings (rules 10, 12) ---
    const acceptFindingId = await runAiGapFlag(Q_ACCEPT, STD_11);
    const rejectFindingId = await runAiGapFlag(Q_REJECT, STD_11);
    const editFindingId = await runAiGapFlag(Q_EDIT, STD_12);

    expect((await cae.itemStatus.getStatus(ASSESSMENT, Q_ACCEPT))?.status).toBe(
      "ai_flagged",
    );
    await assertDecoyTenantIsolated(betaRepos, "after AI gap drafts");

    const auditBeforeReview = (await cae.audit.list()).length;

    // --- human accept, reject, edit_accept (rule 12 — createFinalConclusion only) ---
    const review = new HumanReviewEngine(cae.humanReview);

    const accepted = await review.review({
      findingId: acceptFindingId,
      action: "accept",
    });
    expect(accepted.finalItemStatus).toBe("gap_confirmed");

    const rejected = await review.review({
      findingId: rejectFindingId,
      action: "reject",
    });
    expect(rejected.finalItemStatus).toBe("reviewed_no_gap");
    expect(rejected.outcome.finalConclusion).toBeNull();

    const editedText = EDITED_GAP_CONCLUSION;
    const edited = await review.review({
      findingId: editFindingId,
      action: "edit_accept",
      editedConclusion: editedText,
    });
    expect(edited.finalItemStatus).toBe("gap_confirmed");
    expect(edited.outcome.editedText).toBe(editedText);

    const finals = await cae.humanReview.getForAssessment(ASSESSMENT);
    expect(finals.some((f) => f.questionId === Q_ACCEPT)).toBe(true);
    expect(finals.some((f) => f.questionId === Q_EDIT)).toBe(true);
    expect(finals.some((f) => f.questionId === Q_REJECT)).toBe(false);
    expect(
      (await cae.audit.list()).some((e) => e.entity === "human_review_decision"),
    ).toBe(true);
    expect((await cae.audit.list()).length).toBeGreaterThan(auditBeforeReview);

    // dismissed AI finding has no final conclusion; shortcut from review is forbidden
    expect((await cae.itemStatus.getStatus(ASSESSMENT, Q_REJECT))?.status).toBe(
      "reviewed_no_gap",
    );
    const rejectFinals = await cae.humanReview.getForAssessment(ASSESSMENT);
    expect(rejectFinals.some((f) => f.questionId === Q_REJECT)).toBe(false);

    await betaRepos.itemStatus.transition({
      assessmentId: "assessment-beta-decoy",
      questionId: "Q-9-9-9",
      to: "evidence_requested",
    });
    await assertDecoyTenantIsolated(betaRepos, "after human review");

    // --- principle-2 and pending-review coverage (non-trivial, not all-zero) ---
    await cae.responses.submit({
      assessmentId: ASSESSMENT,
      questionId: Q_PENDING,
      answer: "Partial",
      note: "Awaiting CAE review of submitted evidence",
      pin: {
        contentPackId: pin.contentPackId,
        version: pin.version,
        contentHash: pin.contentHash,
      },
    });
    await cae.responses.submit({
      assessmentId: ASSESSMENT,
      questionId: Q_DOMAIN2,
      answer: "1",
      note: "Board minutes being compiled",
      pin: {
        contentPackId: pin.contentPackId,
        version: pin.version,
        contentHash: pin.contentHash,
      },
    });

    await prepareEvidenceAndSubmit(Q_PENDING, [STD_12, Q_PENDING]);
    await prepareEvidenceAndSubmit(Q_DOMAIN2, [STD_21, Q_DOMAIN2]);

    const pendingFindingId = await runAiGapFlag(Q_PENDING, STD_12);
    await cae.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: Q_PENDING,
      to: "under_human_review",
    });
    expect(
      (await cae.itemStatus.getStatus(ASSESSMENT, Q_PENDING))?.status,
    ).toBe("under_human_review");
    await expect(
      cae.itemStatus.transition({
        assessmentId: ASSESSMENT,
        questionId: Q_PENDING,
        to: "closed_ready",
      }),
    ).rejects.toBeInstanceOf(IllegalStatusTransitionError);
    expect(pendingFindingId).toBeTruthy();
    expect(
      (await cae.itemStatus.getStatus(ASSESSMENT, Q_DOMAIN2))?.status,
    ).toBe("evidence_submitted");

    // --- working-paper review (pinned checklist) ---
    const engagement = await cae.workingPaperReview.createEngagement({
      title: "Seera-pilot FY2026 Internal Audit",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      status: "completed",
    });
    const file = await cae.workingPaperReview.createFile({
      engagementId: engagement.engagementId,
      name: "Ethics Working Papers",
    });
    const paper = await cae.workingPaperReview.createWorkingPaper({
      fileId: file.fileId,
      reference: "WP-1.1",
      title: "Code of Ethics Review",
    });
    const checklist = await cae.workingPaperReview.createChecklist({
      workingPaperId: paper.workingPaperId,
      standardNumber: STD_11,
      pin: reviewPin,
    });
    const wpEngine = new WorkingPaperReviewEngine(
      cae.workingPaperReview,
      catalog,
    );
    const checklistView = await wpEngine.getChecklistReview(
      checklist.checklistId,
    );
    await wpEngine.recordConformance({
      checklistId: checklist.checklistId,
      checklistItemId: checklistView.items[0]?.itemId ?? "",
      conformance: "does_not_conform",
      note: "Synthetic non-conformance for dashboard rollup.",
    });

    const objectivityPaper = await cae.workingPaperReview.createWorkingPaper({
      fileId: file.fileId,
      reference: "WP-1.2",
      title: "Objectivity Working Papers",
    });
    const objectivityChecklist = await cae.workingPaperReview.createChecklist({
      workingPaperId: objectivityPaper.workingPaperId,
      standardNumber: STD_12,
      pin: reviewPin,
    });
    expect(objectivityChecklist.checklistId).toBeTruthy();

    const independenceFile = await cae.workingPaperReview.createFile({
      engagementId: engagement.engagementId,
      name: "Independence Working Papers",
    });
    const independencePaper = await cae.workingPaperReview.createWorkingPaper({
      fileId: independenceFile.fileId,
      reference: "WP-2.1",
      title: "Organizational Independence Review",
    });
    const independenceChecklist = await cae.workingPaperReview.createChecklist({
      workingPaperId: independencePaper.workingPaperId,
      standardNumber: STD_21,
      pin: reviewPin,
    });
    expect(independenceChecklist.checklistId).toBeTruthy();

    // --- remediation lifecycle with one failed retest (Q_ACCEPT) ---
    const remediation = await cae.remediation.assign({
      assessmentId: ASSESSMENT,
      questionId: Q_ACCEPT,
      standardNumber: STD_11,
      action: "Update ethics acknowledgement process",
      owner: "Audit Manager",
      targetDate: "2026-12-31",
    });
    expect((await cae.itemStatus.getStatus(ASSESSMENT, Q_ACCEPT))?.status).toBe(
      "remediation_in_progress",
    );

    await cae.remediation.markReadyForRetest(remediation.remediationId);
    await cae.remediation.recordRetestFail(
      remediation.remediationId,
      SEERA_DEMO_RETEST_FAIL_NOTE,
    );
    expect((await cae.itemStatus.getStatus(ASSESSMENT, Q_ACCEPT))?.status).toBe(
      "under_human_review",
    );

    await cae.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: Q_ACCEPT,
      to: "gap_confirmed",
    });
    await cae.itemStatus.transition({
      assessmentId: ASSESSMENT,
      questionId: Q_ACCEPT,
      to: "remediation_in_progress",
    });
    await cae.remediation.markReadyForRetest(remediation.remediationId);
    await cae.remediation.recordRetestPass(remediation.remediationId);
    expect((await cae.itemStatus.getStatus(ASSESSMENT, Q_ACCEPT))?.status).toBe(
      "closed_ready",
    );

    const gapRemediation = await cae.remediation.assign({
      assessmentId: ASSESSMENT,
      questionId: Q_EDIT,
      standardNumber: STD_12,
      action: "Update conflict-of-interest declaration process",
      owner: "Audit Manager",
      targetDate: "2026-08-01",
    });
    expect((await cae.itemStatus.getStatus(ASSESSMENT, Q_EDIT))?.status).toBe(
      "remediation_in_progress",
    );
    expect(gapRemediation.questionId).toBe(Q_EDIT);

    // --- dashboard reflects readiness ---
    const statuses = await loadStatuses(cae);
    const questionnaire = renderQuestionnaire(
      catalog.get(PACK_ID, PACK_VERSION),
      "en",
    );
    const conformance = await wpEngine.getEngagementConformance(
      engagement.engagementId,
    );
    const conformanceByStandard = new Map(
      conformance.byStandard.map((s) => [s.standardNumber, s]),
    );
    const dashboard = buildDashboardView({
      assessmentId: ASSESSMENT,
      assessmentName: createSeeraDemoAssessmentName(),
      locale: "en",
      role: "cae",
      questionnaire,
      statusesByQuestion: statuses,
      conformanceByStandard,
      pendingReviewCount: 1,
    });
    expect(dashboard.overallReadiness.score).toBeGreaterThan(0);
    expect(dashboard.overallReadiness.score).toBeLessThan(100);
    const std11 = dashboard.heatMap
      .flatMap((d) => d.principles)
      .flatMap((p) => p.standards)
      .find((s) => s.standardNumber === STD_11);
    const std12 = dashboard.heatMap
      .flatMap((d) => d.principles)
      .flatMap((p) => p.standards)
      .find((s) => s.standardNumber === STD_12);
    expect(std12?.dominantStatus).toBe("remediation_in_progress");
    expect(std11?.statusBreakdown?.closed_ready).toBe(1);
    expect(std11?.statusBreakdown?.reviewed_no_gap).toBe(1);

    const std21 = dashboard.heatMap
      .flatMap((d) => d.principles)
      .flatMap((p) => p.standards)
      .find((s) => s.standardNumber === STD_21);
    expect(std21?.dominantStatus).toBe("evidence_submitted");
    expect(std21?.conformance?.unreviewed).toBeGreaterThan(0);

    const orgConformance = conformanceByStandard.get(STD_21);
    expect(orgConformance?.unreviewed).toBeGreaterThan(0);

    // --- mock-EQA simulation (cannot become formal result) ---
    await cae.mockEqa.requestSimulation({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
      engagementId: engagement.engagementId,
      locale: "en",
    });
    await queue.onIdle();

    const simulation = await cae.mockEqa.getLatest(ASSESSMENT);
    expect(simulation).not.toBeNull();
    expect(simulation?.kind).toBe(READINESS_SIMULATION_KIND);
    expect(simulation?.disclaimer).toEqual(MOCK_EQA_DISCLAIMER);
    expect(() => assertFormalAssessmentResult(simulation)).toThrow(
      NotFormalAssessmentResultError,
    );
    const orgRating = simulation?.domains[0]?.standards.find(
      (s) => s.standardNumber === STD_21,
    );
    expect(
      orgRating?.drivingGaps.some((gap) => gap.source === "wp_unreviewed"),
    ).toBe(true);

    // --- evidence-pack export (no raw bytes, disclaimer present) ---
    const { jobId: packJobId } = await cae.evidencePack.requestExport({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
      locale: "en",
    });
    await queue.onIdle();

    const seeraPackExport = await cae.evidencePack.getLatest(ASSESSMENT);
    expect(seeraPackExport).not.toBeNull();
    expect(seeraPackExport?.manifest.kind).toBe(EVIDENCE_PACK_KIND);
    expect(seeraPackExport?.manifest.bundledFileCount).toBe(0);
    expect(seeraPackExport?.manifest.includeRawEvidence).toBe(false);
    expect(seeraPackExport?.manifest.rawEvidenceExcluded).toBe(true);
    expect(seeraPackExport?.manifest.assessorDisclaimer).toEqual(
      MOCK_EQA_DISCLAIMER,
    );

    const pdf = await cae.evidencePack.readPdfBytes(seeraPackExport!.objectKey);
    expect(pdf).not.toBeNull();
    expect(await verifyPdfPackCompliance(pdf!)).toBe(true);
    expect(Buffer.from(pdf!).toString("latin1")).not.toContain(
      RAW_EVIDENCE_MARKER,
    );

    // --- tenant isolation: no read crosses tenants (rule 1) ---
    await assertDecoyTenantIsolated(betaRepos, "final isolation");
    expect(await betaRepos.kv.get("decoy-marker")).toBe("beta-only");
    expect(await cae.kv.get("decoy-marker")).toBeNull();

    const seeraPack = seeraPackExport;
    expect(seeraPack?.objectKey).toContain("tenant_seera_pilot");
    const seeraStd11 = seeraPack?.manifest.standards.find(
      (s) => s.standardNumber === STD_11,
    );
    const seeraStd12 = seeraPack?.manifest.standards.find(
      (s) => s.standardNumber === STD_12,
    );
    const seeraStd21 = seeraPack?.manifest.standards.find(
      (s) => s.standardNumber === STD_21,
    );
    expect(seeraStd11?.evidenceIndex.length).toBeGreaterThan(0);
    expect(
      seeraStd12?.questions.some((q) => q.status === "remediation_in_progress"),
    ).toBe(true);
    expect(seeraStd21?.questions.some((q) => q.questionId === Q_DOMAIN2)).toBe(
      true,
    );
    expect(
      seeraStd12?.questions.find((q) => q.questionId === Q_EDIT)?.gapFinding,
    ).toBe(EDITED_GAP_CONCLUSION);
    expect(
      seeraStd11?.questions.some(
        (q) => q.questionId === Q_ACCEPT && q.status === "closed_ready",
      ),
    ).toBe(true);

    const remediations = await cae.remediation.listForAssessment(ASSESSMENT);
    const ethicsRemediation = remediations.find(
      (r) => r.questionId === Q_ACCEPT,
    );
    expect(ethicsRemediation?.retestNote).toBe(SEERA_DEMO_RETEST_FAIL_NOTE);
    expect(
      remediations.some((r) => r.questionId === Q_EDIT && !r.closedAt),
    ).toBe(true);

    await betaRepos.evidencePack.requestExport({
      assessmentId: ASSESSMENT,
      contentPackId: PACK_ID,
      contentVersion: PACK_VERSION,
    });
    await queue.onIdle();
    const betaPack = await betaRepos.evidencePack.getLatest(ASSESSMENT);
    expect(betaPack?.objectKey).toContain("tenant_beta_co");
    expect(
      betaPack?.manifest.standards.every((s) =>
        s.questions.every((q) => q.status === "not_assessed"),
      ),
    ).toBe(true);
    expect(seeraPack?.exportId).not.toBe(betaPack?.exportId);

    // --- audit chain intact (rule 4) ---
    expect((await cae.audit.verify()).valid).toBe(true);
    const audit = await cae.audit.list();
    expect(
      audit.some(
        (e) =>
          e.entity === `job:${MOCK_EQA_SIMULATION_JOB}` ||
          e.entity === `job:${EVIDENCE_PACK_EXPORT_JOB}`,
      ),
    ).toBe(true);
    expect(
      audit.some(
        (e) =>
          e.entity === `job:${EVIDENCE_PACK_EXPORT_JOB}` &&
          e.entityId === packJobId,
      ),
    ).toBe(true);

    // Seera tenant identity preserved (rule 5 — synthetic only)
    expect(seera.slug).toBe(SEERA_PILOT.slug);
  }, 120_000);
});
