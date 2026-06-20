/**
 * Rasterizes page 1 of the Arabic sample pack to PNG for a rough layout preview.
 *
 * Note: pdf.js may not load embedded subset fonts correctly; glyphs can look
 * wrong in the PNG. Always verify the PDF itself in Chrome or Adobe Reader.
 *
 * Usage: pnpm rasterize:sample-pack
 * Output: samples/eqa-evidence-pack-sample-ar-page1.png
 */
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pdfPath = join(root, "samples", "eqa-evidence-pack-sample-ar.pdf");
const outPath = join(root, "samples", "eqa-evidence-pack-sample-ar-page1.png");

async function main(): Promise<void> {
  mkdirSync(dirname(outPath), { recursive: true });

  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`Wrote ${outPath} (${viewport.width}x${viewport.height})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
