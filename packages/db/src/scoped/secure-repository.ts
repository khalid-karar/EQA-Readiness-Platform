import { type AuthSession, authorize, PERMISSIONS } from "@eqa/auth";
import type { TenantCipher } from "@eqa/crypto";
import type { Row } from "../sql-client";
import { AuditedRepository } from "./audited-repository";
import type { ScopedExecutor } from "./scoped-executor";

interface SecureRow extends Row {
  key: string;
  ciphertext: string;
}

/**
 * Stores sensitive field values encrypted at rest with the per-tenant data key
 * (application-level encryption). Plaintext is sealed before it touches the DB
 * and only opened on read; the stored column is always ciphertext. Writes are
 * audited, but the audit entry is redacted so plaintext never reaches the log.
 */
export class TenantSecureRepository extends AuditedRepository {
  constructor(
    exec: ScopedExecutor,
    session: AuthSession,
    private readonly cipher: TenantCipher,
  ) {
    super(exec, session);
  }

  async set(key: string, plaintext: string): Promise<void> {
    authorize(this.session, PERMISSIONS.WRITE);
    const ciphertext = await this.cipher.seal(plaintext);
    await this.recordWrite({
      entity: "tenant_secure_fields",
      entityId: key,
      redact: true,
      readValue: () => this.readCiphertext(key),
      write: () => this.writeRaw(key, ciphertext),
    });
  }

  async get(key: string): Promise<string | null> {
    authorize(this.session, PERMISSIONS.READ);
    const ciphertext = await this.readCiphertext(key);
    return ciphertext === null ? null : this.cipher.open(ciphertext);
  }

  private async readCiphertext(key: string): Promise<string | null> {
    const rows = await this.exec.query<SecureRow>(
      `SELECT key, ciphertext FROM ${this.exec.table("tenant_secure_fields")} WHERE key = $1`,
      [key],
    );
    const row = rows[0];
    return row ? row.ciphertext : null;
  }

  private async writeRaw(key: string, ciphertext: string): Promise<void> {
    await this.exec.query(
      `INSERT INTO ${this.exec.table("tenant_secure_fields")} (key, ciphertext)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET ciphertext = EXCLUDED.ciphertext, updated_at = now()`,
      [key, ciphertext],
    );
  }
}
