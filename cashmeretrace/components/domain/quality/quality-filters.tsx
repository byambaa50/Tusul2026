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
import type { Batch, QualityTest, QrRecord } from "@/lib/types/domain";

export type QualityStateFilter = "all" | "tested" | "untested";
export type QualityQrFilter = "all" | "missing" | "created" | "ready";

export interface QualityFiltersState {
  query: string;
  quality: QualityStateFilter;
  aimag: string;
  year: string;
  qr: QualityQrFilter;
}

export const emptyQualityFilters: QualityFiltersState = {
  query: "",
  quality: "all",
  aimag: "all",
  year: "all",
  qr: "all",
};

/**
 * UC-07 quality search: batch number, supplier, origin, quality state, year
 * and QR state. The "tested" state is derived from the INSERT-ONLY quality
 * store, not only from the batch read model.
 */
export function filterQualityBatches(
  batches: Batch[],
  filters: QualityFiltersState,
  supplierName: (supplierId: string) => string,
  latestByBatch: Map<string, QualityTest>,
  qrByBatch: Map<string, QrRecord>,
): Batch[] {
  const needle = filters.query.trim().toLowerCase();
  return batches.filter((batch) => {
    const latest = latestByBatch.get(batch.id);
    if (filters.quality === "tested" && !latest) return false;
    if (filters.quality === "untested" && latest) return false;
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
      latest?.labResult ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

export default function QualityFilters({
  filters,
  onChange,
  aimags,
  years,
  className,
}: {
  filters: QualityFiltersState;
  onChange: (next: QualityFiltersState) => void;
  aimags: string[];
  years: string[];
  className?: string;
}) {
  const t = useTranslations("quality.search");
  const tc = useTranslations("quality.common");
  const ts = useTranslations("status");

  const hasFilters =
    filters.query !== "" ||
    filters.quality !== "all" ||
    filters.aimag !== "all" ||
    filters.year !== "all" ||
    filters.qr !== "all";

  const patch = (part: Partial<QualityFiltersState>) => onChange({ ...filters, ...part });

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
          value={filters.quality}
          onValueChange={(value) => patch({ quality: value as QualityStateFilter })}
        >
          <SelectTrigger
            className="bg-linen/80 h-11 w-full rounded-field"
            aria-label={t("filterQuality")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allQuality")}</SelectItem>
            <SelectItem value="tested">{t("qualityTested")}</SelectItem>
            <SelectItem value="untested">{t("qualityUntested")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.aimag} onValueChange={(value) => patch({ aimag: value })}>
          <SelectTrigger
            className="bg-linen/80 h-11 w-full rounded-field"
            aria-label={t("filterAimag")}
          >
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
          <SelectTrigger
            className="bg-linen/80 h-11 w-full rounded-field"
            aria-label={t("filterYear")}
          >
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

        <Select
          value={filters.qr}
          onValueChange={(value) => patch({ qr: value as QualityQrFilter })}
        >
          <SelectTrigger
            className="bg-linen/80 h-11 w-full rounded-field"
            aria-label={t("filterQr")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allQr")}</SelectItem>
            <SelectItem value="missing">{tc("qrMissing")}</SelectItem>
            <SelectItem value="created">{ts("qr.created")}</SelectItem>
            <SelectItem value="ready">{ts("qr.ready")}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          disabled={!hasFilters}
          onClick={() => onChange(emptyQualityFilters)}
          className="bg-linen/60 h-11 rounded-field"
        >
          {tc("clearFilters")}
        </Button>
      </div>
    </div>
  );
}
