import type { AuthSession, Role } from "@eqa/auth";
import type { Locale } from "@eqa/content";
import { headers } from "next/headers";
import { parseLocale } from "../dashboard-params";
import { LOCALE_HEADER } from "../request-locale";
import { isDevViewControlsEnabled } from "./dev-controls";
import { requireServerSession } from "./get-server-session";

/**
 * Locale from middleware header (cookie). Role strictly from verified session —
 * never from query params or headers.
 */
export async function resolvePageLocaleAndRole(
  params: Record<string, string | string[] | undefined>,
): Promise<{ locale: Locale; role: Role }> {
  const { locale, role } = await requireShellPageContext(params);
  return { locale, role };
}

/** Single verified session read for shell pages and their loaders/actions. */
export async function requireShellPageContext(
  params: Record<string, string | string[] | undefined>,
): Promise<{ session: AuthSession; locale: Locale; role: Role }> {
  const session = await requireServerSession();
  const headerStore = await headers();
  const headerLocale = headerStore.get(LOCALE_HEADER);

  let locale: Locale;
  if (isDevViewControlsEnabled() && typeof params.locale === "string") {
    locale = parseLocale(params.locale);
  } else {
    locale = parseLocale(headerLocale ?? undefined);
  }

  return { session, locale, role: session.role };
}
