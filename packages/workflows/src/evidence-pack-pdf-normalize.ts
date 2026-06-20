/** Strips volatile PDF metadata so repeated renders produce identical bytes. */
export function normalizePdfBytes(pdfBytes: Uint8Array): Uint8Array {
  let text = Buffer.from(pdfBytes).toString("latin1");
  text = text.replace(
    /\/CreationDate\s*\([^)]*\)/g,
    `/CreationDate (D:20260619120000Z)`,
  );
  text = text.replace(/\/ModDate\s*\([^)]*\)/g, `/ModDate (D:20260619120000Z)`);
  text = text.replace(
    /\/ID\s*\[\s*<[0-9A-Fa-f]+>\s*<[0-9A-Fa-f]+>\s*\]/g,
    `/ID [<00000000000000000000000000000000> <00000000000000000000000000000000>]`,
  );
  return Uint8Array.from(Buffer.from(text, "latin1"));
}
