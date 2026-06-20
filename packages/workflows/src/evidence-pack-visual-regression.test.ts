import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import {
  comparePng,
  cropPngRegion,
  REGION_MAX_MISMATCHING_PIXEL_RATIO,
  type VisualRegionBox,
} from "./evidence-pack-visual-regression";

function solidPng(
  width: number,
  height: number,
  rgba: readonly number[],
): Uint8Array {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = rgba[0] ?? 0;
    png.data[i + 1] = rgba[1] ?? 0;
    png.data[i + 2] = rgba[2] ?? 0;
    png.data[i + 3] = rgba[3] ?? 255;
  }
  return Uint8Array.from(PNG.sync.write(png));
}

describe("evidence pack visual region regression", () => {
  it("crops a sub-rectangle from a page PNG", () => {
    const page = solidPng(20, 10, [200, 100, 50, 255]);
    const box: VisualRegionBox = {
      id: "test-region",
      page: 1,
      x: 4,
      y: 2,
      width: 6,
      height: 3,
    };

    const crop = cropPngRegion(page, box, 0);
    const parsed = PNG.sync.read(Buffer.from(crop));
    expect(parsed.width).toBe(6);
    expect(parsed.height).toBe(3);
  });

  it("detects a single-pixel change inside a tight region at ≤0.5%", () => {
    const baseline = solidPng(20, 8, [240, 240, 240, 255]);
    const mutated = PNG.sync.read(Buffer.from(baseline));
    mutated.data[0] = 0;
    const actual = Uint8Array.from(PNG.sync.write(mutated));

    const box: VisualRegionBox = {
      id: "glyph-row",
      page: 1,
      x: 0,
      y: 0,
      width: 20,
      height: 8,
    };
    const cropBaseline = cropPngRegion(baseline, box, 0);
    const cropActual = cropPngRegion(actual, box, 0);

    const { mismatchRatio } = comparePng(
      cropActual,
      cropBaseline,
      REGION_MAX_MISMATCHING_PIXEL_RATIO,
    );
    expect(mismatchRatio).toBeGreaterThan(REGION_MAX_MISMATCHING_PIXEL_RATIO);
  });
});
