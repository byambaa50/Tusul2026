"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Batch, QrRecord } from "@/lib/types/domain";

export type QrFilter = "all" | "missing" | "created" | "ready";
export type BatchStatusFilter = "all" | Batch["status"];

export interface BatchFiltersState {
  query: string;
  status: BatchStatusFilter;
  aimag: string;
  year: string;
  qr: QrFilter;
}

export const emptyBatchFilters: BatchFiltersState = {
  query: "",
  status: "all",
  aimag: "all",
  year: "all",
  qr: "all",
};

/** UC-07 search: number, supplier, origin/status/year and QR state. */
export function filterBatches(
  batches: Batch[],
  filters: BatchFiltersState,
  supplierName: (supplierId: string) => string,
  qrByBatch: Map<string, QrRecord>,
): Batch[] {
  const needle = filters.query.trim().toLowerCase();
  return batches.filter((batch) => {
    if (filters.status !== "all" && batch.status !== filters.status) return false;
    if (filters.aimag !== "all" && batch.aimag !== filters.aimag) return false;
    if (filters.year !== "all" && !batch.registeredOn.startsWith(filters.year)) return false;
    if (filters.qr !== "all") {
      const record = qrByBatch.get(batch.id);
      if (filters.qr === "missing" && record) return false;
      if (filters.qr === "created" && record?.status !== "created") return false;
      if (filters.qr === "ready" && record?.status !== "ready") return false;
    }
    if (!needle) return true;
    return [
      batch.id,
      supplierName(batch.supplierId),
      batch.aimag,
      batch.soum,
      batch.notes ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

export default function BatchFilters({
  filters,
  onChange,
  aimags,
  years,
  className,
}: {
  filters: BatchFiltersState;
  onChange: (next: BatchFiltersState) => void;
  aimags: string[];
  years: string[];
  className?: string;
}) {
  const t = useTranslations("clerk.batch");
  const tc = useTranslations("clerk.common");
  const tq = useTranslations("clerk.qr");
  const ts = useTranslations("status");

  const hasFilters =
    filters.query !== "" ||
    filters.status !== "all" ||
    filters.aimag !== "all" ||
    filters.year !== "all" ||
    filters.qr !== "all";

  const patch = (part: Partial<BatchFiltersState>) => onChange({ ...filters, ...part });

  return (
    <div className={className}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto]">
        <div className="relative">
          <Search
            aria-hidden
            className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
            placeholder={tc("searchPlaceholder")}
            aria-label={tc("searchPlaceholder")}
            className="bg-linen/80 h-11 rounded-field pr-3 pl-9"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => patch({ status: value as BatchStatusFilter })}
        >
          <SelectTrigger className="bg-linen/80 h-11 w-full rounded-field" aria-label={t("filterStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="registered">{ts("batch.registered")}</SelectItem>
            <SelectItem value="tested">{ts("batch.tested")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.aimag} onValueChange={(value) => patch({ aimag: value })}>
          <SelectTrigger className="bg-linen/80 h-11 w-full rounded-field" aria-label={t("filterAimag")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">{t("allAimags")}</SelectItem>
            {aimags.map((aimag) => (
              <SelectItem key={aimag} value={aimag}>
                {aimag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.year} onValueChange={(value) => patch({ year: value })}>
          <SelectTrigger className="bg-linen/80 h-11 w-full rounded-field" aria-label={t("filterYear")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allYears")}</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.qr} onValueChange={(value) => patch({ qr: value as QrFilter })}>
          <SelectTrigger className="bg-linen/80 h-11 w-full rounded-field" aria-label={t("filterQr")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allQr")}</SelectItem>
            <SelectItem value="missing">{tq("statusMissing")}</SelectItem>
            <SelectItem value="created">{tq("statGenerated")}</SelectItem>
            <SelectItem value="ready">{tq("statReady")}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          disabled={!hasFilters}
          onClick={() => onChange(emptyBatchFilters)}
          className="bg-linen/60 h-11 rounded-field"
        >
          {tc("clearFilters")}
        </Button>
      </div>
    </div>
  );
}
