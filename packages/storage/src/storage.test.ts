import { describe, expect, it } from "vitest";
import { InvalidSignedUrlError, SignedUrlExpiredError } from "./errors";
import {
  type BlobClient,
  createObjectStore,
  InMemoryObjectStore,
  S3CompatibleObjectStore,
} from "./object-store";
import { HmacSignedUrlSigner } from "./signed-url";

describe("object store (swappable by config)", () => {
  it("builds the in-memory driver from config", async () => {
    const store = createObjectStore({
      driver: "memory",
      bucket: "evidence-ksa",
    });
    expect(store).toBeInstanceOf(InMemoryObjectStore);
    expect(store.bucket).toBe("evidence-ksa");

    await store.put("k", Buffer.from("hello"));
    expect((await store.get("k"))?.toString()).toBe("hello");
    expect(await store.get("missing")).toBeNull();
  });

  it("builds an S3-compatible driver from config with an injected client (no hardcoded vendor)", async () => {
    const blobs = new Map<string, Buffer>();
    const client: BlobClient = {
      putObject: (bucket, key, body) => {
        blobs.set(`${bucket}/${key}`, body);
        return Promise.resolve();
      },
      getObject: (bucket, key) =>
        Promise.resolve(blobs.get(`${bucket}/${key}`) ?? null),
      deleteObject: (bucket, key) => {
        blobs.delete(`${bucket}/${key}`);
        return Promise.resolve();
      },
    };

    const store = createObjectStore({
      driver: "s3",
      bucket: "ksa-evidence",
      region: "me-central-1",
      client,
    });
    expect(store).toBeInstanceOf(S3CompatibleObjectStore);
    expect(store.bucket).toBe("ksa-evidence");

    // The same ObjectStore contract works on a completely different backend,
    // selected purely by config — proving swappability.
    await store.put("doc1", Buffer.from("synthetic"));
    expect(blobs.get("ksa-evidence/doc1")?.toString()).toBe("synthetic");
    expect((await store.get("doc1"))?.toString()).toBe("synthetic");
  });
});

describe("HmacSignedUrlSigner", () => {
  it("signs and verifies a short-lived URL", () => {
    const signer = new HmacSignedUrlSigner("secret");
    const signed = signer.sign({ key: "k", evidenceId: "e1", version: 2 }, 300);
    expect(signed.url).toContain("token=");
    const payload = signer.verify(signed.token);
    expect(payload).toEqual({ key: "k", evidenceId: "e1", version: 2 });
  });

  it("rejects a tampered token", () => {
    const signer = new HmacSignedUrlSigner("secret");
    const signed = signer.sign({ key: "k", evidenceId: "e1", version: 1 }, 300);
    const tampered = `${signed.token}x`;
    expect(() => signer.verify(tampered)).toThrow(InvalidSignedUrlError);
  });

  it("rejects a token signed with a different secret", () => {
    const a = new HmacSignedUrlSigner("secret-a");
    const b = new HmacSignedUrlSigner("secret-b");
    const signed = a.sign({ key: "k", evidenceId: "e1", version: 1 }, 300);
    expect(() => b.verify(signed.token)).toThrow(InvalidSignedUrlError);
  });

  it("rejects an expired token", () => {
    let now = 1_000_000;
    const signer = new HmacSignedUrlSigner(
      "secret",
      "https://evidence.local/download",
      () => now,
    );
    const signed = signer.sign({ key: "k", evidenceId: "e1", version: 1 }, 60);
    now += 61_000;
    expect(() => signer.verify(signed.token)).toThrow(SignedUrlExpiredError);
  });
});
