import { randomUUID } from "node:crypto";
import { canonicalJson } from "@eqa/crypto";
import {
  computeEntryHash,
  GENESIS_HASH,
  verifyChain,
  type VerifyResult,
} from "./hash-chain";
import type { AuditActor, AuditEntry, AuditEvent, AuditStore } from "./types";

function canonicalOrNull(value: unknown): string | null {
  return value === undefined || value === null ? null : canonicalJson(value);
}

/**
 * Append-only audit log over a tenant-scoped {@link AuditStore}. Each appended
 * entry extends the per-tenant hash chain. There is no method to edit or delete
 * an entry. `verify()` re-validates the whole chain.
 */
export class AuditLog {
  constructor(
    private readonly store: AuditStore,
    private readonly actor: AuditActor,
  ) {}

  async append(event: AuditEvent): Promise<AuditEntry> {
    const last = await this.store.lastRow();
    const seq = last ? last.seq + 1 : 1;
    const prevHash = last ? last.entryHash : GENESIS_HASH;

    const base = {
      seq,
      occurredAt: new Date().toISOString(),
      actorUserId: this.actor.userId,
      actorRole: this.actor.role,
      action: event.action,
      entity: event.entity,
      entityId: event.entityId,
      oldValue: canonicalOrNull(event.oldValue),
      newValue: canonicalOrNull(event.newValue),
      prevHash,
    };

    const entry: AuditEntry = {
      ...base,
      id: randomUUID(),
      entryHash: computeEntryHash(base),
    };

    await this.store.appendRow(entry);
    return entry;
  }

  list(): Promise<AuditEntry[]> {
    return this.store.listRows();
  }

  async verify(): Promise<VerifyResult> {
    return verifyChain(await this.store.listRows());
  }
}
