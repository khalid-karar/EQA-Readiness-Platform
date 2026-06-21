"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "next/navigation";

interface DemoTableState<T> {
  readonly rows: T[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly setRows: Dispatch<SetStateAction<T[]>>;
}

/** Shared demo loading / error / empty handling for list screens. */
export function useDemoTableState<T>(
  initialRows: readonly T[],
  errorMessage: string,
): DemoTableState<T> {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<T[]>(() => [...initialRows]);
  const [loading, setLoading] = useState(
    searchParams.get("demo") === "loading",
  );
  const error =
    searchParams.get("demo") === "error" ? errorMessage : null;

  useEffect(() => {
    if (searchParams.get("demo") === "loading") {
      const t = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("demo") === "empty") {
      setRows([]);
    } else {
      setRows([...initialRows]);
    }
  }, [searchParams, initialRows]);

  return { rows, loading, error, setRows };
}
