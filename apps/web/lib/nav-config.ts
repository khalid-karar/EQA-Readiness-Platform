import type { Locale } from "@eqa/content";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  ClipboardCheck,
  FileSearch,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export type AppRoute =
  | "/dashboard"
  | "/assessment"
  | "/evidence"
  | "/findings"
  | "/engagements"
  | "/working-papers"
  | "/remediation"
  | "/mock-eqa"
  | "/evidence-pack";

export interface NavItem {
  readonly id: string;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly icon: LucideIcon;
  readonly href?: AppRoute;
  readonly disabled?: boolean;
}

export const APP_NAV_ITEMS: readonly NavItem[] = [
  {
    id: "dashboard",
    labelEn: "Dashboard",
    labelAr: "لوحة الجاهزية",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "assessment",
    labelEn: "Assessment",
    labelAr: "التقييم",
    icon: ClipboardCheck,
    href: "/assessment",
  },
  {
    id: "evidence",
    labelEn: "Evidence",
    labelAr: "الأدلة",
    icon: FolderOpen,
    href: "/evidence",
  },
  {
    id: "findings",
    labelEn: "Findings",
    labelAr: "النتائج",
    icon: FileSearch,
    href: "/findings",
  },
  {
    id: "engagements",
    labelEn: "Engagements",
    labelAr: "المهام",
    icon: Briefcase,
    href: "/engagements",
  },
  {
    id: "working-papers",
    labelEn: "Working Papers",
    labelAr: "أوراق العمل",
    icon: FileStack,
    href: "/working-papers",
  },
  {
    id: "remediation",
    labelEn: "Remediation",
    labelAr: "المعالجة",
    icon: Wrench,
    href: "/remediation",
  },
  {
    id: "mock-eqa",
    labelEn: "Mock-EQA",
    labelAr: "محاكاة EQA",
    icon: BarChart3,
    href: "/mock-eqa",
  },
  {
    id: "evidence-pack",
    labelEn: "Evidence Pack",
    labelAr: "حزمة الأدلة",
    icon: ShieldCheck,
    href: "/evidence-pack",
  },
];

export const DEFAULT_TENANT_NAME = "Seera";

export function navLabel(item: NavItem, locale: Locale): string {
  return locale === "ar" ? item.labelAr : item.labelEn;
}

export function isNavActive(pathname: string, href: AppRoute): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
