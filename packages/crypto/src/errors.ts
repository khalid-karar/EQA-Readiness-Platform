export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a master key is missing or not the expected length. */
export class InvalidMasterKeyError extends CryptoError {}

/** Thrown when ciphertext cannot be authenticated/decrypted. */
export class DecryptionError extends CryptoError {}
