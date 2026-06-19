/**
 * A per-tenant data key in its encrypted (wrapped) form. This is the only form
 * that may ever be persisted. It carries no plaintext key material.
 */
export interface EncryptedDataKey {
  /** Base64 of the data key encrypted under the KMS master key. */
  readonly ciphertext: string;
  /** Identifier of the master key that wrapped this data key. */
  readonly masterKeyId: string;
}

/** The result of generating a new data key: plaintext (in memory only) + wrapped form. */
export interface GeneratedDataKey {
  /**
   * Plaintext data key. Exists only in memory during request processing and
   * must never be logged, returned to clients, or persisted. Callers should
   * zero it after use (see `withDataKey`).
   */
  readonly plaintext: Buffer;
  /** The encrypted data key, safe to persist. */
  readonly encrypted: EncryptedDataKey;
}

/**
 * Swappable Key Management Service abstraction (envelope encryption).
 *
 * The master key lives inside the KMS and never leaves it; the KMS only ever
 * hands back encrypted data keys, or the plaintext of a data key it previously
 * wrapped. A real implementation (e.g. a Saudi-resident KMS) can replace the
 * local dev stub without touching callers.
 */
export interface Kms {
  /** Identifier of the active master key. */
  readonly masterKeyId: string;
  /** Generates a fresh data key, returning both plaintext and wrapped forms. */
  generateDataKey(): Promise<GeneratedDataKey>;
  /** Unwraps a previously generated encrypted data key. */
  decryptDataKey(encrypted: EncryptedDataKey): Promise<Buffer>;
}
