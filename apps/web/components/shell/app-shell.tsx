"use client";

import type { Role } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { Suspense, useState, type ReactNode } from "react";
import { parseLocale } from "@/lib/dashboard-params";
import { Toaster } from "@/components/ui/toaster";
import { AppSidebar } from "./app-sidebar";
import { ShellPageProvider } from "./shell-page-context";
import { TopContextBar } from "./top-context-bar";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";
import { useSearchParams } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppShellProps {
  children: ReactNode;
  role: Role;
  locale: Locale;
  devViewControls: boolean;
}

function AppShellInner({
  children,
  role,
  locale: serverLocale,
  devViewControls,
}: AppShellProps): ReactNode {
  const searchParams = useSearchParams();
  const locale = devViewControls
    ? parseLocale(searchParams.get("locale") ?? serverLocale)
    : serverLocale;
  const [collapsed, setCollapsed] = useState(false);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div
      dir={dir}
      lang={locale}
      className={cn(
        "flex min-h-screen bg-background",
        locale === "ar" ? "font-arabic" : "font-sans",
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-brand-gold focus:px-4 focus:py-2 focus:text-brand-navy"
      >
        {uiLabel("skipToContent", locale)}
      </a>

      <AppSidebar
        locale={locale}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopContextBar
          locale={locale}
          role={role}
          devViewControls={devViewControls}
        />
        <main
          id="main-content"
          className="flex-1 overflow-auto bg-surface-muted p-4 md:p-6"
        >
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
      <Toaster locale={locale} />
    </div>
  );
}

export function AppShell({
  children,
  role,
  locale,
  devViewControls,
}: AppShellProps): ReactNode {
  return (
    <ShellPageProvider>
      <TooltipProvider delayDuration={200}>
        <Suspense fallback={<ShellFallback />}>
          <AppShellInner
            role={role}
            locale={locale}
            devViewControls={devViewControls}
          >
            {children}
          </AppShellInner>
        </Suspense>
      </TooltipProvider>
    </ShellPageProvider>
  );
}

function ShellFallback(): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      {uiLabel("shellLoading", "en")}
    </div>
  );
}
