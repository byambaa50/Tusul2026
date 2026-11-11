import type { ReactNode } from "react";

import AppShell from "@/components/layout/app-shell";

type Props = {
  children: ReactNode;
};

/** Чанарын ажилтан (Quality) shell — UC-07/08/09 (Phase 4 screens). */
export default function QualityGroupLayout({ children }: Props) {
  return <AppShell role="quality">{children}</AppShell>;
}
