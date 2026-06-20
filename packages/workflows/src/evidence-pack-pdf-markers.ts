import { EVIDENCE_PACK_CONFIDENTIALITY } from "./evidence-pack";

/** ASCII markers embedded in PDF output for verification. */
export const PACK_PDF_MARKERS = {
  confidentiality: "CONFIDENTIAL EQA readiness pack",
  disclaimer: "READINESS SIMULATION ONLY",
  rawExcluded: "Raw evidence excluded by default",
} as const;

/** Arabic markers for locale=ar PDF verification. */
export const PACK_PDF_MARKERS_AR = {
  confidentiality: EVIDENCE_PACK_CONFIDENTIALITY.shortAr,
  disclaimer: "محاكاة الجاهزية فقط",
  rawExcluded: "الأدلة الخام مستبعدة افتراضياً",
} as const;
