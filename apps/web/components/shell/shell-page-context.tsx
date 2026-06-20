"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "@eqa/content";

export interface ShellPageMeta {
  assessmentName?: string;
  tenantName?: string;
  location?: string;
  roleLabel?: string;
  isSummaryView?: boolean;
  locale?: Locale;
}

interface ShellPageContextValue {
  meta: ShellPageMeta;
  setPageMeta: (meta: ShellPageMeta) => void;
}

const ShellPageContext = createContext<ShellPageContextValue | null>(null);

export function ShellPageProvider({ children }: { children: ReactNode }): ReactNode {
  const [meta, setMetaState] = useState<ShellPageMeta>({});

  const setPageMeta = useCallback((partial: ShellPageMeta) => {
    setMetaState((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo(
    () => ({ meta, setPageMeta }),
    [meta, setPageMeta],
  );

  return (
    <ShellPageContext.Provider value={value}>{children}</ShellPageContext.Provider>
  );
}

export function useShellPage(): ShellPageContextValue {
  const ctx = useContext(ShellPageContext);
  if (!ctx) {
    throw new Error("useShellPage must be used within ShellPageProvider");
  }
  return ctx;
}
