import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { canonicalJson, sha256Hex } from "@eqa/crypto";
import { ContentValidationError } from "./errors";
import type { ContentPack } from "./types";
import { validateContentPack } from "./validate";

const SEED_EXTENSIONS = new Set([".json"]);

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

function parseSeed(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ContentValidationError(
      `not valid JSON: ${(error as Error).message}`,
      path,
    );
  }
}

/**
 * Loads a single content pack from a seed file. The pack is validated, its
 * content hash is computed over the canonical content, and the whole tree is
 * deep-frozen so a loaded version can never be mutated at runtime.
 *
 * Nothing about the content lives in code — point this at a different file and
 * you get different content with no code change.
 */
export function loadContentPack(filePath: string): ContentPack {
  const raw = parseSeed(readFileSync(filePath, "utf8"), filePath);
  const { meta, domains } = validateContentPack(raw);
  const contentHash = sha256Hex(canonicalJson({ meta, domains }));
  return deepFreeze({ meta, domains, contentHash });
}

/** Loads every JSON seed file in a directory as a content pack. */
export function loadContentPacksFromDir(dirPath: string): ContentPack[] {
  return readdirSync(dirPath)
    .filter((name) => SEED_EXTENSIONS.has(extname(name).toLowerCase()))
    .sort()
    .map((name) => loadContentPack(join(dirPath, name)));
}
