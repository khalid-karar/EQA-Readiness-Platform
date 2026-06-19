/**
 * @eqa/audit-log
 *
 * Immutable, append-only audit logging. Every recorded change captures who
 * (identity + role), what, when, and old/new values. Entries form a per-tenant
 * cryptographic hash chain so any modification, removal, or reordering of a
 * prior entry is detectable via {@link verifyChain}. There is no API to edit or
 * delete entries — the store port is append/read only.
 *
 * The store is provided by the data layer as a tenant-scoped adapter, so audit
 * entries are themselves tenant-isolated.
 */

export { AuditLog } from "./audit-log";
export {
  computeEntryHash,
  GENESIS_HASH,
  verifyChain,
  type HashableEntry,
  type VerifyResult,
} from "./hash-chain";
export type {
  AuditAction,
  AuditActor,
  AuditEntry,
  AuditEvent,
  AuditStore,
} from "./types";
