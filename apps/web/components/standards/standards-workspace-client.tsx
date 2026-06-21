"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill, readinessVariantFromLevel } from "@/components/ui/status-pill";
import { ScreenAlertBanner } from "@/components/ui/screen-alert-banner";
import { useSyncShellMeta } from "@/components/shell/use-sync-shell-meta";
import { DEFAULT_TENANT_NAME } from "@/lib/nav-config";
import {
  countVisibleStandards,
  filterStandardsWorkspaceTree,
  standardsWorkspaceAssignmentNote,
  type PresentedDomainNode,
  type PresentedStandardNode,
  type StandardsWorkspaceFilters,
  type StandardsWorkspacePresentation,
} from "@/lib/standards-workspace-shared";
import { uiLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

interface StandardsWorkspaceClientProps {
  presentation: StandardsWorkspacePresentation;
}

function StandardsWorkspaceClientInner({
  presentation,
}: StandardsWorkspaceClientProps): ReactNode {
  const { locale, role } = presentation;
  const [filters, setFilters] = useState<StandardsWorkspaceFilters>({
    gapsOnly: false,
    assignedToMe: false,
    unanswered: false,
  });
  const [expandedDomains, setExpandedDomains] = useState<ReadonlySet<string>>(
    () => new Set(presentation.domains.map((domain) => domain.id)),
  );
  const [expandedPrinciples, setExpandedPrinciples] = useState<
    ReadonlySet<string>
  >(
    () =>
      new Set(
        presentation.domains.flatMap((domain) =>
          domain.principles.map((principle) => principle.id),
        ),
      ),
  );

  const filteredDomains = useMemo(
    () => filterStandardsWorkspaceTree(presentation.domains, filters),
    [presentation.domains, filters],
  );
  const visibleCount = countVisibleStandards(filteredDomains);
  const filtersActive =
    filters.gapsOnly || filters.assignedToMe || filters.unanswered;

  useSyncShellMeta({
    locale,
    tenantName: DEFAULT_TENANT_NAME,
    assessmentName: presentation.assessmentName,
    location: uiLabel("standardsWorkspaceLocation", locale),
    roleLabel: presentation.roleLabel,
    isSummaryView: role === "board",
  });

  function toggleFilter(key: keyof StandardsWorkspaceFilters): void {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleDomain(domainId: string): void {
    setExpandedDomains((current) => {
      const next = new Set(current);
      if (next.has(domainId)) next.delete(domainId);
      else next.add(domainId);
      return next;
    });
  }

  function togglePrinciple(principleId: string): void {
    setExpandedPrinciples((current) => {
      const next = new Set(current);
      if (next.has(principleId)) next.delete(principleId);
      else next.add(principleId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {uiLabel("standardsWorkspaceTitle", locale)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {uiLabel("standardsWorkspaceSubtitle", locale)}
        </p>
      </header>

      {!presentation.supportsStandardAssignment ? (
        <ScreenAlertBanner
          variant="unreviewed"
          title={uiLabel("standardsWorkspaceAssignmentNoteTitle", locale)}
        >
          {standardsWorkspaceAssignmentNote(locale)}
        </ScreenAlertBanner>
      ) : null}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{uiLabel("standardsWorkspaceNavigatorTitle", locale)}</CardTitle>
            <p className="text-sm tabular-nums text-muted-foreground">
              {filtersActive
                ? uiLabel("standardsWorkspaceFilteredCount", locale)
                    .replace("{visible}", String(visibleCount))
                    .replace("{total}", String(presentation.totalStandards))
                : uiLabel("standardsWorkspaceTotalCount", locale).replace(
                    "{total}",
                    String(presentation.totalStandards),
                  )}
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={uiLabel("standardsWorkspaceFiltersLabel", locale)}
          >
            <FilterToggle
              active={filters.gapsOnly}
              onClick={() => toggleFilter("gapsOnly")}
              label={uiLabel("standardsWorkspaceFilterGaps", locale)}
            />
            <FilterToggle
              active={filters.assignedToMe}
              onClick={() => toggleFilter("assignedToMe")}
              label={uiLabel("standardsWorkspaceFilterAssigned", locale)}
            />
            <FilterToggle
              active={filters.unanswered}
              onClick={() => toggleFilter("unanswered")}
              label={uiLabel("standardsWorkspaceFilterUnanswered", locale)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredDomains.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              {uiLabel("standardsWorkspaceEmptyFilters", locale)}
            </p>
          ) : (
            filteredDomains.map((domain) => (
              <DomainSection
                key={domain.id}
                domain={domain}
                locale={locale}
                expanded={expandedDomains.has(domain.id)}
                expandedPrinciples={expandedPrinciples}
                onToggleDomain={() => toggleDomain(domain.id)}
                onTogglePrinciple={togglePrinciple}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): ReactNode {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function DomainSection({
  domain,
  locale,
  expanded,
  expandedPrinciples,
  onToggleDomain,
  onTogglePrinciple,
}: {
  domain: PresentedDomainNode;
  locale: StandardsWorkspacePresentation["locale"];
  expanded: boolean;
  expandedPrinciples: ReadonlySet<string>;
  onToggleDomain: () => void;
  onTogglePrinciple: (principleId: string) => void;
}): ReactNode {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={onToggleDomain}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-3 text-start text-sm font-semibold hover:bg-muted/40"
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span>
          {domain.number}. {domain.title}
        </span>
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-border px-2 pb-3 pt-2">
          {domain.principles.map((principle) => (
            <PrincipleSection
              key={principle.id}
              principle={principle}
              locale={locale}
              expanded={expandedPrinciples.has(principle.id)}
              onToggle={() => onTogglePrinciple(principle.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PrincipleSection({
  principle,
  locale,
  expanded,
  onToggle,
}: {
  principle: PresentedDomainNode["principles"][number];
  locale: StandardsWorkspacePresentation["locale"];
  expanded: boolean;
  onToggle: () => void;
}): ReactNode {
  return (
    <div className="rounded-md border border-border/70 bg-background">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs font-medium text-muted-foreground hover:bg-muted/30"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        <span>
          {principle.number}. {principle.title}
        </span>
      </button>
      {expanded ? (
        <ul className="divide-y divide-border border-t border-border">
          {principle.standards.map((standard) => (
            <StandardRow key={standard.standardNumber} standard={standard} locale={locale} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StandardRow({
  standard,
  locale,
}: {
  standard: PresentedStandardNode;
  locale: StandardsWorkspacePresentation["locale"];
}): ReactNode {
  const pillVariant = readinessVariantFromLevel(standard.readinessLevel);

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full",
          standard.readinessLevel === "green" && "bg-readiness-conformant",
          standard.readinessLevel === "amber" && "bg-readiness-partial",
          standard.readinessLevel === "red" && "bg-readiness-gap",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <Link
          href={standard.detailHref}
          className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="tabular-nums">{standard.standardNumber}</span>
          {" — "}
          {standard.standardTitle}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusPill variant={pillVariant} size="sm">
            {standard.statusLabel}
          </StatusPill>
          <span className="tabular-nums">
            {standard.answeredCount}/{standard.questionCount}{" "}
            {uiLabel("standardsWorkspaceResponses", locale)}
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">{uiLabel("standardsWorkspaceOwner", locale)}:</span>{" "}
        {standard.ownerLabel ?? uiLabel("standardsWorkspaceOwnerUnset", locale)}
      </div>
    </li>
  );
}

export function StandardsWorkspaceClient({
  presentation,
}: StandardsWorkspaceClientProps): ReactNode {
  return (
    <Suspense fallback={null}>
      <StandardsWorkspaceClientInner presentation={presentation} />
    </Suspense>
  );
}
