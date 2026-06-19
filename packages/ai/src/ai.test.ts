import {
  InMemoryJobQueue,
  type JobAuditPort,
  type JobOutcomeAudit,
} from "@eqa/jobs";
import type { TenantContext } from "@eqa/tenant";
import { describe, expect, it } from "vitest";
import {
  createModelAdapter,
  InKingdomModelAdapter,
  LocalStubModelAdapter,
} from "./adapters";
import {
  DataMinimizationError,
  ExternalAdapterNotAllowedError,
  RedactionError,
} from "./errors";
import { assertNoNames } from "./redaction";
import { AI_REVIEW_JOB, createAiReviewHandler } from "./review-job";
import { AiReviewService } from "./service";
import type {
  EvidenceReviewInput,
  Identity,
  InferenceClient,
  InferenceRequest,
  InferenceResult,
  ModelAdapter,
} from "./types";

const TENANT: TenantContext = {
  tenantId: "t-1",
  slug: "seera-pilot",
  name: "Seera Pilot",
  schemaName: "tenant_seera_pilot",
};

const IDENTITIES: Identity[] = [
  { name: "Khalid Al-Otaibi", role: "cae" },
  { name: "Sara Tan", role: "board" },
  { name: "Omar", role: "audit_staff" },
];

/** A model adapter that records exactly what it is asked to infer. */
class RecordingAdapter implements ModelAdapter {
  readonly id = "recording-stub";
  readonly location = "in-kingdom" as const;
  readonly calls: InferenceRequest[] = [];

  infer(request: InferenceRequest): Promise<InferenceResult> {
    this.calls.push(request);
    return Promise.resolve({ output: "DRAFT OUTPUT", model: this.id });
  }
}

function reviewInput(
  overrides: Partial<EvidenceReviewInput> = {},
): EvidenceReviewInput {
  return {
    promptVersion: "prompt-2.1",
    rubricVersion: "rubric-1.0",
    excerpts: ["The control owner signed off on the quarterly reconciliation."],
    metadata: { standard: "S1.1", questionId: "Q-1-1-1", attachmentCount: 2 },
    summary: "Synthetic redacted summary of the evidence.",
    identities: IDENTITIES,
    ...overrides,
  };
}

describe("AI inference layer (Step 9)", () => {
  it("no raw file body can reach the inference interface", async () => {
    const adapter = new RecordingAdapter();
    const service = new AiReviewService(adapter);

    // An over-long excerpt stands in for a raw file body pasted in as text.
    const rawFileBody = "A".repeat(5000);
    await expect(
      service.review(reviewInput({ excerpts: [rawFileBody] })),
    ).rejects.toBeInstanceOf(DataMinimizationError);

    // Non-textual/binary content is rejected too.
    await expect(
      service.review(
        reviewInput({
          // Simulate a caller smuggling raw bytes past the types.
          excerpts: [Buffer.from("%PDF-1.7 raw") as unknown as string],
        }),
      ),
    ).rejects.toBeInstanceOf(DataMinimizationError);

    // Binary metadata is rejected.
    await expect(
      service.review(
        reviewInput({
          metadata: {
            blob: Buffer.from("x") as unknown as string,
          },
        }),
      ),
    ).rejects.toBeInstanceOf(DataMinimizationError);

    // Crucially, the model was never called for any of the rejected inputs.
    expect(adapter.calls).toHaveLength(0);
  });

  it("no un-redacted personal name can reach the inference interface", async () => {
    const adapter = new RecordingAdapter();
    const service = new AiReviewService(adapter);

    await service.review(
      reviewInput({
        excerpts: [
          "Khalid Al-Otaibi approved the control; Sara Tan abstained; Omar prepared it.",
        ],
        summary: "Reviewed by Khalid Al-Otaibi.",
      }),
    );

    const seen = adapter.calls[0];
    expect(seen).toBeDefined();
    const sentText = [...(seen?.excerpts ?? []), seen?.summary ?? ""].join(
      "\n",
    );
    // Names are gone…
    expect(sentText).not.toMatch(/Khalid/);
    expect(sentText).not.toMatch(/Sara Tan/);
    expect(sentText).not.toMatch(/Omar/);
    // …replaced by role tokens.
    expect(sentText).toContain("[CAE]");
    expect(sentText).toContain("[BOARD]");
    expect(sentText).toContain("[AUDIT_STAFF]");
  });

  it("the post-redaction guard rejects any name that slips through", () => {
    expect(() =>
      assertNoNames("Approved by Khalid Al-Otaibi.", IDENTITIES),
    ).toThrow(RedactionError);
    // The error must not echo the offending value.
    try {
      assertNoNames("Approved by Khalid Al-Otaibi.", IDENTITIES);
    } catch (error) {
      expect((error as Error).message).not.toMatch(/Khalid/);
    }
  });

  it("records prompt version, rubric version, and model adapter on every call", async () => {
    const adapter = new RecordingAdapter();
    const service = new AiReviewService(adapter, {
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    const first = await service.review(reviewInput());
    const second = await service.review(
      reviewInput({ promptVersion: "prompt-3.0", rubricVersion: "rubric-2.0" }),
    );

    for (const outcome of [first, second]) {
      expect(outcome.provenance.modelAdapter).toBe("recording-stub");
      expect(outcome.provenance.adapterLocation).toBe("in-kingdom");
      expect(outcome.provenance.output).toBe("DRAFT OUTPUT");
      expect(outcome.provenance.timestamp).toBe("2026-01-01T00:00:00.000Z");
      expect(outcome.provenance.inputSummary).toContain("prompt=");
      // The summary is structural only — it carries no personal content.
      expect(outcome.provenance.inputSummary).not.toMatch(/Khalid/);
    }
    expect(first.provenance.promptVersion).toBe("prompt-2.1");
    expect(first.provenance.rubricVersion).toBe("rubric-1.0");
    expect(second.provenance.promptVersion).toBe("prompt-3.0");
    expect(second.provenance.rubricVersion).toBe("rubric-2.0");
  });

  it("the model is swappable by config, with no external path for evidence", async () => {
    // Local stub.
    const local = createModelAdapter({ driver: "local-stub" });
    expect(local).toBeInstanceOf(LocalStubModelAdapter);
    expect(local.location).toBe("local");

    // In-Kingdom self-hosted model via an injected client (future HUMAIN, etc.).
    const client: InferenceClient = {
      modelId: "ksa-llm-1",
      complete: () => Promise.resolve("KSA DRAFT"),
    };
    const inKingdom = createModelAdapter({ driver: "in-kingdom", client });
    expect(inKingdom).toBeInstanceOf(InKingdomModelAdapter);
    expect(inKingdom.location).toBe("in-kingdom");
    expect(inKingdom.id).toBe("in-kingdom:ksa-llm-1");

    // Swapping the adapter swaps the model with no other code change.
    const out = await new AiReviewService(inKingdom).review(reviewInput());
    expect(out.result.output).toBe("KSA DRAFT");
    expect(out.result.model).toBe("ksa-llm-1");

    // An external-API adapter is not a usable path: the service fails closed.
    const external: ModelAdapter = {
      id: "frontier-api",
      location: "external",
      infer: () => Promise.resolve({ output: "should never run", model: "x" }),
    };
    expect(() => new AiReviewService(external)).toThrow(
      ExternalAdapterNotAllowedError,
    );
  });

  it("runs as a tenant-scoped job whose outcome is audited via the job-audit port", async () => {
    const service = new AiReviewService(new LocalStubModelAdapter());
    const audited: JobOutcomeAudit[] = [];
    const auditPort: JobAuditPort = {
      record: (outcome) => {
        audited.push(outcome);
        return Promise.resolve();
      },
    };
    const queue = new InMemoryJobQueue(
      { [AI_REVIEW_JOB]: createAiReviewHandler({ service }) },
      { auditPort },
    );

    const handle = await queue.enqueue({
      name: AI_REVIEW_JOB,
      tenant: TENANT,
      payload: reviewInput(),
    });
    await queue.onIdle();

    const status = await queue.getStatus(handle.id);
    expect(status?.status).toBe("completed");
    expect(status?.tenantId).toBe(TENANT.tenantId);

    // The outcome was audited via the tenant-scoped job-audit port, carrying the
    // provenance (prompt/rubric/adapter).
    expect(audited).toHaveLength(1);
    const outcome = audited[0];
    expect(outcome?.status).toBe("completed");
    expect(outcome?.tenant.tenantId).toBe(TENANT.tenantId);
    const provenance = outcome?.outputSummary as {
      promptVersion: string;
      rubricVersion: string;
      modelAdapter: string;
    };
    expect(provenance.promptVersion).toBe("prompt-2.1");
    expect(provenance.rubricVersion).toBe("rubric-1.0");
    expect(provenance.modelAdapter).toBe("local-stub");
  });

  it("a job without a resolved tenant context fails (never runs un-scoped)", async () => {
    const service = new AiReviewService(new LocalStubModelAdapter());
    const queue = new InMemoryJobQueue({
      [AI_REVIEW_JOB]: createAiReviewHandler({ service }),
    });

    const handle = await queue.enqueue({
      name: AI_REVIEW_JOB,
      // Missing schema — not a resolved tenant context.
      tenant: { tenantId: "t-x", slug: "x", name: "x", schemaName: "" },
      payload: reviewInput(),
    });
    await queue.onIdle();

    expect((await queue.getStatus(handle.id))?.status).toBe("failed");
  });
});
