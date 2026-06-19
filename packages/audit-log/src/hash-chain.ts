import { canonicalJson, sha256Hex } from "@eqa/crypto";
import type { AuditEntry } from "./types";

/** The previous-hash value used for the first entry in a chain. */
export const GENESIS_HASH = "0".repeat(64);

/** The fields covered by an entry's hash (everything except id and entryHash). */
export interface HashableEntry {
  readonly seq: number;
  readonly occurredAt: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  readonly prevHash: string;
}

/** Computes the hash for an entry from its payload + the previous hash. */
export function computeEntryHash(entry: HashableEntry): string {
  return sha256Hex(
    canonicalJson({
      seq: entry.seq,
      occurredAt: entry.occurredAt,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      prevHash: entry.prevHash,
    }),
  );
}

export type VerifyResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly atSeq: number; readonly reason: string };

/**
 * Verifies the integrity of an audit chain. Detects:
 * - modification — a recomputed hash no longer matches the stored hash;
 * - removal — a gap in the 1..n sequence, or a broken prev-hash link;
 * - reordering — entries whose seq/payload no longer hash to the stored value.
 */
export function verifyChain(entries: readonly AuditEntry[]): VerifyResult {
  const sorted = [...entries].sort((a, b) => a.seq - b.seq);
  let previousHash = GENESIS_HASH;

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index];
    if (!entry) continue;

    const expectedSeq = index + 1;
    if (entry.seq !== expectedSeq) {
      return {
        valid: false,
        atSeq: expectedSeq,
        reason: `sequence break: expected seq ${expectedSeq} but found ${entry.seq} (entry removed or reordered)`,
      };
    }

    if (entry.prevHash !== previousHash) {
      return {
        valid: false,
        atSeq: entry.seq,
        reason: "previous-hash link does not match the prior entry",
      };
    }

    const recomputed = computeEntryHash(entry);
    if (recomputed !== entry.entryHash) {
      return {
        valid: false,
        atSeq: entry.seq,
        reason: "entry hash mismatch (entry was modified)",
      };
    }

    previousHash = entry.entryHash;
  }

  return { valid: true };
}
