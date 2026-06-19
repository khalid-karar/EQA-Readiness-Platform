import { AuditLog } from "@eqa/audit-log";
import type { JobAuditPort } from "@eqa/jobs";
import type {
  EvidenceScanStatus,
  EvidenceScanStatusWriter,
} from "@eqa/storage";
import type { TenantContext } from "@eqa/tenant";
import type { Database } from "./database";
import { TenantAuditStore } from "./scoped/audit-store";
import { ScopedExecutor } from "./scoped/scoped-executor";
import type { Row } from "./sql-client";

/** Actor recorded for system-initiated (non-user) audited writes. */
const SYSTEM_SCAN_ACTOR = { userId: "system:malware-scan", role: "system" };
const SYSTEM_JOB_ACTOR = { userId: "system:jobs", role: "system" };

interface StatusRow extends Row {
  scan_status: string;
  scanner: string | null;
}

/**
 * Builds the system-side writer the malware-scan job uses to record a scan
 * result. It is tenant-scoped (a {@link ScopedExecutor} for the job's resolved
 * tenant) and writes a `status_change` audit entry as a system actor — it is a
 * background system action, not a user mutation, so it carries no user RBAC role
 * but is still tenant-isolated and audited.
 */
export function createEvidenceScanStatusWriter(
  db: Database,
): EvidenceScanStatusWriter {
  return {
    async setScanStatus(
      tenant: TenantContext,
      evidenceId: string,
      version: number,
      status: EvidenceScanStatus,
      scanner: string,
    ): Promise<void> {
      const exec = new ScopedExecutor(db, tenant);
      const beforeRows = await exec.query<StatusRow>(
        `SELECT scan_status, scanner FROM ${exec.table("evidence")}
          WHERE evidence_id = $1 AND version = $2`,
        [evidenceId, version],
      );
      const before = beforeRows[0] ?? null;

      await exec.query(
        `UPDATE ${exec.table("evidence")}
            SET scan_status = $1, scanner = $2
          WHERE evidence_id = $3 AND version = $4`,
        [status, scanner, evidenceId, version],
      );

      const audit = new AuditLog(new TenantAuditStore(exec), SYSTEM_SCAN_ACTOR);
      await audit.append({
        action: "status_change",
        entity: "evidence",
        entityId: `${evidenceId}:v${version}`,
        oldValue: before
          ? { scanStatus: before.scan_status, scanner: before.scanner }
          : null,
        newValue: { scanStatus: status, scanner },
      });
    },
  };
}

/**
 * Builds the {@link JobAuditPort} that records every job outcome into the acting
 * tenant's immutable audit log (Step 4), as a system actor. Wiring this into the
 * job queue composes the Step 6.5 framework with the tenant-scoped audit path so
 * job outputs — including malware-scan results — are audited and tenant-isolated.
 */
export function createTenantJobAuditPort(db: Database): JobAuditPort {
  return {
    async record(outcome): Promise<void> {
      const exec = new ScopedExecutor(db, outcome.tenant);
      const audit = new AuditLog(new TenantAuditStore(exec), SYSTEM_JOB_ACTOR);
      await audit.append({
        action: "status_change",
        entity: `job:${outcome.jobName}`,
        entityId: outcome.jobId,
        oldValue: null,
        newValue: {
          status: outcome.status,
          output: outcome.outputSummary ?? null,
          error: outcome.error ?? null,
        },
      });
    },
  };
}
