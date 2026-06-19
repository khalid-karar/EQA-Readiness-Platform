import { randomBytes } from "node:crypto";
import { inspect } from "node:util";
import { aesGcmDecrypt, aesGcmEncrypt, KEY_BYTES } from "./aes-gcm";
import { InvalidMasterKeyError } from "./errors";
import type { EncryptedDataKey, GeneratedDataKey, Kms } from "./kms";

const REDACTED = "[REDACTED]";

/**
 * Local development stand-in for a real KMS. The master key is held only in
 * memory and is never logged, serialized, or exposed. It wraps/unwraps
 * per-tenant data keys with AES-256-GCM.
 *
 * This is a DEV stub: production must use a real, Saudi-resident KMS that
 * implements the same {@link Kms} interface.
 */
export class LocalKms implements Kms {
  readonly masterKeyId: string;
  // Private field: not enumerable, not reachable from outside the instance.
  readonly #masterKey: Buffer;

  constructor(masterKey: Buffer, masterKeyId = "local-dev-master") {
    if (masterKey.length !== KEY_BYTES) {
      throw new InvalidMasterKeyError(
        `Master key must be ${KEY_BYTES} bytes, received ${masterKey.length}.`,
      );
    }
    this.#masterKey = Buffer.from(masterKey);
    this.masterKeyId = masterKeyId;
  }

  async generateDataKey(): Promise<GeneratedDataKey> {
    const plaintext = randomBytes(KEY_BYTES);
    const wrapped = aesGcmEncrypt(this.#masterKey, plaintext);
    return {
      plaintext,
      encrypted: {
        ciphertext: wrapped.toString("base64"),
        masterKeyId: this.masterKeyId,
      },
    };
  }

  async decryptDataKey(encrypted: EncryptedDataKey): Promise<Buffer> {
    const wrapped = Buffer.from(encrypted.ciphertext, "base64");
    return aesGcmDecrypt(this.#masterKey, wrapped);
  }

  // Guard rails: ensure the master key can never be accidentally logged.
  toJSON(): { masterKeyId: string; masterKey: string } {
    return { masterKeyId: this.masterKeyId, masterKey: REDACTED };
  }

  [inspect.custom](): string {
    return `LocalKms { masterKeyId: '${this.masterKeyId}', masterKey: '${REDACTED}' }`;
  }
}

/**
 * Builds a {@link LocalKms} from environment configuration.
 *
 * - `KMS_MASTER_KEY` (base64, 32 bytes) is used when present.
 * - Outside production, a random ephemeral key is generated if none is set
 *   (with a warning that never contains key material).
 * - In production, a missing key is a hard error — never silently weak.
 */
export function createLocalKmsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): LocalKms {
  const configured = env.KMS_MASTER_KEY;
  const masterKeyId = env.KMS_MASTER_KEY_ID ?? "local-dev-master";

  if (configured && configured.length > 0) {
    const key = Buffer.from(configured, "base64");
    if (key.length !== KEY_BYTES) {
      throw new InvalidMasterKeyError(
        `KMS_MASTER_KEY must decode to ${KEY_BYTES} bytes (base64).`,
      );
    }
    return new LocalKms(key, masterKeyId);
  }

  if (env.NODE_ENV === "production") {
    throw new InvalidMasterKeyError(
      "KMS_MASTER_KEY is required in production; refusing to start with an ephemeral key.",
    );
  }

  // Dev-only notice; contains no key material.
  console.warn(
    "[crypto] No KMS_MASTER_KEY set; generating an ephemeral dev master key. " +
      "Data encrypted now cannot be decrypted after restart.",
  );
  return new LocalKms(randomBytes(KEY_BYTES), masterKeyId);
}
