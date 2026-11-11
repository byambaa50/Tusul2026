import type { ReactNode } from "react";

import AppShell from "@/components/layout/app-shell";

type Props = {
  children: ReactNode;
};

/** Админ (Admin) shell — UC-12 (Phase 2 screens). */
export default function AdminGroupLayout({ children }: Props) {
  return <AppShell role="admin">{children}</AppShell>;
}
