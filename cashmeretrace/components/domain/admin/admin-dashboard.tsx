"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BadgeCheck, LockKeyhole, ScrollText, Settings, Users } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import PageHeader from "@/components/domain/shared/page-header";
import {
  AccountStatusBadge,
  AdminOnlyNote,
  AdminPageSkeleton,
  AdminSection,
  AdminStatCard,
  AuditChangeList,
  RoleLabel,
} from "@/components/domain/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { accountStatuses, useAuditLog, useStaffUsers } from "@/lib/mock/admin";
import { useSuppliers } from "@/lib/mock/suppliers";
import { roles, type Role } from "@/lib/constants/nav";

/** UC-12 — administrator home. Actions stay inside this role shell. */
export default function AdminDashboard() {
  const hydrated = useHydrated();
  if (!hydrated) return <AdminPageSkeleton />;
  return <AdminDashboardContent />;
}

function AdminDashboardContent() {
  const t = useTranslations("admin.dashboard");
  const tc = useTranslations("admin.common");
  const ta = useTranslations("admin.audit");
  const tr = useTranslations("nav.roles");
  const locale = useCurrentLocale();
  const staff = useStaffUsers();
  const suppliers = useSuppliers();
  const audit = useAuditLog();

  const counts = useMemo(() => {
    const accounts = [
      ...staff.map((user) => ({ role: user.role as Role, status: user.status })),
      ...suppliers.map((supplier) => ({ role: "supplier" as Role, status: supplier.status })),
    ];
    return {
      total: accounts.length,
      pendingSuppliers: suppliers.filter((supplier) => supplier.status === "pending").length,
      active: accounts.filter((account) => account.status === "active").length,
      locked: accounts.filter((account) => account.status === "locked").length,
      rejected: accounts.filter((account) => account.status === "rejected").length,
      byRole: roles.map((role) => ({
        role,
        count: accounts.filter((account) => account.role === role).length,
      })),
      byStatus: accountStatuses.map((status) => ({
        status,
        count: accounts.filter((account) => account.status === status).length,
      })),
    };
  }, [staff, suppliers]);

  const recent = audit.slice(0, 4);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <span className="border-sage-500/40 bg-sage-100/70 text-olive-600 inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-medium">
            {t("badge")}
          </span>
        }
      />
      <AdminOnlyNote className="mb-4" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label={t("totalUsers")}
          value={formatNumber(counts.total)}
          hint={t("totalUsersHint", {
            staff: formatNumber(staff.length),
            suppliers: formatNumber(suppliers.length),
          })}
          icon={Users}
        />
        <AdminStatCard
          label={t("pending")}
          value={formatNumber(counts.pendingSuppliers)}
          hint={t("pendingHint")}
          icon={BadgeCheck}
        />
        <AdminStatCard
          label={t("active")}
          value={formatNumber(counts.active)}
          hint={t("activeHint")}
          icon={Users}
        />
        <AdminStatCard
          label={t("locked")}
          value={formatNumber(counts.locked)}
          hint={t("lockedHint")}
          icon={LockKeyhole}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminSection title={t("rolesTitle")} description={t("rolesDescription")}>
          <ul className="flex flex-col gap-2">
            {counts.byRole.map((row) => (
              <li key={row.role} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-700">{tr(row.role)}</span>
                <span className="text-forest-900 font-semibold tabular-nums">
                  {formatNumber(row.count)}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
        <AdminSection
          title={t("statusTitle")}
          description={t("statusDescription")}
          action={
            <p className="text-ink-500 text-xs">
              {t("rejectedHint", { count: formatNumber(counts.rejected) })}
            </p>
          }
        >
          <ul className="flex flex-col gap-2">
            {counts.byStatus.map((row) => (
              <li key={row.status} className="flex items-center justify-between gap-3">
                <AccountStatusBadge status={row.status} />
                <span className="text-forest-900 text-sm font-semibold tabular-nums">
                  {formatNumber(row.count)}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      </div>

      <AdminSection
        className="mt-4"
        title={t("recentTitle")}
        description={t("recentDescription")}
        action={
          <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/admin/audit-log`}>
              <ScrollText aria-hidden />
              {t("openAudit")}
            </Link>
          </Button>
        }
      >
        <ul className="flex flex-col gap-3">
          {recent.map((entry) => (
            <li key={entry.id} className="border-brown-500/15 rounded-field border px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-forest-900 text-sm font-medium">{ta(`actions.${entry.action}`)}</p>
                <p className="text-ink-500 text-[11px] tabular-nums">{formatDateTime(entry.occurredAt)}</p>
              </div>
              <p className="text-ink-700 mt-1 text-xs">
                {entry.actorName} · <RoleLabel role={entry.actorRole} /> · {entry.entityLabel}
              </p>
              <div className="mt-1.5">
                <AuditChangeList changes={entry.changes} />
              </div>
            </li>
          ))}
        </ul>
      </AdminSection>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild className="rounded-field font-semibold">
          <Link href={`/${locale}/admin/approvals`}>
            <BadgeCheck aria-hidden />
            {t("openApprovals")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="bg-linen/60 rounded-field">
          <Link href={`/${locale}/admin/users`}>
            <Users aria-hidden />
            {t("openUsers")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="bg-linen/60 rounded-field">
          <Link href={`/${locale}/admin/configuration`}>
            <Settings aria-hidden />
            {t("openSettings")}
          </Link>
        </Button>
      </div>
      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
