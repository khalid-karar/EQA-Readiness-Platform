import {
  ContentNotFoundError,
  ContentPinMismatchError,
  ContentVersionImmutableError,
} from "./errors";
import type { ContentPack } from "./types";

/**
 * A stable reference an assessment holds to the exact content version it started
 * on. It records the version AND its content hash, so the pinned content can be
 * resolved verbatim for the life of the assessment regardless of newer versions.
 */
export interface ContentPin {
  readonly assessmentId: string;
  readonly contentPackId: string;
  readonly version: string;
  readonly contentHash: string;
}

function key(contentPackId: string, version: string): string {
  return `${contentPackId}@${version}`;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10));
  const pb = b.split(".").map((n) => Number.parseInt(n, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * An in-memory registry of immutable content pack versions.
 *
 * Versioning/immutability contract:
 * - Each `(contentPackId, version)` is an immutable snapshot. Re-registering the
 *   same version with different content throws — content changes must be
 *   published as a NEW version, never edited in place.
 * - Assessments pin a specific version via {@link pinForAssessment}. Adding newer
 *   versions never affects an existing pin: {@link resolvePin} always returns the
 *   exact pinned content (verified by hash), so a question changed after an
 *   assessment begins cannot corrupt or silently alter historical responses.
 */
export class ContentCatalog {
  private readonly byKey = new Map<string, ContentPack>();
  private readonly versionsByPack = new Map<string, Set<string>>();
  private readonly inUse = new Set<string>();

  /** Registers a content pack version. Idempotent for identical content. */
  register(pack: ContentPack): void {
    const k = key(pack.meta.contentPackId, pack.meta.version);
    const existing = this.byKey.get(k);
    if (existing) {
      if (existing.contentHash === pack.contentHash) return;
      throw new ContentVersionImmutableError(
        `Content pack '${pack.meta.contentPackId}' version '${pack.meta.version}' ` +
          `already exists with different content. A version is immutable — ` +
          `publish the change as a new version instead.`,
      );
    }
    this.byKey.set(k, pack);
    let versions = this.versionsByPack.get(pack.meta.contentPackId);
    if (!versions) {
      versions = new Set<string>();
      this.versionsByPack.set(pack.meta.contentPackId, versions);
    }
    versions.add(pack.meta.version);
  }

  has(contentPackId: string, version: string): boolean {
    return this.byKey.has(key(contentPackId, version));
  }

  get(contentPackId: string, version: string): ContentPack {
    const pack = this.byKey.get(key(contentPackId, version));
    if (!pack) {
      throw new ContentNotFoundError(
        `No content pack '${contentPackId}' version '${version}' in the catalog.`,
      );
    }
    return pack;
  }

  /** All registered versions of a pack, sorted ascending. */
  listVersions(contentPackId: string): string[] {
    const versions = this.versionsByPack.get(contentPackId);
    return versions ? [...versions].sort(compareVersions) : [];
  }

  /** The highest version of a pack. */
  latest(contentPackId: string): ContentPack {
    const versions = this.listVersions(contentPackId);
    const newest = versions.at(-1);
    if (!newest) {
      throw new ContentNotFoundError(
        `No content pack '${contentPackId}' in the catalog.`,
      );
    }
    return this.get(contentPackId, newest);
  }

  isInUse(contentPackId: string, version: string): boolean {
    return this.inUse.has(key(contentPackId, version));
  }

  /**
   * Pins a content version to an assessment, marking it in use. Returns a stable
   * reference the assessment keeps for its lifetime.
   */
  pinForAssessment(
    assessmentId: string,
    contentPackId: string,
    version: string,
  ): ContentPin {
    const pack = this.get(contentPackId, version);
    this.inUse.add(key(contentPackId, version));
    return Object.freeze({
      assessmentId,
      contentPackId,
      version,
      contentHash: pack.contentHash,
    });
  }

  /**
   * Resolves the exact content an assessment is pinned to. Throws if the catalog
   * content for that version no longer matches the pinned hash (an illegal
   * in-place change or tampering).
   */
  resolvePin(pin: ContentPin): ContentPack {
    const pack = this.get(pin.contentPackId, pin.version);
    if (pack.contentHash !== pin.contentHash) {
      throw new ContentPinMismatchError(
        `Pinned content for assessment '${pin.assessmentId}' ` +
          `(${pin.contentPackId}@${pin.version}) no longer matches the catalog.`,
      );
    }
    return pack;
  }
}
