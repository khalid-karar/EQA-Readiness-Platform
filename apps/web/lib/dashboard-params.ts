import type { DashboardRole } from "@eqa/workflows";
import type { Locale } from "@eqa/content";

const ROLES: readonly DashboardRole[] = ["cae", "audit_staff", "board"];

export function parseLocale(value: string | undefined): Locale {
  return value === "ar" ? "ar" : "en";
}

export function parseRole(value: string | undefined): DashboardRole {
  if (value && (ROLES as readonly string[]).includes(value)) {
    return value as DashboardRole;
  }
  return "cae";
}
