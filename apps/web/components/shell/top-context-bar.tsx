"use client";

import type { Role } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { MapPin, UserCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import { uiLabel, roleDisplayLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";
import { useShellPage } from "./shell-page-context";

const ROLE_OPTIONS: Role[] = ["cae", "audit_staff", "board"];

interface TopContextBarProps {
  locale: Locale;
  role: Role;
  devViewControls: boolean;
}

export function TopContextBar({
  locale,
  role,
  devViewControls,
}: TopContextBarProps): React.ReactNode {
  const { meta } = useShellPage();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tenantName = meta.tenantName ?? DEFAULT_TENANT_NAME;
  const assessmentName = meta.assessmentName ?? uiLabel("assessment", locale);
  const location = meta.location;
  const roleLabel = meta.roleLabel;
  const isSummaryView = meta.isSummaryView ?? true;

  function navigate(next: { locale?: Locale; role?: Role }): void {
    const params = new URLSearchParams(searchParams.toString());
    if (next.locale) params.set("locale", next.locale);
    if (next.role) params.set("role", next.role);
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  return (
    <header
      className="sticky top-0 z-30 border-b border-sidebar-muted/40 bg-topbar text-topbar-foreground shadow-sm"
    >
      <div className="flex flex-col gap-2 px-4 py-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-topbar-foreground/60">
            {tenantName}
          </p>
          <h1 className="truncate text-base font-semibold">{assessmentName}</h1>
          {location ? (
            <div className="flex items-center gap-1.5 text-xs text-topbar-foreground/70">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </div>
          ) : null}
        </div>

        <div
          className="flex flex-wrap items-center gap-2 text-xs md:gap-3"
          role="toolbar"
          aria-label={uiLabel("viewControlsLabel", locale)}
        >
          {roleLabel ? (
            <div className="flex items-center gap-2 text-topbar-foreground/80">
              <UserCircle className="h-4 w-4 shrink-0" aria-hidden />
              <span className="font-medium">{roleLabel}</span>
              <StatusPill
                variant="neutral"
                size="sm"
                className="border-topbar-foreground/20 bg-topbar-foreground/10 text-topbar-foreground"
              >
                {isSummaryView
                  ? uiLabel("summaryView", locale)
                  : uiLabel("detailView", locale)}
              </StatusPill>
            </div>
          ) : null}

          <div
            className="hidden h-5 w-px bg-topbar-foreground/20 md:block"
            aria-hidden
          />

          {devViewControls ? (
            <>
              <div
                className="hidden h-5 w-px bg-topbar-foreground/20 md:block"
                aria-hidden
              />

              <div className="flex items-center gap-1">
                <span className="text-topbar-foreground/60 pe-1">
                  {uiLabel("locale", locale)}:
                </span>
                <LocaleToggle
                  locale={locale}
                  target="en"
                  label="EN"
                  ariaLabel={uiLabel("localeEnglish", locale)}
                  onSelect={() => navigate({ locale: "en" })}
                />
                <LocaleToggle
                  locale={locale}
                  target="ar"
                  label="AR"
                  ariaLabel={uiLabel("localeArabic", locale)}
                  onSelect={() => navigate({ locale: "ar" })}
                />
              </div>

              <div
                className="hidden h-5 w-px bg-topbar-foreground/20 md:block"
                aria-hidden
              />

              <div className="flex flex-wrap items-center gap-1">
                <span className="text-topbar-foreground/60 pe-1">
                  {uiLabel("viewAs", locale)}:
                </span>
                {ROLE_OPTIONS.map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate({ role: opt })}
                    className={cn(
                      "h-7 px-2 text-xs text-topbar-foreground/80 hover:bg-topbar-foreground/10 hover:text-topbar-foreground",
                      role === opt &&
                        "bg-brand-gold text-brand-navy hover:bg-brand-gold/90 hover:text-brand-navy",
                    )}
                    aria-pressed={role === opt}
                    aria-label={roleDisplayLabel(opt, locale)}
                  >
                    {roleDisplayLabel(opt, locale)}
                  </Button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function LocaleToggle({
  locale,
  target,
  label,
  ariaLabel,
  onSelect,
}: {
  locale: Locale;
  target: Locale;
  label: string;
  ariaLabel: string;
  onSelect: () => void;
}): React.ReactNode {
  const active = locale === target;
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onSelect}
      className={cn(
        "h-7 px-2 text-xs text-topbar-foreground/80 hover:bg-topbar-foreground/10 hover:text-topbar-foreground",
        active &&
          "bg-brand-gold text-brand-navy hover:bg-brand-gold/90 hover:text-brand-navy",
      )}
      aria-pressed={active}
      aria-label={ariaLabel}
      lang={target}
    >
      {label}
    </Button>
  );
}
