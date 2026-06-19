import type { ContentCatalog } from "@eqa/content";
import {
  resolveChecklistItems,
  type AuditEngagement,
  type AuditFile,
  type ChecklistConformance,
  type ChecklistResult,
  type CreateSampleSelectionInput,
  type LocalizedText,
  type RecordChecklistResultInput,
  type ReviewChecklist,
  type ReviewChecklistPin,
  type SampleSelection,
  type WorkingPaper,
} from "@eqa/content";
import {
  ChecklistItemNotFoundError,
  ChecklistNotFoundError,
  EngagementNotCompletedError,
  EngagementNotFoundError,
} from "./errors";

/** Counts of per-item conformance outcomes for aggregation. */
export interface ConformanceCounts {
  readonly totalItems: number;
  readonly conforms: number;
  readonly doesNotConform: number;
  readonly notApplicable: number;
  readonly unreviewed: number;
}

/** Aggregate conformance for one standard within an engagement. */
export interface StandardConformanceSummary {
  readonly standardNumber: string;
  readonly pin: ReviewChecklistPin;
  readonly conforms: number;
  readonly doesNotConform: number;
  readonly notApplicable: number;
  readonly unreviewed: number;
  readonly totalItems: number;
}

/** Aggregate working-paper conformance for an entire engagement. */
export interface EngagementConformanceSummary {
  readonly engagementId: string;
  readonly conforms: number;
  readonly doesNotConform: number;
  readonly notApplicable: number;
  readonly unreviewed: number;
  readonly totalItems: number;
  readonly byStandard: readonly StandardConformanceSummary[];
}

/** A working paper with its attached review checklists. */
export interface WorkingPaperWithChecklists {
  readonly paper: WorkingPaper;
  readonly checklists: readonly ReviewChecklist[];
}

/** An audit file with its working papers and checklists. */
export interface AuditFileWithPapers {
  readonly file: AuditFile;
  readonly papers: readonly WorkingPaperWithChecklists[];
}

/** The full engagement tree for working-paper review. */
export interface EngagementHierarchy {
  readonly engagement: AuditEngagement;
  readonly files: readonly AuditFileWithPapers[];
}

/** One checklist item with its resolved text (from content) and recorded result. */
export interface ChecklistItemReviewView {
  readonly itemId: string;
  /** Resolved from the pinned Step 5 checklist — never duplicated in the DB. */
  readonly text: LocalizedText;
  readonly result: ChecklistResult | null;
}

/** A reviewable checklist view: pinned metadata + items with results. */
export interface WorkingPaperReviewView {
  readonly checklistId: string;
  readonly workingPaperId: string;
  readonly standardNumber: string;
  readonly pin: ReviewChecklistPin;
  readonly items: readonly ChecklistItemReviewView[];
}

export interface RecordConformanceInput {
  readonly checklistId: string;
  readonly checklistItemId: string;
  readonly conformance: ChecklistConformance;
  readonly note?: string;
}

/**
 * Persistence port for the working-paper review workflow. Implemented by the
 * tenant-scoped {@link TenantWorkingPaperReviewRepository} in @eqa/db.
 */
export interface WorkingPaperReviewStore {
  selectSample(input: CreateSampleSelectionInput): Promise<SampleSelection>;
  listSamples(): Promise<SampleSelection[]>;
  listCompletedEngagements(): Promise<AuditEngagement[]>;
  getEngagement(engagementId: string): Promise<AuditEngagement | null>;
  getEngagementHierarchy(
    engagementId: string,
  ): Promise<EngagementHierarchy | null>;
  getChecklist(checklistId: string): Promise<ReviewChecklist | null>;
  getResultsForChecklist(checklistId: string): Promise<ChecklistResult[]>;
  recordResult(input: RecordChecklistResultInput): Promise<ChecklistResult>;
}

/** Counts conformance outcomes against the expected checklist item ids. */
export function countConformance(
  itemIds: readonly string[],
  results: readonly ChecklistResult[],
): ConformanceCounts {
  const byItem = new Map(results.map((r) => [r.checklistItemId, r]));
  let conforms = 0;
  let doesNotConform = 0;
  let notApplicable = 0;
  let unreviewed = 0;
  for (const id of itemIds) {
    const result = byItem.get(id);
    if (!result) {
      unreviewed += 1;
      continue;
    }
    switch (result.conformance) {
      case "conforms":
        conforms += 1;
        break;
      case "does_not_conform":
        doesNotConform += 1;
        break;
      case "not_applicable":
        notApplicable += 1;
        break;
    }
  }
  return {
    totalItems: itemIds.length,
    conforms,
    doesNotConform,
    notApplicable,
    unreviewed,
  };
}

/**
 * Builds a review view for one checklist: resolves item text from the pinned
 * Step 5 content and merges any recorded conformance results.
 */
export function buildChecklistReviewView(
  catalog: ContentCatalog,
  checklist: ReviewChecklist,
  results: readonly ChecklistResult[],
): WorkingPaperReviewView {
  const contentItems = resolveChecklistItems(
    catalog,
    checklist.pin,
    checklist.standardNumber,
  );
  const byItem = new Map(results.map((r) => [r.checklistItemId, r]));
  return {
    checklistId: checklist.checklistId,
    workingPaperId: checklist.workingPaperId,
    standardNumber: checklist.standardNumber,
    pin: checklist.pin,
    items: contentItems.map((item) => ({
      itemId: item.id,
      text: item.text,
      result: byItem.get(item.id) ?? null,
    })),
  };
}

/**
 * Aggregates conformance across all checklists in an engagement hierarchy,
 * grouped per standard. Checklist item counts come from the pinned content.
 */
export function aggregateEngagementConformance(
  hierarchy: EngagementHierarchy,
  catalog: ContentCatalog,
  resultsByChecklist: ReadonlyMap<string, readonly ChecklistResult[]>,
): EngagementConformanceSummary {
  const standardMap = new Map<
    string,
    { pin: ReviewChecklistPin; itemIds: string[]; results: ChecklistResult[] }
  >();

  for (const file of hierarchy.files) {
    for (const { checklists } of file.papers) {
      for (const checklist of checklists) {
        const itemIds = resolveChecklistItems(
          catalog,
          checklist.pin,
          checklist.standardNumber,
        ).map((i) => i.id);
        const results = [
          ...(resultsByChecklist.get(checklist.checklistId) ?? []),
        ];
        const existing = standardMap.get(checklist.standardNumber);
        if (existing) {
          existing.itemIds.push(...itemIds);
          existing.results.push(...results);
        } else {
          standardMap.set(checklist.standardNumber, {
            pin: checklist.pin,
            itemIds: [...itemIds],
            results,
          });
        }
      }
    }
  }

  const byStandard: StandardConformanceSummary[] = [];
  let conforms = 0;
  let doesNotConform = 0;
  let notApplicable = 0;
  let unreviewed = 0;
  let totalItems = 0;

  for (const [standardNumber, data] of standardMap) {
    const counts = countConformance(data.itemIds, data.results);
    byStandard.push({
      standardNumber,
      pin: data.pin,
      conforms: counts.conforms,
      doesNotConform: counts.doesNotConform,
      notApplicable: counts.notApplicable,
      unreviewed: counts.unreviewed,
      totalItems: counts.totalItems,
    });
    conforms += counts.conforms;
    doesNotConform += counts.doesNotConform;
    notApplicable += counts.notApplicable;
    unreviewed += counts.unreviewed;
    totalItems += counts.totalItems;
  }

  byStandard.sort((a, b) => a.standardNumber.localeCompare(b.standardNumber));

  return {
    engagementId: hierarchy.engagement.engagementId,
    conforms,
    doesNotConform,
    notApplicable,
    unreviewed,
    totalItems,
    byStandard,
  };
}

/**
 * The working-paper review workflow. A reviewer tests whether the documented
 * methodology was actually followed in completed audit engagements — not merely
 * that a methodology exists.
 *
 * An authorized reviewer (CAE or Audit Staff; Board is read-only) selects a
 * sample of completed engagements, tests working papers against the
 * Working-Paper Review Checklist (resolved from the pinned Step 5 content), and
 * records per-item conformance with notes.
 *
 * The engine is pure with respect to the data layer: persistence, RBAC, and
 * audit logging go through the injected {@link WorkingPaperReviewStore}.
 * Checklist item text is never duplicated — it is resolved from the content
 * pin at read time via the content catalog.
 */
export class WorkingPaperReviewEngine {
  constructor(
    private readonly store: WorkingPaperReviewStore,
    private readonly catalog: ContentCatalog,
  ) {}

  /** Selects a completed engagement for working-paper review. */
  async selectSample(
    engagementId: string,
    rationale: string,
  ): Promise<SampleSelection> {
    const engagement = await this.store.getEngagement(engagementId);
    if (!engagement) {
      throw new EngagementNotFoundError(
        `No engagement '${engagementId}' in this tenant.`,
      );
    }
    if (engagement.status !== "completed") {
      throw new EngagementNotCompletedError(
        `Only completed engagements can be sampled for review; ` +
          `'${engagementId}' is '${engagement.status}'.`,
      );
    }
    return this.store.selectSample({ engagementId, rationale });
  }

  /** All sample selections for this tenant. */
  listSamples(): Promise<SampleSelection[]> {
    return this.store.listSamples();
  }

  /** Completed engagements available for sampling. */
  listReviewableEngagements(): Promise<AuditEngagement[]> {
    return this.store.listCompletedEngagements();
  }

  /**
   * Returns a checklist review view: item text from pinned content, merged with
   * any recorded conformance results.
   */
  async getChecklistReview(
    checklistId: string,
  ): Promise<WorkingPaperReviewView> {
    const checklist = await this.store.getChecklist(checklistId);
    if (!checklist) {
      throw new ChecklistNotFoundError(
        `No review checklist '${checklistId}' in this tenant.`,
      );
    }
    const results = await this.store.getResultsForChecklist(checklistId);
    return buildChecklistReviewView(this.catalog, checklist, results);
  }

  /**
   * Records a per-item conformance result. Validates the item id against the
   * pinned checklist content before persisting.
   */
  async recordConformance(
    input: RecordConformanceInput,
  ): Promise<ChecklistResult> {
    const checklist = await this.store.getChecklist(input.checklistId);
    if (!checklist) {
      throw new ChecklistNotFoundError(
        `No review checklist '${input.checklistId}' in this tenant.`,
      );
    }
    const itemIds = resolveChecklistItems(
      this.catalog,
      checklist.pin,
      checklist.standardNumber,
    ).map((i) => i.id);
    if (!itemIds.includes(input.checklistItemId)) {
      throw new ChecklistItemNotFoundError(
        `Checklist item '${input.checklistItemId}' is not in the pinned ` +
          `checklist for standard '${checklist.standardNumber}'.`,
      );
    }
    return this.store.recordResult({
      checklistId: input.checklistId,
      checklistItemId: input.checklistItemId,
      conformance: input.conformance,
      ...(input.note === undefined ? {} : { note: input.note }),
    });
  }

  /** Aggregate conformance for an engagement, grouped by standard. */
  async getEngagementConformance(
    engagementId: string,
  ): Promise<EngagementConformanceSummary> {
    const hierarchy = await this.store.getEngagementHierarchy(engagementId);
    if (!hierarchy) {
      throw new EngagementNotFoundError(
        `No engagement '${engagementId}' in this tenant.`,
      );
    }
    const resultsByChecklist = await this.loadAllResults(hierarchy);
    return aggregateEngagementConformance(
      hierarchy,
      this.catalog,
      resultsByChecklist,
    );
  }

  /** Aggregate conformance for one standard within an engagement. */
  async getStandardConformance(
    engagementId: string,
    standardNumber: string,
  ): Promise<StandardConformanceSummary | null> {
    const summary = await this.getEngagementConformance(engagementId);
    return (
      summary.byStandard.find((s) => s.standardNumber === standardNumber) ??
      null
    );
  }

  private async loadAllResults(
    hierarchy: EngagementHierarchy,
  ): Promise<Map<string, ChecklistResult[]>> {
    const map = new Map<string, ChecklistResult[]>();
    for (const file of hierarchy.files) {
      for (const { checklists } of file.papers) {
        for (const checklist of checklists) {
          map.set(
            checklist.checklistId,
            await this.store.getResultsForChecklist(checklist.checklistId),
          );
        }
      }
    }
    return map;
  }
}
