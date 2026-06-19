/**
 * @eqa/crypto
 *
 * Envelope encryption primitives: a master key held in a KMS protects
 * per-tenant data keys. Plaintext data keys exist only in memory during request
 * processing (see {@link withDataKey}) and must never be logged, returned, or
 * persisted. Only the encrypted (wrapped) data key is ever stored.
 */

export { KEY_BYTES } from "./aes-gcm";
export { CryptoError, DecryptionError, InvalidMasterKeyError } from "./errors";
export type { EncryptedDataKey, GeneratedDataKey, Kms } from "./kms";
export { LocalKms, createLocalKmsFromEnv } from "./local-kms";
export {
  decryptWithDataKey,
  decryptWithDataKeyToString,
  encryptWithDataKey,
  withDataKey,
} from "./envelope";
export { TenantCipher } from "./field";
export { canonicalJson, sha256Hex } from "./hash";
