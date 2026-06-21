import { StorageError } from "./errors";
import { HmacSignedUrlSigner } from "./signed-url";
import { createClamavScannerFromEnv } from "./clamav-scanner";
import {
  createObjectStore,
  type ObjectStoreConfig,
} from "./object-store";
import { createS3BlobClient } from "./s3-blob-client";
import type { EvidenceServiceConfig } from "./service";
import type {
  MalwareScanner,
  ObjectStore,
  SignedUrlSigner,
} from "./types";

function parseAllowedTypes(raw: string | undefined): readonly string[] {
  const types = (raw ?? "application/pdf,image/png,image/jpeg")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return types.length > 0 ? types : ["application/pdf"];
}

export function createEvidenceServiceConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EvidenceServiceConfig {
  const maxBytes = Number(env.STORAGE_MAX_BYTES ?? "26214400");
  return {
    maxBytes: Number.isFinite(maxBytes) ? maxBytes : 26_214_400,
    allowedContentTypes: parseAllowedTypes(env.STORAGE_ALLOWED_TYPES),
    downloadTtlSeconds: Number(env.STORAGE_DOWNLOAD_TTL_SECONDS ?? "300"),
    scanAttempts: Number(env.STORAGE_SCAN_ATTEMPTS ?? "3"),
  };
}

export function createSignedUrlSignerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SignedUrlSigner {
  const secret =
    env.STORAGE_SIGNING_SECRET ??
    env.AUTH_SESSION_SECRET ??
    "dev-evidence-signing-secret";
  const appUrl = (env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return new HmacSignedUrlSigner(secret, `${appUrl}/api/evidence/download`);
}

export function createObjectStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStore {
  const driver = env.STORAGE_DRIVER === "s3" ? "s3" : "memory";
  const bucket = env.STORAGE_BUCKET ?? "eqa-evidence";

  if (driver === "memory") {
    return createObjectStore({ driver: "memory", bucket });
  }

  const accessKeyId = env.STORAGE_ACCESS_KEY ?? env.MINIO_ROOT_USER ?? "";
  const secretAccessKey =
    env.STORAGE_SECRET_KEY ?? env.MINIO_ROOT_PASSWORD ?? "";
  if (!accessKeyId || !secretAccessKey) {
    throw new StorageError(
      "STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY are required for the s3 driver.",
    );
  }

  const config: ObjectStoreConfig = {
    driver: "s3",
    bucket,
    region: env.STORAGE_REGION ?? "me-central-1",
    client: createS3BlobClient({
      region: env.STORAGE_REGION ?? "me-central-1",
      ...(env.STORAGE_ENDPOINT ? { endpoint: env.STORAGE_ENDPOINT } : {}),
      accessKeyId,
      secretAccessKey,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE !== "false",
    }),
  };
  return createObjectStore(config);
}

const STUB_SCANNER: MalwareScanner = {
  scan: () => Promise.resolve({ clean: true, scanner: "av-stub" }),
};

export function createMalwareScannerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): MalwareScanner {
  const driver = env.MALWARE_SCANNER ?? "stub";
  if (driver === "clamav") {
    return createClamavScannerFromEnv(env);
  }
  return STUB_SCANNER;
}

/** Standard EICAR test string for malware-scanner verification. */
export const EICAR_TEST_BYTES = Buffer.from(
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
  "ascii",
);

/** Detects the EICAR test pattern without a live clamd (unit tests). */
export function createEicarDetectingScanner(): MalwareScanner {
  return {
    scan: (bytes: Buffer) =>
      Promise.resolve(
        bytes.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")
          ? {
              clean: false,
              scanner: "eicar-detector",
              signature: "EICAR-Test-Signature",
            }
          : { clean: true, scanner: "eicar-detector" },
      ),
  };
}
