"use client";

import { useEffect } from "react";
import { useShellPage, type ShellPageMeta } from "./shell-page-context";

/** Syncs page-specific shell header metadata (assessment, location, role). */
export function useSyncShellMeta(meta: ShellPageMeta): void {
  const { setPageMeta } = useShellPage();

  useEffect(() => {
    setPageMeta(meta);
  }, [
    meta.assessmentName,
    meta.tenantName,
    meta.location,
    meta.roleLabel,
    meta.isSummaryView,
    meta.locale,
    setPageMeta,
  ]);
}
