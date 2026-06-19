/** The kinds of change recorded in the audit log. */
export type AuditAction = "create" | "update" | "delete" | "status_change";

/** Who acted — taken from the authenticated AuthSession (identity + role). */
export interface AuditActor {
  readonly userId: string;
  readonly role: string;
}

/** A change to record. Old/new values are arbitrary and canonicalized on write. */
export interface AuditEvent {
  readonly action: AuditAction;
  /** The logical entity/table affected, e.g. "tenant_kv". */
  readonly entity: string;
  /** The identifier of the affected record. */
  readonly entityId: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

/**
 * A persisted audit entry. `seq` is the per-tenant position (1-based). The entry
 * is part of a hash chain: `entryHash` covers the entry payload plus the
 * previous entry's hash (`prevHash`).
 */
export interface AuditEntry {
  readonly seq: number;
  readonly id: string;
  readonly occurredAt: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly action: AuditAction;
  readonly entity: string;
  readonly entityId: string;
  /** Canonical JSON of the old value, or null. */
  readonly oldValue: string | null;
  /** Canonical JSON of the new value, or null. */
  readonly newValue: string | null;
  readonly prevHash: string;
  readonly entryHash: string;
}

/**
 * Persistence port for the audit log. Implemented by the data layer with a
 * tenant-scoped adapter, so audit entries live in the acting tenant's schema and
 * are tenant-isolated. The port is append/read only — there is no update/delete,
 * so entries cannot be edited or removed through the application.
 */
export interface AuditStore {
  /** The most recent entry (highest seq), or null if the chain is empty. */
  lastRow(): Promise<AuditEntry | null>;
  /** Appends a new entry. */
  appendRow(entry: AuditEntry): Promise<void>;
  /** All entries ordered by seq ascending. */
  listRows(): Promise<AuditEntry[]>;
}
