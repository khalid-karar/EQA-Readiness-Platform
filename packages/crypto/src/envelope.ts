import { aesGcmDecrypt, aesGcmEncrypt } from "./aes-gcm";
import type { EncryptedDataKey, Kms } from "./kms";

/**
 * Encrypts data with a (plaintext) per-tenant data key. Returns base64 of the
 * self-describing GCM blob. The data key itself is never embedded.
 */
export function encryptWithDataKey(
  dataKey: Buffer,
  plaintext: string | Buffer,
): string {
  const buf =
    typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext;
  return aesGcmEncrypt(dataKey, buf).toString("base64");
}

/** Reverses {@link encryptWithDataKey}, returning the raw plaintext bytes. */
export function decryptWithDataKey(
  dataKey: Buffer,
  ciphertext: string,
): Buffer {
  return aesGcmDecrypt(dataKey, Buffer.from(ciphertext, "base64"));
}

/** Convenience for string payloads. */
export function decryptWithDataKeyToString(
  dataKey: Buffer,
  ciphertext: string,
): string {
  return decryptWithDataKey(dataKey, ciphertext).toString("utf8");
}

/**
 * Unwraps a tenant data key via the KMS, passes the plaintext to `fn`, and then
 * zeroes the plaintext buffer — guaranteeing the key exists in memory only for
 * the duration of the callback and is never returned or retained by this helper.
 */
export async function withDataKey<T>(
  kms: Kms,
  encrypted: EncryptedDataKey,
  fn: (dataKey: Buffer) => Promise<T> | T,
): Promise<T> {
  const dataKey = await kms.decryptDataKey(encrypted);
  try {
    return await fn(dataKey);
  } finally {
    dataKey.fill(0);
  }
}
