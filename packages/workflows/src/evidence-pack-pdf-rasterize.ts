import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";

const DEFAULT_DPI = 96;

/** Returns true when poppler `pdftoppm` is on PATH. */
export function isPopplerAvailable(): boolean {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/** Page count via pdf-lib (no poppler required). */
export async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
}

function sortedPagePngs(workDir: string, prefix: string): string[] {
  return readdirSync(workDir)
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".png"))
    .sort((a, b) => {
      const pageA = Number.parseInt(a.match(/-(\d+)\.png$/)?.[1] ?? "0", 10);
      const pageB = Number.parseInt(b.match(/-(\d+)\.png$/)?.[1] ?? "0", 10);
      return pageA - pageB;
    });
}

/**
 * Rasterizes one PDF page to PNG using poppler pdftoppm.
 * Returns undefined when pdftoppm is not installed.
 */
export function rasterizePdfPageWithPoppler(
  pdfBytes: Uint8Array,
  page: number,
  dpi = DEFAULT_DPI,
): Uint8Array | undefined {
  if (page < 1) {
    throw new Error(`PDF page numbers are 1-based (got ${page})`);
  }

  const workDir = mkdtempSync(join(tmpdir(), "eqa-pack-raster-"));
  const pdfPath = join(workDir, "pack.pdf");
  const outPrefix = join(workDir, "page");

  try {
    writeFileSync(pdfPath, Buffer.from(pdfBytes));
    execFileSync(
      "pdftoppm",
      [
        "-png",
        "-f",
        String(page),
        "-l",
        String(page),
        "-r",
        String(dpi),
        "-singlefile",
        pdfPath,
        outPrefix,
      ],
      { stdio: "pipe" },
    );
    const pngPath = `${outPrefix}.png`;
    if (!existsSync(pngPath)) {
      return undefined;
    }
    return readFileSync(pngPath);
  } catch {
    return undefined;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * Rasterizes every PDF page to PNG via poppler pdftoppm.
 * Returns undefined when pdftoppm is not installed.
 */
export function rasterizePdfAllPagesWithPoppler(
  pdfBytes: Uint8Array,
  dpi = DEFAULT_DPI,
): Uint8Array[] | undefined {
  const workDir = mkdtempSync(join(tmpdir(), "eqa-pack-raster-"));
  const pdfPath = join(workDir, "pack.pdf");
  const outPrefix = join(workDir, "page");

  try {
    writeFileSync(pdfPath, Buffer.from(pdfBytes));
    execFileSync("pdftoppm", ["-png", "-r", String(dpi), pdfPath, outPrefix], {
      stdio: "pipe",
    });

    const pageFiles = sortedPagePngs(workDir, "page");
    if (pageFiles.length === 0) {
      return undefined;
    }
    return pageFiles.map((name) => readFileSync(join(workDir, name)));
  } catch {
    return undefined;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** Rasterizes page 1 of a PDF to PNG using poppler pdftoppm when available. */
export function rasterizePdfPage1WithPoppler(
  pdfBytes: Uint8Array,
): Uint8Array | undefined {
  return rasterizePdfPageWithPoppler(pdfBytes, 1);
}
