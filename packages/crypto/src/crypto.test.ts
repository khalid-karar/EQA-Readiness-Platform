import { randomBytes } from "node:crypto";
import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { DecryptionError, InvalidMasterKeyError } from "./errors";
import { LocalKms, createLocalKmsFromEnv } from "./local-kms";
import {
  decryptWithDataKeyToString,
  encryptWithDataKey,
  withDataKey,
} from "./envelope";
import { TenantCipher } from "./field";
import { canonicalJson, sha256Hex } from "./hash";

const masterKey = () => randomBytes(32);

describe("LocalKms", () => {
  it("rejects a master key of the wrong length", () => {
    expect(() => new LocalKms(randomBytes(16))).toThrow(InvalidMasterKeyError);
  });

  it("wraps a data key so the stored form is never the plaintext", async () => {
    const kms = new LocalKms(masterKey());
    const { plaintext, encrypted } = await kms.generateDataKey();

    expect(plaintext).toHaveLength(32);
    expect(encrypted.ciphertext).not.toContain(plaintext.toString("base64"));
    expect(encrypted.ciphertext).not.toContain(plaintext.toString("hex"));

    const unwrapped = await kms.decryptDataKey(encrypted);
    expect(unwrapped.equals(plaintext)).toBe(true);
  });

  it("never exposes the master key via logging/serialization", () => {
    const kms = new LocalKms(masterKey(), "mk-1");
    expect(JSON.stringify(kms)).not.toMatch(/masterKey":"(?!\[REDACTED\])/);
    expect(JSON.stringify(kms)).toContain("[REDACTED]");
    expect(inspect(kms)).toContain("[REDACTED]");
    expect(inspect(kms)).toContain("mk-1");
  });

  it("fails to decrypt tampered ciphertext", async () => {
    const kms = new LocalKms(masterKey());
    const { encrypted } = await kms.generateDataKey();
    // Flip a byte in the ciphertext body so GCM authentication fails.
    const bytes = Buffer.from(encrypted.ciphertext, "base64");
    const last = bytes.length - 1;
    bytes[last] = (bytes[last] ?? 0) ^ 0xff;
    const tampered = { ...encrypted, ciphertext: bytes.toString("base64") };
    await expect(kms.decryptDataKey(tampered)).rejects.toBeInstanceOf(
      DecryptionError,
    );
  });
});

describe("createLocalKmsFromEnv", () => {
  it("uses a configured base64 master key", async () => {
    const key = masterKey();
    const kms = createLocalKmsFromEnv({
      KMS_MASTER_KEY: key.toString("base64"),
      KMS_MASTER_KEY_ID: "configured",
    } as NodeJS.ProcessEnv);
    expect(kms.masterKeyId).toBe("configured");
    const { plaintext, encrypted } = await kms.generateDataKey();
    expect((await kms.decryptDataKey(encrypted)).equals(plaintext)).toBe(true);
  });

  it("refuses to start in production without a master key", () => {
    expect(() =>
      createLocalKmsFromEnv({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toThrow(InvalidMasterKeyError);
  });
});

describe("envelope encryption with a data key", () => {
  it("round-trips data and zeroes the plaintext key afterwards", async () => {
    const kms = new LocalKms(masterKey());
    const { encrypted } = await kms.generateDataKey();

    let keyAfter: Buffer | null = null;
    const ciphertext = await withDataKey(kms, encrypted, (dataKey) => {
      keyAfter = dataKey;
      return encryptWithDataKey(dataKey, "synthetic-secret");
    });

    // The buffer handed to the callback is zeroed once the callback returns.
    expect(keyAfter).not.toBeNull();
    expect((keyAfter as unknown as Buffer).every((b) => b === 0)).toBe(true);

    const plaintext = await withDataKey(kms, encrypted, (dataKey) =>
      decryptWithDataKeyToString(dataKey, ciphertext),
    );
    expect(plaintext).toBe("synthetic-secret");
  });
});

describe("TenantCipher", () => {
  it("seals and opens a field with the per-tenant data key", async () => {
    const kms = new LocalKms(masterKey());
    const { encrypted } = await kms.generateDataKey();
    const cipher = new TenantCipher(kms, encrypted);

    const sealed = await cipher.seal("123-45-6789");
    expect(sealed).not.toContain("123-45-6789");
    expect(await cipher.open(sealed)).toBe("123-45-6789");
  });

  it("seals and opens raw file bytes (encryption at rest)", async () => {
    const kms = new LocalKms(masterKey());
    const { encrypted } = await kms.generateDataKey();
    const cipher = new TenantCipher(kms, encrypted);

    const plaintext = Buffer.from("PDF\x00\x01 synthetic evidence bytes");
    const sealed = await cipher.sealBytes(plaintext);
    expect(sealed.equals(plaintext)).toBe(false);
    expect((await cipher.openBytes(sealed)).equals(plaintext)).toBe(true);
  });
});

describe("hash helpers", () => {
  it("produces canonical JSON regardless of key order", () => {
    expect(canonicalJson({ b: 1, a: { d: 4, c: 3 } })).toBe(
      canonicalJson({ a: { c: 3, d: 4 }, b: 1 }),
    );
  });

  it("hashes deterministically", () => {
    expect(sha256Hex("eqa")).toBe(sha256Hex("eqa"));
    expect(sha256Hex("eqa")).not.toBe(sha256Hex("EQA"));
    expect(sha256Hex("eqa")).toMatch(/^[0-9a-f]{64}$/);
  });
});
