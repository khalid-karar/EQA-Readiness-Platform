/**
 * Writes a sample EQA evidence pack PDF to disk for local inspection.
 *
 * Usage: pnpm generate:sample-pack
 * Output: samples/eqa-evidence-pack-sample-en.pdf
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEvidencePackManifest,
  createSyntheticEvidencePackInput,
  renderEvidencePackPdf,
} from "@eqa/workflows";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "samples");

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });

  for (const locale of ["en", "ar"] as const) {
    const input = createSyntheticEvidencePackInput(locale);
    const manifest = buildEvidencePackManifest(input);
    const pdf = await renderEvidencePackPdf(manifest);
    const outPath = join(outDir, `eqa-evidence-pack-sample-${locale}.pdf`);
    writeFileSync(outPath, Buffer.from(pdf));
    console.log(`Wrote ${outPath} (${pdf.length} bytes)`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
