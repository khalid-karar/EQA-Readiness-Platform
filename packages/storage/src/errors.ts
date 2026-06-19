export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The uploaded file's content type is not on the allowlist. */
export class UnsupportedFileTypeError extends StorageError {}

/** The uploaded file exceeds the configured size limit. */
export class FileTooLargeError extends StorageError {}

export class EvidenceNotFoundError extends StorageError {}

/**
 * The evidence exists but has not cleared malware scanning. Thrown by every
 * download path, so a quarantined or infected file is never downloadable.
 */
export class EvidenceNotReadyError extends StorageError {}

/** The signed URL token is malformed or its signature does not verify. */
export class InvalidSignedUrlError extends StorageError {}

/** The signed URL has expired. */
export class SignedUrlExpiredError extends StorageError {}
