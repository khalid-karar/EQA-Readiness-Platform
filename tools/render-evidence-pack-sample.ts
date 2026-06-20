/**
 * Renders a sample evidence pack PDF to stdout (binary).
 * Used by the Next.js API route so Puppeteer runs outside the webpack bundle.
 *
 * Usage: pnpm exec tsx tools/render-evidence-pack-sample.ts [en|ar]
 */
import {
  buildEvidencePackManifest,
  createSyntheticEvidencePackInput,
  renderEvidencePackPdf,
} from "@eqa/workflows";

async function main(): Promise<void> {
  const locale = process.argv[2] === "ar" ? "ar" : "en";
  const input = createSyntheticEvidencePackInput(locale);
  const manifest = buildEvidencePackManifest(input);
  const pdf = await renderEvidencePackPdf(manifest);
  process.stdout.write(Buffer.from(pdf));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
