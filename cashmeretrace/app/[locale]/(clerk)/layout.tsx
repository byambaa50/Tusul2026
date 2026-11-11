import type { ReactNode } from "react";

import AppShell from "@/components/layout/app-shell";

type Props = {
  children: ReactNode;
};

/** Бүртгэлийн ажилтан (Clerk) shell — UC-04/05/06/07 (Phase 2 screens). */
export default function ClerkGroupLayout({ children }: Props) {
  return <AppShell role="clerk">{children}</AppShell>;
}
