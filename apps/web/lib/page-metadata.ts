import type { Metadata } from "next";
import type { Locale } from "@eqa/content";
import { MAYA_AI_MARK_SRC } from "./brand-assets";
import { readRequestLocale } from "./request-locale";

export const SITE_NAME_EN = "Maya AI — EQA Readiness";
export const SITE_NAME_AR = "Maya AI — جاهزية EQA";

export type AppPageId =
  | "dashboard"
  | "assessment"
  | "evidence"
  | "findings"
  | "working-papers"
  | "remediation"
  | "mock-eqa"
  | "evidence-pack"
  | "standard-detail";

interface PageMetaEntry {
  readonly titleEn: string;
  readonly titleAr: string;
  readonly descriptionEn: string;
  readonly descriptionAr: string;
}

const PAGE_META: Record<AppPageId, PageMetaEntry> = {
  dashboard: {
    titleEn: "Readiness dashboard",
    titleAr: "لوحة الجاهزية",
    descriptionEn:
      "Seera-pilot readiness dashboard — journey map, heat map, and pending actions toward EQA.",
    descriptionAr:
      "لوحة جاهزية سيرة التجريبية — خريطة الرحلة، خريطة الحرارة، والإجراءات المعلقة نحو EQA.",
  },
  assessment: {
    titleEn: "Scope & self-assessment",
    titleAr: "النطاق والتقييم الذاتي",
    descriptionEn:
      "Self-rate standards against the pinned EQA Foundations content pack.",
    descriptionAr:
      "قيّم المعايير ذاتياً مقابل حزمة محتوى أسس EQA المثبتة.",
  },
  evidence: {
    titleEn: "Evidence repository",
    titleAr: "مستودع الأدلة",
    descriptionEn:
      "Uploaded evidence with malware scan gate — quarantined until cleared.",
    descriptionAr:
      "الأدلة المرفوعة مع بوابة فحص البرمجيات الخبيثة — في الحجر حتى الإزالة.",
  },
  findings: {
    titleEn: "Findings & human review",
    titleAr: "النتائج والمراجعة البشرية",
    descriptionEn:
      "AI draft findings awaiting human disposition before final conclusions.",
    descriptionAr:
      "مسودات النتائج من الذكاء الاصطناعي بانتظار المراجعة البشرية.",
  },
  "working-papers": {
    titleEn: "Working-paper review",
    titleAr: "مراجعة أوراق العمل",
    descriptionEn:
      "Test methodology on completed engagements — pinned checklist conformance.",
    descriptionAr:
      "اختبر المنهجية على المهام المكتملة — مطابقة قائمة الفحص المثبتة.",
  },
  remediation: {
    titleEn: "Remediation tracker",
    titleAr: "متتبع المعالجة",
    descriptionEn:
      "Remediation plans, owners, and retest loops for confirmed gaps.",
    descriptionAr:
      "خطط المعالجة، المسؤولين، وحلقات إعادة الاختبار للفجوات المؤكدة.",
  },
  "mock-eqa": {
    titleEn: "Mock-EQA simulation",
    titleAr: "محاكاة EQA",
    descriptionEn:
      "Readiness simulation only — not an official EQA assessment result.",
    descriptionAr:
      "محاكاة الجاهزية فقط — وليست نتيجة تقييم EQA رسمية.",
  },
  "evidence-pack": {
    titleEn: "Evidence pack export",
    titleAr: "تصدير حزمة الأدلة",
    descriptionEn:
      "Generate a metadata-only evidence pack PDF with confidentiality footer.",
    descriptionAr:
      "إنشاء حزمة أدلة PDF (بيانات فقط) مع تذييل السرية.",
  },
  "standard-detail": {
    titleEn: "Standard detail",
    titleAr: "تفاصيل المعيار",
    descriptionEn:
      "Read-only view of one standard — requirements, evidence, conformance, and decision trail.",
    descriptionAr:
      "عرض للقراءة فقط لمعيار واحد — المتطلبات والأدلة والمطابقة ومسار القرار.",
  },
};

function siteName(locale: Locale): string {
  return locale === "ar" ? SITE_NAME_AR : SITE_NAME_EN;
}

export function buildPageMetadata(pageId: AppPageId, locale: Locale): Metadata {
  const entry = PAGE_META[pageId];
  const pageTitle = locale === "ar" ? entry.titleAr : entry.titleEn;
  const description =
    locale === "ar" ? entry.descriptionAr : entry.descriptionEn;
  const title = `${pageTitle} | ${siteName(locale)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: siteName(locale),
      locale: locale === "ar" ? "ar_SA" : "en_US",
      type: "website",
      images: [{ url: MAYA_AI_MARK_SRC, width: 512, height: 512, alt: "Maya AI" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [MAYA_AI_MARK_SRC],
    },
  };
}

export async function metadataForShellPage(
  pageId: AppPageId,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Metadata> {
  const params = await searchParams;
  const locale = await readRequestLocale(
    typeof params.locale === "string" ? params.locale : undefined,
  );
  return buildPageMetadata(pageId, locale);
}
