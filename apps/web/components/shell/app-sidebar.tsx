"use client";

import type { Locale } from "@eqa/content";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  APP_NAV_ITEMS,
  isNavActive,
  navLabel,
  type AppRoute,
} from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

interface AppSidebarProps {
  locale: Locale;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AppSidebar({
  locale,
  collapsed,
  onToggleCollapsed,
}: AppSidebarProps): React.ReactNode {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-sidebar text-sidebar-foreground motion-safe transition-[width]",
        collapsed ? "w-16" : "w-60",
      )}
      aria-label={uiLabel("mainNavLabel", locale)}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-muted/60",
          collapsed ? "justify-center px-2" : "gap-3 px-4",
        )}
      >
        <Link
          href={`/dashboard${suffix}`}
          className={cn(
            "flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent",
            collapsed ? "justify-center" : "gap-2",
          )}
          aria-label={uiLabel("brandName", locale)}
        >
          {/* JPEG wordmark — icon crop when collapsed, full mark when expanded */}
          <img
            src="/brand/maya-ai-logo.jpg"
            alt=""
            width={collapsed ? 32 : 140}
            height={32}
            className={cn(
              "h-8 shrink-0 object-contain",
              collapsed
                ? "w-8 object-cover object-left"
                : "w-auto max-w-[140px]",
            )}
            decoding="async"
          />
          {!collapsed && (
            <span className="sr-only">{uiLabel("brandName", locale)}</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-2" role="navigation">
        {APP_NAV_ITEMS.map((item) => {
          const label = navLabel(item, locale);
          const Icon = item.icon;
          const active =
            item.href !== undefined && isNavActive(pathname, item.href);

          if (item.disabled) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/40",
                      collapsed && "justify-center px-2",
                    )}
                    aria-disabled="true"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed && <span>{label}</span>}
                  </span>
                </TooltipTrigger>
                <TooltipContent side={locale === "ar" ? "left" : "right"}>
                  {uiLabel("comingSoon", locale)}
                </TooltipContent>
              </Tooltip>
            );
          }

          const href = `${item.href}${suffix}` as AppRoute | string;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm motion-safe transition-colors",
                    "hover:bg-sidebar-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent",
                    active
                      ? "bg-sidebar-muted text-sidebar-accent font-medium"
                      : "text-sidebar-foreground/85",
                    collapsed && "justify-center px-2",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </TooltipTrigger>
              {collapsed ? (
                <TooltipContent side={locale === "ar" ? "left" : "right"}>
                  {label}
                </TooltipContent>
              ) : null}
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-muted/60 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
          className={cn(
            "w-full text-sidebar-foreground/80 hover:bg-sidebar-muted hover:text-sidebar-foreground",
            collapsed && "px-2",
          )}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? uiLabel("expandSidebar", locale)
              : uiLabel("collapseSidebar", locale)
          }
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 rtl:rotate-180" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 rtl:rotate-180" aria-hidden />
              <span className="text-xs">{uiLabel("collapse", locale)}</span>
            </>
          )}
        </Button>
      </div>

      {!collapsed && (
        <div className="border-t border-sidebar-muted/60 p-3 text-xs text-sidebar-foreground/50">
          {uiLabel("demoNote", locale)}
        </div>
      )}
    </aside>
  );
}
