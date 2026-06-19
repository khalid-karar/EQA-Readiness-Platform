import { StorageError } from "./errors";
import type { ObjectStore } from "./types";

/** In-memory object store for local/dev and tests. */
export class InMemoryObjectStore implements ObjectStore {
  private readonly objects = new Map<string, Buffer>();

  constructor(readonly bucket: string) {}

  put(key: string, bytes: Buffer): Promise<void> {
    this.objects.set(key, Buffer.from(bytes));
    return Promise.resolve();
  }

  get(key: string): Promise<Buffer | null> {
    const value = this.objects.get(key);
    return Promise.resolve(value ? Buffer.from(value) : null);
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }
}

/**
 * Minimal blob-client interface an S3-compatible vendor SDK implements. Keeping
 * it as an injected dependency means no vendor SDK is hardcoded into the
 * abstraction — the KSA object store is swapped by providing a client.
 */
export interface BlobClient {
  putObject(bucket: string, key: string, body: Buffer): Promise<void>;
  getObject(bucket: string, key: string): Promise<Buffer | null>;
  deleteObject(bucket: string, key: string): Promise<void>;
}

/**
 * S3-compatible object store. Bucket and region come from config; the actual
 * transport is the injected {@link BlobClient}, so any S3-compatible KSA store
 * drops in without changing this code.
 */
export class S3CompatibleObjectStore implements ObjectStore {
  constructor(
    readonly bucket: string,
    readonly region: string,
    private readonly client: BlobClient,
  ) {}

  put(key: string, bytes: Buffer): Promise<void> {
    return this.client.putObject(this.bucket, key, bytes);
  }

  get(key: string): Promise<Buffer | null> {
    return this.client.getObject(this.bucket, key);
  }

  delete(key: string): Promise<void> {
    return this.client.deleteObject(this.bucket, key);
  }
}

export type ObjectStoreConfig =
  | { readonly driver: "memory"; readonly bucket: string }
  | {
      readonly driver: "s3";
      readonly bucket: string;
      readonly region: string;
      readonly client: BlobClient;
    };

/** Builds the object store for the configured driver (no hardcoded vendor). */
export function createObjectStore(config: ObjectStoreConfig): ObjectStore {
  switch (config.driver) {
    case "memory":
      return new InMemoryObjectStore(config.bucket);
    case "s3":
      if (!config.client) {
        throw new StorageError(
          "The 's3' object-store driver requires a blob client.",
        );
      }
      return new S3CompatibleObjectStore(
        config.bucket,
        config.region,
        config.client,
      );
  }
}
