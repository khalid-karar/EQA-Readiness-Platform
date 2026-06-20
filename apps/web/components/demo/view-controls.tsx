"use client";

import type { Locale } from "@eqa/content";
import type { DashboardRole } from "@eqa/workflows";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { uiLabel } from "@/lib/ui-labels";

const ROLE_OPTIONS: {
  value: DashboardRole;
  labelEn: string;
  labelAr: string;
}[] = [
  { value: "cae", labelEn: "CAE", labelAr: "الرئيس التنفيذي للتدقيق" },
  { value: "audit_staff", labelEn: "Audit Staff", labelAr: "فريق التدقيق" },
  { value: "board", labelEn: "Board", labelAr: "المجلس" },
];

interface ViewControlsProps {
  locale: Locale;
  role: DashboardRole;
  basePath: "/dashboard" | "/remediation" | "/mock-eqa" | "/evidence-pack";
}

export function ViewControls({
  locale,
  role,
  basePath,
}: ViewControlsProps): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(next: { locale?: Locale; role?: DashboardRole }): void {
    const params = new URLSearchParams(searchParams.toString());
    if (next.locale) params.set("locale", next.locale);
    if (next.role) params.set("role", next.role);
    router.push(`${basePath}?${params.toString()}`);
  }

  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
      <span className="text-muted-foreground">
        {uiLabel("demoNote", locale)}
      </span>
      <Separator orientation="vertical" className="hidden h-6 md:block" />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={basePath === "/dashboard" ? "default" : "outline"}
          asChild
        >
          <Link href={`/dashboard${suffix}`}>
            {locale === "ar" ? "لوحة الجاهزية" : "Dashboard"}
          </Link>
        </Button>
        <Button
          size="sm"
          variant={basePath === "/remediation" ? "default" : "outline"}
          asChild
        >
          <Link href={`/remediation${suffix}`}>
            {locale === "ar" ? "متتبع المعالجة" : "Remediation"}
          </Link>
        </Button>
        <Button
          size="sm"
          variant={basePath === "/mock-eqa" ? "default" : "outline"}
          asChild
        >
          <Link href={`/mock-eqa${suffix}`}>
            {locale === "ar" ? "محاكاة EQA" : "Mock-EQA"}
          </Link>
        </Button>
        <Button
          size="sm"
          variant={basePath === "/evidence-pack" ? "default" : "outline"}
          asChild
        >
          <Link href={`/evidence-pack${suffix}`}>
            {locale === "ar" ? "حزمة الأدلة" : "Evidence Pack"}
          </Link>
        </Button>
      </div>
      <Separator orientation="vertical" className="hidden h-6 md:block" />
      <div className="flex items-center gap-2">
        <span className="font-medium">{uiLabel("locale", locale)}:</span>
        <Button
          size="sm"
          variant={locale === "en" ? "default" : "outline"}
          onClick={() => navigate({ locale: "en" })}
        >
          EN
        </Button>
        <Button
          size="sm"
          variant={locale === "ar" ? "default" : "outline"}
          onClick={() => navigate({ locale: "ar" })}
        >
          AR
        </Button>
      </div>
      <Separator orientation="vertical" className="hidden h-6 md:block" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{uiLabel("viewAs", locale)}:</span>
        {ROLE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={role === opt.value ? "default" : "outline"}
            onClick={() => navigate({ role: opt.value })}
          >
            {locale === "ar" ? opt.labelAr : opt.labelEn}
          </Button>
        ))}
      </div>
    </div>
  );
}
