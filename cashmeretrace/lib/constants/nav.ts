import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  ChartColumn,
  CircleUser,
  FlaskConical,
  GitCompare,
  LayoutDashboard,
  NotebookPen,
  Package,
  PackagePlus,
  QrCode,
  ScrollText,
  Search,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";

/**
 * Five roles of the system (PDF §2.2 / table 97).
 * Phase 1 demo only — the real system derives the role from the account.
 */
export const roles = ["supplier", "clerk", "quality", "management", "admin"] as const;

export type Role = (typeof roles)[number];

/** Landing path (after the locale segment) per role — UC-10 step 7 / NFR-03. */
export const homeOf: Record<Role, string> = {
  supplier: "/supplier",
  clerk: "/clerk",
  quality: "/quality",
  management: "/management",
  admin: "/admin",
};

export interface NavItem {
  /** next-intl key below the "nav" namespace. */
  labelKey: string;
  /** Path after the locale segment, e.g. "/supplier/records". */
  href: string;
  icon: LucideIcon;
  /**
   * 1 = shipped screen (composite link), 2 = Phase-3 placeholder that stays
   * visible but disabled (NFR-09 visibility rule).
   */
  phase: 1 | 2;
}

export interface NavSection {
  /** next-intl key for the section heading. */
  labelKey?: string;
  items: NavItem[];
}

/** Sidebar sections per role — strictly that role's accessible UCs (§4). */
export const navByRole: Record<Role, NavSection[]> = {
  supplier: [
    { items: [{ labelKey: "supplier.home", href: homeOf.supplier, icon: LayoutDashboard, phase: 1 }] },
    {
      labelKey: "supplier.recordsSection",
      items: [{ labelKey: "supplier.records", href: "/supplier/records", icon: NotebookPen, phase: 1 }],
    },
    {
      labelKey: "supplier.qualitySection",
      items: [{ labelKey: "supplier.quality", href: "/supplier/quality", icon: FlaskConical, phase: 1 }],
    },
  ],
  clerk: [
    { items: [{ labelKey: "clerk.home", href: homeOf.clerk, icon: LayoutDashboard, phase: 1 }] },
    {
      labelKey: "clerk.suppliersSection",
      items: [
        { labelKey: "clerk.suppliers", href: "/clerk/suppliers", icon: Users, phase: 1 },
        { labelKey: "clerk.supplierNew", href: "/clerk/suppliers/new", icon: UserPlus, phase: 1 },
      ],
    },
    {
      labelKey: "clerk.batchesSection",
      items: [
        { labelKey: "clerk.batches", href: "/clerk/batches", icon: Package, phase: 1 },
        { labelKey: "clerk.batchesNew", href: "/clerk/batches/new", icon: PackagePlus, phase: 1 },
      ],
    },
    {
      labelKey: "clerk.qrSection",
      items: [{ labelKey: "clerk.qr", href: "/clerk/batches/qr", icon: QrCode, phase: 1 }],
    },
    {
      labelKey: "clerk.searchSection",
      items: [{ labelKey: "clerk.search", href: "/clerk/search", icon: Search, phase: 1 }],
    },
  ],
  quality: [
    { items: [{ labelKey: "quality.home", href: homeOf.quality, icon: LayoutDashboard, phase: 1 }] },
    {
      labelKey: "quality.searchSection",
      items: [{ labelKey: "quality.search", href: "/quality/search", icon: Search, phase: 1 }],
    },
    {
      labelKey: "quality.testsSection",
      items: [{ labelKey: "quality.tests", href: "/quality/tests", icon: FlaskConical, phase: 1 }],
    },
    {
      labelKey: "quality.publishSection",
      items: [{ labelKey: "quality.publish", href: "/quality/publish", icon: Settings, phase: 1 }],
    },
  ],
  management: [
    { items: [{ labelKey: "management.home", href: homeOf.management, icon: LayoutDashboard, phase: 1 }] },
    {
      labelKey: "management.reportsSection",
      items: [
        { labelKey: "management.reports", href: "/management/reports", icon: ChartColumn, phase: 1 },
        { labelKey: "management.comparison", href: "/management/comparison", icon: GitCompare, phase: 1 },
      ],
    },
  ],
  admin: [
    { items: [{ labelKey: "admin.home", href: homeOf.admin, icon: LayoutDashboard, phase: 1 }] },
    {
      labelKey: "admin.usersSection",
      items: [
        { labelKey: "admin.users", href: "/admin/users", icon: Users, phase: 1 },
        { labelKey: "admin.approvals", href: "/admin/approvals", icon: BadgeCheck, phase: 1 },
        { labelKey: "admin.configuration", href: "/admin/configuration", icon: Settings, phase: 1 },
        { labelKey: "admin.audit", href: "/admin/audit-log", icon: ScrollText, phase: 1 },
      ],
    },
  ],
};

/** Roles whose header shows the global batch search entry (UC-07). */
export const quickSearchRoles: Role[] = ["clerk", "quality"];

/**
 * Extra screens linked from the header user menu instead of the sidebar
 * (the approved supplier sidebar keeps its three UC sections only).
 */
export const headerNavByRole: Partial<Record<Role, NavItem[]>> = {
  supplier: [
    { labelKey: "supplier.profile", href: "/supplier/profile", icon: CircleUser, phase: 1 },
  ],
};

/**
 * Matches the current pathname (with locale prefix) to a nav item
 * (sidebar first, then header-menu extras). Returns the item plus its
 * section label for breadcrumbs. The longest matching href wins so that
 * `/clerk/batches/qr` does not collapse into `/clerk/batches`.
 */
export function findNavItem(
  role: Role,
  pathname: string,
): { item: NavItem; sectionLabelKey?: string } | null {
  const rest = "/" + pathname.split("/").filter(Boolean).slice(1).join("/");
  const candidates: Array<{ item: NavItem; sectionLabelKey?: string }> = [];

  for (const item of headerNavByRole[role] ?? []) {
    if (rest === item.href || rest.startsWith(`${item.href}/`)) {
      candidates.push({ item });
    }
  }
  for (const section of navByRole[role]) {
    for (const item of section.items) {
      if (rest === item.href || rest.startsWith(`${item.href}/`)) {
        candidates.push({ item, sectionLabelKey: section.labelKey });
      }
    }
  }

  return (
    candidates.sort((a, b) => b.item.href.length - a.item.href.length)[0] ?? null
  );
}
