"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Search, UserPlus } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import TablePager, { usePageSlice } from "@/components/domain/shared/table-pager";
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
import { useSuppliers } from "@/lib/mock/suppliers";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { formatDate } from "@/lib/format/mn";
import { supplierTypes, type SupplierStatus } from "@/lib/types/domain";

const STATUSES: SupplierStatus[] = ["active", "pending", "rejected", "locked"];

/**
 * UC-04 / FR-2.7 — supplier list: search by name/id/contact, filter by
 * status/type/aimag, open details or the edit form. Status changes remain
 * admin-only, so no approve/reject actions render here.
 */
export default function SupplierList() {
  const t = useTranslations("clerk.supplier");
  const tc = useTranslations("clerk.common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();
  const suppliers = useSuppliers();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SupplierStatus | "all">("all");
  const [type, setType] = useState<(typeof supplierTypes)[number] | "all">("all");
  const [aimag, setAimag] = useState("all");

  const aimags = useMemo(
    () => [...new Set(suppliers.map((supplier) => supplier.aimag))].sort((a, b) => a.localeCompare(b)),
    [suppliers],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return suppliers
      .filter((supplier) => {
        if (status !== "all" && supplier.status !== status) return false;
        if (type !== "all" && supplier.type !== type) return false;
        if (aimag !== "all" && supplier.aimag !== aimag) return false;
        if (!needle) return true;
        return [
          supplier.id,
          supplier.name,
          supplier.phone,
          supplier.email,
          supplier.username,
          supplier.aimag,
          supplier.soum,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort(
        (a, b) =>
          b.registeredOn.localeCompare(a.registeredOn) || a.name.localeCompare(b.name),
      );
  }, [suppliers, query, status, type, aimag]);

  const pageSlice = usePageSlice(
    filtered,
    `${query}|${status}|${type}|${aimag}`,
  );

  const hasFilters = query !== "" || status !== "all" || type !== "all" || aimag !== "all";

  return (
    <>
      <PageHeader
        title={t("listTitle")}
        description={t("listSubtitle")}
        actions={
          <Button asChild className="rounded-field font-semibold">
            <Link href={`/${locale}/clerk/suppliers/new`}>
              <UserPlus aria-hidden />
              {t("new")}
            </Link>
          </Button>
        }
      />

      <GlassPanel tier="g2" className="p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
          <div className="relative">
            <Search
              aria-hidden
              className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tc("supplierSearchPlaceholder")}
              aria-label={tc("supplierSearchPlaceholder")}
              className="bg-linen/80 h-11 rounded-field pr-3 pl-9"
            />
          </div>

          <Select value={status} onValueChange={(value) => setStatus(value as SupplierStatus | "all")}>
            <SelectTrigger className="bg-linen/80 h-11 w-full rounded-field" aria-label={t("statusFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ts(`supplier.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={type}
            onValueChange={(value) => setType(value as (typeof supplierTypes)[number] | "all")}
          >
            <SelectTrigger className="bg-linen/80 h-11 w-full rounded-field" aria-label={t("typeFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              {supplierTypes.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`type.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={aimag} onValueChange={setAimag}>
            <SelectTrigger className="bg-linen/80 h-11 w-full rounded-field" aria-label={t("aimagFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("allAimags")}</SelectItem>
              {aimags.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            disabled={!hasFilters}
            onClick={() => {
              setQuery("");
              setStatus("all");
              setType("all");
              setAimag("all");
            }}
            className="bg-linen/60 h-11 rounded-field"
          >
            {tc("clearFilters")}
          </Button>
        </div>

        <p className="text-ink-500 mt-3 text-xs">
          {tc("results", { count: filtered.length })}
        </p>
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={tc("noResults")}
            description={tc("noResultsHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colType")}</TableHead>
                <TableHead>{t("colContact")}</TableHead>
                <TableHead>{t("colOrigin")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colDate")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{tc("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.rows.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/clerk/suppliers/${supplier.id}`}
                      className="text-forest-800 font-medium underline-offset-4 hover:underline"
                    >
                      {supplier.name}
                    </Link>
                    <p className="text-ink-500 tabular-nums text-[11px]">{supplier.id}</p>
                  </TableCell>
                  <TableCell className="text-ink-700">{t(`type.${supplier.type}`)}</TableCell>
                  <TableCell className="text-ink-700">
                    <span className="tabular-nums">{supplier.phone}</span>
                    <p className="text-ink-500 text-[11px]">{supplier.email}</p>
                  </TableCell>
                  <TableCell className="text-ink-700">
                    {supplier.aimag} · {supplier.soum}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={`supplier-${supplier.status}`}
                      label={ts(`supplier.${supplier.status}`)}
                    />
                  </TableCell>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDate(supplier.registeredOn)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/${locale}/clerk/suppliers/${supplier.id}`}>
                          {tc("view")}
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/${locale}/clerk/suppliers/${supplier.id}/edit`}>
                          <Pencil aria-hidden />
                          {tc("edit")}
                        </Link>
                      </Button>
                    </div>
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
          </>
        )}
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}
