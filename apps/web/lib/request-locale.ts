import type { Locale } from "@eqa/content";
import { cookies, headers } from "next/headers";
import { parseLocale } from "./dashboard-params";

export const LOCALE_COOKIE = "eqa-locale";
export const LOCALE_HEADER = "x-eqa-locale";

/** Resolves locale from query param, middleware header, or persisted cookie. */
export async function readRequestLocale(
  queryLocale?: string | undefined,
): Promise<Locale> {
  if (queryLocale !== undefined) {
    return parseLocale(queryLocale);
  }

  const headerStore = await headers();
  const fromHeader = headerStore.get(LOCALE_HEADER);
  if (fromHeader) {
    return parseLocale(fromHeader);
  }

  const cookieStore = await cookies();
  return parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
