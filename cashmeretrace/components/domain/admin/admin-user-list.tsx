"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, UserPlus } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import TablePager, { usePageSlice } from "@/components/domain/shared/table-pager";
import {
  AccountStatusBadge,
  AdminOnlyNote,
  AdminPageSkeleton,
  RoleLabel,
} from "@/components/domain/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { roles, type Role } from "@/lib/constants/nav";
import { formatDate } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { accountStatuses, toDirectoryAccount, useStaffUsers, type DirectoryAccount } from "@/lib/mock/admin";
import { useSuppliers } from "@/lib/mock/suppliers";
import type { SupplierStatus } from "@/lib/types/domain";

export default function AdminUserList() {
  const hydrated = useHydrated();
  if (!hydrated) return <AdminPageSkeleton />;
  return <AdminUserListContent />;
}

function AdminUserListContent() {
  const t = useTranslations("admin.users");
  const tc = useTranslations("admin.common");
  const tr = useTranslations("nav.roles");
  const locale = useCurrentLocale();
  const staff = useStaffUsers();
  const suppliers = useSuppliers();

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [status, setStatus] = useState<SupplierStatus | "all">("all");

  const accounts = useMemo(() => {
    const rows: DirectoryAccount[] = [
      ...staff.map((user) => ({
        id: user.id,
        kind: "staff" as const,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        aimag: user.aimag,
        soum: user.soum,
        registeredOn: user.registeredOn,
      })),
      ...suppliers.map(toDirectoryAccount),
    ];
    const needle = query.trim().toLowerCase();
    return rows
      .filter((account) => {
        if (role !== "all" && account.role !== role) return false;
        if (status !== "all" && account.status !== status) return false;
        if (!needle) return true;
        return [account.id, account.name, account.username, account.email, account.phone]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort(
        (a, b) =>
          b.registeredOn.localeCompare(a.registeredOn) || a.name.localeCompare(b.name),
      );
  }, [staff, suppliers, query, role, status]);

  const pageSlice = usePageSlice(accounts, `${query}|${role}|${status}`);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild className="rounded-field font-semibold">
            <Link href={`/${locale}/admin/users/new`}>
              <UserPlus aria-hidden />
              {t("new")}
            </Link>
          </Button>
        }
      />
      <AdminOnlyNote className="mb-4" />

      <GlassPanel tier="g2" className="mb-4 p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.8fr))]">
          <div className="relative">
            <Search aria-hidden className="text-olive-600 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={tc("search")}
              className="bg-linen/80 h-10 rounded-field pl-9"
            />
          </div>
          <Select value={role} onValueChange={(value) => setRole(value as Role | "all")}>
            <SelectTrigger className="bg-linen/80 h-10 w-full rounded-field" aria-label={t("roleFilter")}>
              <SelectValue placeholder={t("roleFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              {roles.map((option) => (
                <SelectItem key={option} value={option}>
                  {tr(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as SupplierStatus | "all")}>
            <SelectTrigger className="bg-linen/80 h-10 w-full rounded-field" aria-label={t("statusFilter")}>
              <SelectValue placeholder={t("statusFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              {accountStatuses.map((option) => (
                <SelectItem key={option} value={option}>
                  <AccountStatusBadge status={option} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-ink-500 mt-3 text-xs">{t("count", { count: accounts.length })}</p>
      </GlassPanel>

      {accounts.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      ) : (
        <GlassPanel tier="g2" className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{tc("columns.name")}</TableHead>
                <TableHead>{tc("columns.username")}</TableHead>
                <TableHead>{tc("columns.role")}</TableHead>
                <TableHead>{tc("columns.status")}</TableHead>
                <TableHead>{tc("columns.registeredOn")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.rows.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <p className="text-forest-800 font-medium">{account.name}</p>
                    <p className="text-ink-500 text-xs tabular-nums">{account.id}</p>
                  </TableCell>
                  <TableCell className="text-ink-700">{account.username}</TableCell>
                  <TableCell className="text-ink-700">
                    <RoleLabel role={account.role} />
                  </TableCell>
                  <TableCell>
                    <AccountStatusBadge status={account.status} />
                  </TableCell>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDate(account.registeredOn)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
                      <Link href={`/${locale}/admin/users/${account.id}`}>{tc("view")}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePager
            page={pageSlice.page}
            pages={pageSlice.pages}
            total={pageSlice.total}
            from={pageSlice.from}
            to={pageSlice.to}
            onPage={pageSlice.setPage}
          />
        </GlassPanel>
      )}
      <DemoNote className="mt-4">{tc("demoNote")} {tc("noDelete")}</DemoNote>
    </>
  );
}
