import { describe, expect, it } from "vitest";
import { buildEvidencePackManifest } from "./evidence-pack";
import {
  assertNoBareMachineTokensInHtml,
  assertTemplateOffline,
  buildEvidencePackHtml,
} from "./evidence-pack-html-template";
import { createSyntheticEvidencePackInput } from "./synthetic-evidence-pack";
import { createMixedScriptTortureEvidencePackInput } from "./synthetic-mixed-script-torture";

describe("evidence pack HTML LTR isolation (exhaustive)", () => {
  it("rejects external HTTP(S) URLs in the template", () => {
    expect(() =>
      assertTemplateOffline("https://fonts.googleapis.com/css"),
    ).toThrow(/must not reference external HTTP/i);
    expect(() =>
      assertTemplateOffline('<img src="http://cdn.example/x">'),
    ).toThrow(/must not reference external HTTP/i);
  });

  it.each([
    { locale: "en" as const, label: "English Seera demo" },
    { locale: "ar" as const, label: "Arabic Seera demo" },
    {
      locale: "ar" as const,
      label: "Arabic mixed-script torture",
      torture: true,
    },
  ])(
    "has no bare machine tokens outside .ltr-atom ($label)",
    ({ locale, torture }) => {
      const manifest = buildEvidencePackManifest(
        torture
          ? createMixedScriptTortureEvidencePackInput(locale)
          : createSyntheticEvidencePackInput(locale),
      );
      const html = buildEvidencePackHtml(manifest);
      expect(() => assertNoBareMachineTokensInHtml(html)).not.toThrow();
    },
  );

  it("fails when a machine token is emitted outside .ltr-atom", () => {
    const html = buildEvidencePackHtml(
      buildEvidencePackManifest(createSyntheticEvidencePackInput("ar")),
    ).replace('<bdi class="ltr-atom" dir="ltr">Q-1-1-1</bdi>', "Q-1-1-1");
    expect(() => assertNoBareMachineTokensInHtml(html)).toThrow(
      /Bare machine token.*Q-1-1-1/,
    );
  });
});
