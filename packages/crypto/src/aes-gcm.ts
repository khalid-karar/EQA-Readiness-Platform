import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { DecryptionError } from "./errors";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
export const KEY_BYTES = 32;

/**
 * Encrypts with AES-256-GCM and returns a self-describing buffer laid out as
 * `iv(12) || authTag(16) || ciphertext`. The key must be 32 bytes.
 */
export function aesGcmEncrypt(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

/** Reverses {@link aesGcmEncrypt}. Throws {@link DecryptionError} on tamper. */
export function aesGcmDecrypt(key: Buffer, blob: Buffer): Buffer {
  if (blob.length < IV_BYTES + AUTH_TAG_BYTES) {
    throw new DecryptionError("Ciphertext is too short to be valid.");
  }
  const iv = blob.subarray(0, IV_BYTES);
  const authTag = blob.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = blob.subarray(IV_BYTES + AUTH_TAG_BYTES);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    // Deliberately opaque: never leak key/plaintext details in the message.
    throw new DecryptionError("Failed to decrypt or authenticate ciphertext.");
  }
}
