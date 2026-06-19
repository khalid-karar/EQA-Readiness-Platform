import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type { JobQueue } from "@eqa/jobs";
import {
  MOCK_EQA_SIMULATION_JOB,
  type MockEqaSimulationPayload,
  type MockEqaSimulationResult,
} from "@eqa/workflows";
import { readLatestMockEqaSimulation } from "../mock-eqa-system";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

export interface RequestMockEqaSimulationInput {
  readonly assessmentId: string;
  readonly contentPackId: string;
  readonly contentVersion: string;
  readonly engagementId?: string;
  readonly locale?: "en" | "ar";
}

/**
 * Tenant-scoped mock-EQA simulation store. WRITE (CAE / Audit Staff) enqueues
 * the Step 6.5 background job; READ (including Board) retrieves the latest
 * simulation result. Board cannot request a new run.
 */
export class TenantMockEqaRepository extends AuditedRepository {
  constructor(
    exec: ScopedExecutor,
    session: AuthSession,
    private readonly queue: JobQueue | undefined,
  ) {
    super(exec, session);
  }

  async requestSimulation(
    input: RequestMockEqaSimulationInput,
  ): Promise<{ jobId: string }> {
    authorize(this.session, PERMISSIONS.WRITE);
    if (!this.queue) {
      throw new Error("Job queue is not configured for mock-EQA simulation.");
    }

    const payload: MockEqaSimulationPayload = {
      assessmentId: input.assessmentId,
      contentPackId: input.contentPackId,
      contentVersion: input.contentVersion,
      requestedBy: this.session.userId,
      ...(input.engagementId === undefined
        ? {}
        : { engagementId: input.engagementId }),
      ...(input.locale === undefined ? {} : { locale: input.locale }),
    };

    const handle = await this.queue.enqueue({
      name: MOCK_EQA_SIMULATION_JOB,
      tenant: this.session.tenant,
      payload,
    });

    return { jobId: handle.id };
  }

  async getLatest(
    assessmentId: string,
  ): Promise<MockEqaSimulationResult | null> {
    authorize(this.session, PERMISSIONS.READ);
    return readLatestMockEqaSimulation(this.exec, assessmentId);
  }
}
