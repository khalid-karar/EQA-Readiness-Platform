/**
 * @eqa/storage
 *
 * Evidence repository behind a storage abstraction. No vendor is hardcoded —
 * bucket/region are config, so the KSA object store is swappable. Every upload
 * is validated (type allowlist + size limit), hashed, versioned, encrypted at
 * rest with the per-tenant data key, and quarantined until a malware-scan
 * background job (the @eqa/jobs framework) marks it clean. There is no code path
 * to a file's bytes that bypasses the scan gate. Downloads are short-lived
 * signed URLs, authorized by role and audit-logged.
 *
 * Metadata persistence and the scan-status write go through tenant-scoped,
 * audited ports implemented by @eqa/db — the service never touches the database
 * directly.
 */

export {
  EvidenceNotFoundError,
  EvidenceNotReadyError,
  FileTooLargeError,
  InvalidSignedUrlError,
  SignedUrlExpiredError,
  StorageError,
  UnsupportedFileTypeError,
} from "./errors";

export {
  createObjectStore,
  InMemoryObjectStore,
  S3CompatibleObjectStore,
  type BlobClient,
  type ObjectStoreConfig,
} from "./object-store";

export { HmacSignedUrlSigner } from "./signed-url";

export {
  createMalwareScanHandler,
  MALWARE_SCAN_JOB,
  type MalwareScanJobDeps,
  type MalwareScanOutcome,
  type MalwareScanPayload,
} from "./scan-job";

export {
  EvidenceService,
  type EvidenceServiceConfig,
  type EvidenceServiceDeps,
} from "./service";

export type {
  DownloadGrant,
  EvidenceMetadata,
  EvidenceScanStatus,
  EvidenceScanStatusWriter,
  EvidenceStore,
  FileCipher,
  MalwareScanner,
  MalwareScanResult,
  NewEvidenceVersion,
  ObjectStore,
  SignedUrl,
  SignedUrlPayload,
  SignedUrlSigner,
  UploadInput,
  UploadResult,
} from "./types";

export {
  createEvidenceServiceConfigFromEnv,
  createMalwareScannerFromEnv,
  createObjectStoreFromEnv,
  createSignedUrlSignerFromEnv,
  createEicarDetectingScanner,
  EICAR_TEST_BYTES,
} from "./factory";

export {
  ClamavScanner,
  createClamavScannerFromEnv,
  type ClamavScannerConfig,
} from "./clamav-scanner";

export { createS3BlobClient, type S3BlobClientConfig } from "./s3-blob-client";
