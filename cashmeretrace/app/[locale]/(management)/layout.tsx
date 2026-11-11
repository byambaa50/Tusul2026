import type { ReactNode } from "react";

import AppShell from "@/components/layout/app-shell";

type Props = {
  children: ReactNode;
};

/** Удирдлага (Management) shell — UC-11 (Phase 2 screens). */
export default function ManagementGroupLayout({ children }: Props) {
  return <AppShell role="management">{children}</AppShell>;
}
