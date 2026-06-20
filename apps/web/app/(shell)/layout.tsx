import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";

export default function ShellLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <AppShell>{children}</AppShell>;
}
