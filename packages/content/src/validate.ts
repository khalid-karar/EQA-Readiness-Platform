import { ContentValidationError } from "./errors";
import type {
  ApprovalStatus,
  ChangelogEntry,
  ChecklistItem,
  Domain,
  EvidencePrompt,
  GovernanceMetadata,
  LocalizedText,
  Principle,
  Question,
  RubricLevel,
  ScoringRubric,
  Standard,
} from "./types";

/**
 * The validated content pack body (without the derived content hash). The seed
 * file uses snake_case keys (the authored config schema); this module is the one
 * place that maps that external schema onto the internal camelCase model.
 */
export interface ValidatedPack {
  readonly meta: GovernanceMetadata;
  readonly domains: readonly Domain[];
}

const APPROVAL_STATUSES: readonly ApprovalStatus[] = [
  "draft",
  "in_review",
  "approved",
  "superseded",
];

function fail(message: string, path: string): never {
  throw new ContentValidationError(message, path);
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("expected an object", path);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail("expected an array", path);
  return value;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail("expected a non-empty string", path);
  }
  return value;
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    fail("expected a number", path);
  }
  return value;
}

function asLocalized(value: unknown, path: string): LocalizedText {
  const obj = asObject(value, path);
  return {
    en: asString(obj.en, `${path}.en`),
    ar: asString(obj.ar, `${path}.ar`),
  };
}

function asApprovalStatus(value: unknown, path: string): ApprovalStatus {
  const status = asString(value, path);
  if (!APPROVAL_STATUSES.includes(status as ApprovalStatus)) {
    fail(
      `expected one of ${APPROVAL_STATUSES.join(", ")} but got '${status}'`,
      path,
    );
  }
  return status as ApprovalStatus;
}

function toQuestion(value: unknown, path: string): Question {
  const obj = asObject(value, path);
  return {
    id: asString(obj.id, `${path}.id`),
    text: asLocalized(obj.text, `${path}.text`),
  };
}

function toEvidencePrompt(value: unknown, path: string): EvidencePrompt {
  const obj = asObject(value, path);
  return {
    id: asString(obj.id, `${path}.id`),
    text: asLocalized(obj.text, `${path}.text`),
  };
}

function toRubricLevel(value: unknown, path: string): RubricLevel {
  const obj = asObject(value, path);
  return {
    level: asNumber(obj.level, `${path}.level`),
    label: asLocalized(obj.label, `${path}.label`),
    descriptor: asLocalized(obj.descriptor, `${path}.descriptor`),
  };
}

function toScoringRubric(value: unknown, path: string): ScoringRubric {
  const obj = asObject(value, path);
  const levels = asArray(obj.levels, `${path}.levels`);
  if (levels.length === 0) fail("a rubric needs at least one level", path);
  return {
    levels: levels.map((level, i) =>
      toRubricLevel(level, `${path}.levels[${i}]`),
    ),
  };
}

function toChecklistItem(value: unknown, path: string): ChecklistItem {
  const obj = asObject(value, path);
  return {
    id: asString(obj.id, `${path}.id`),
    text: asLocalized(obj.text, `${path}.text`),
  };
}

function toStandard(value: unknown, path: string): Standard {
  const obj = asObject(value, path);
  return {
    number: asString(obj.number, `${path}.number`),
    title: asLocalized(obj.title, `${path}.title`),
    questions: asArray(obj.questions, `${path}.questions`).map((q, i) =>
      toQuestion(q, `${path}.questions[${i}]`),
    ),
    evidencePrompts: asArray(
      obj.evidence_prompts,
      `${path}.evidence_prompts`,
    ).map((e, i) => toEvidencePrompt(e, `${path}.evidence_prompts[${i}]`)),
    rubric: toScoringRubric(obj.scoring_rubric, `${path}.scoring_rubric`),
    reviewChecklist: asArray(
      obj.review_checklist,
      `${path}.review_checklist`,
    ).map((c, i) => toChecklistItem(c, `${path}.review_checklist[${i}]`)),
  };
}

function toPrinciple(value: unknown, path: string): Principle {
  const obj = asObject(value, path);
  return {
    id: asString(obj.id, `${path}.id`),
    number: asString(obj.number, `${path}.number`),
    title: asLocalized(obj.title, `${path}.title`),
    standards: asArray(obj.standards, `${path}.standards`).map((s, i) =>
      toStandard(s, `${path}.standards[${i}]`),
    ),
  };
}

function toDomain(value: unknown, path: string): Domain {
  const obj = asObject(value, path);
  return {
    id: asString(obj.id, `${path}.id`),
    number: asString(obj.number, `${path}.number`),
    title: asLocalized(obj.title, `${path}.title`),
    principles: asArray(obj.principles, `${path}.principles`).map((p, i) =>
      toPrinciple(p, `${path}.principles[${i}]`),
    ),
  };
}

function toChangelogEntry(value: unknown, path: string): ChangelogEntry {
  const obj = asObject(value, path);
  return {
    version: asString(obj.version, `${path}.version`),
    date: asString(obj.date, `${path}.date`),
    author: asString(obj.author, `${path}.author`),
    summary: asLocalized(obj.summary, `${path}.summary`),
  };
}

function toMetadata(obj: Record<string, unknown>): GovernanceMetadata {
  return {
    taxonomyVersion: asString(obj.taxonomy_version, "taxonomy_version"),
    contentPackId: asString(obj.content_pack, "content_pack"),
    version: asString(obj.version, "version"),
    author: asString(obj.author, "author"),
    reviewer: asString(obj.reviewer, "reviewer"),
    approvalStatus: asApprovalStatus(obj.approval_status, "approval_status"),
    effectiveDate: asString(obj.effective_date, "effective_date"),
    changelog: asArray(obj.changelog, "changelog").map((entry, i) =>
      toChangelogEntry(entry, `changelog[${i}]`),
    ),
  };
}

/** Validates a parsed seed document into the internal content model. */
export function validateContentPack(raw: unknown): ValidatedPack {
  const root = asObject(raw, "<root>");
  const domains = asArray(root.domains, "domains").map((d, i) =>
    toDomain(d, `domains[${i}]`),
  );
  if (domains.length === 0) {
    fail("a content pack needs at least one domain", "domains");
  }
  return { meta: toMetadata(root), domains };
}
