import type { ReactNode } from "react";

import AppShell from "@/components/layout/app-shell";

type Props = {
  children: ReactNode;
};

/** Нийлүүлэгч (Supplier) shell — UC-02/03 (Phase 2 screens). */
export default function SupplierGroupLayout({ children }: Props) {
  return <AppShell role="supplier">{children}</AppShell>;
}
