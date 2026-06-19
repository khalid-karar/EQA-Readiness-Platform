import {
  decryptWithDataKeyToString,
  encryptWithDataKey,
  withDataKey,
} from "./envelope";
import type { EncryptedDataKey, Kms } from "./kms";

/**
 * Application-level encryption for sensitive fields, bound to a single tenant's
 * data key. Each operation unwraps the per-tenant data key via the KMS, uses it,
 * and zeroes the plaintext key afterwards (see {@link withDataKey}) — the
 * plaintext data key never lives beyond the operation.
 */
export class TenantCipher {
  constructor(
    private readonly kms: Kms,
    private readonly encryptedDataKey: EncryptedDataKey,
  ) {}

  /** Encrypts a plaintext field value, returning base64 ciphertext to store. */
  seal(plaintext: string): Promise<string> {
    return withDataKey(this.kms, this.encryptedDataKey, (dataKey) =>
      encryptWithDataKey(dataKey, plaintext),
    );
  }

  /** Decrypts a previously sealed field value back to plaintext. */
  open(ciphertext: string): Promise<string> {
    return withDataKey(this.kms, this.encryptedDataKey, (dataKey) =>
      decryptWithDataKeyToString(dataKey, ciphertext),
    );
  }
}
