import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { isDevViewControlsEnabled } from "@/lib/auth/dev-controls";
import { requireServerSession } from "@/lib/auth/get-server-session";
import { parseLocale } from "@/lib/dashboard-params";
import { LOCALE_HEADER } from "@/lib/request-locale";

export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const session = await requireServerSession();
  const devViewControls = isDevViewControlsEnabled();
  const headerStore = await headers();
  const locale = parseLocale(headerStore.get(LOCALE_HEADER) ?? undefined);

  return (
    <AppShell
      role={session.role}
      locale={locale}
      devViewControls={devViewControls}
    >
      {children}
    </AppShell>
  );
}
