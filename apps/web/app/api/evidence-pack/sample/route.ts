import { renderEvidencePackSamplePdf } from "@/lib/render-evidence-pack-sample";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale");
  const locale = localeParam === "ar" ? "ar" : "en";

  try {
    const pdfBytes = await renderEvidencePackSamplePdf(locale);
    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="eqa-evidence-pack-sample-${locale}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("[api/evidence-pack/sample]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Evidence pack PDF render failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
