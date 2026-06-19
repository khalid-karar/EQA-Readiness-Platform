import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ContentCatalog } from "./catalog";
import { loadContentPacksFromDir } from "./loader";

/** Absolute path to the content packs shipped with this package. */
export function bundledSeedsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "seeds");
}

/** Loads all bundled seed packs into a fresh catalog. */
export function loadBundledCatalog(): ContentCatalog {
  const catalog = new ContentCatalog();
  for (const pack of loadContentPacksFromDir(bundledSeedsDir())) {
    catalog.register(pack);
  }
  return catalog;
}
