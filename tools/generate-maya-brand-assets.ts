/**
 * Crops the Maya AI mark from the wordmark JPEG and writes favicon + mark PNGs.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const ROOT = process.cwd();
const LOGO_PATH = join(ROOT, "apps/web/public/brand/maya-ai-logo.jpg");
const MARK_PATH = join(ROOT, "apps/web/public/brand/maya-ai-mark.png");
const ICON_PATH = join(ROOT, "apps/web/app/icon.png");

async function main(): Promise<void> {
  const img = await loadImage(LOGO_PATH);
  const cropHeight = Math.round(img.height * 0.62);
  const cropWidth = cropHeight;
  const sx = Math.round((img.width - cropWidth) / 2);
  const sy = Math.round(img.height * 0.04);

  for (const [outPath, size] of [
    [MARK_PATH, 512],
    [ICON_PATH, 256],
  ] as const) {
    mkdirSync(dirname(outPath), { recursive: true });
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, size, size);
    const buffer = canvas.toBuffer("image/png");
    await import("node:fs/promises").then((fs) => fs.writeFile(outPath, buffer));
    console.log(`Wrote ${outPath} (${size}×${size})`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
