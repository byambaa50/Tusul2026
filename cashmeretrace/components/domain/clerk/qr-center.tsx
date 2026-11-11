"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Package, QrCode, Search } from "lucide-react";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { ClerkPageSkeleton, StatCard } from "@/components/domain/clerk/clerk-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { generateQr, useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";
import type { Batch } from "@/lib/types/domain";

type QrFilter = "all" | "missing" | "created" | "ready";

/** UC-06 — QR code centre: overview and generation entry point. */
export default function QrCenter() {
  const hydrated = useHydrated();
  if (!hydrated) return <ClerkPageSkeleton />;
  return <QrCenterContent />;
}

function QrCenterContent() {
  const t = useTranslations("clerk.qr");
  const tc = useTranslations("clerk.common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();
  const router = useRouter();
  const batches = useBatches();
  const qrRecords = useQrRecords();
  const suppliers = useSuppliers();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<QrFilter>("all");
  const [target, setTarget] = useState<Batch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const qrByBatch = useMemo(
    () => new Map(qrRecords.map((record) => [record.batchId, record])),
    [qrRecords],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return batches.filter((batch) => {
      const record = qrByBatch.get(batch.id);
      if (status === "missing" && record) return false;
      if (status === "created" && record?.status !== "created") return false;
      if (status === "ready" && record?.status !== "ready") return false;
      if (!needle) return true;
      return [batch.id, supplierById.get(batch.supplierId)?.name ?? batch.supplierId]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [batches, qrByBatch, query, status, supplierById]);

  const generated = qrRecords.length;
  const ready = qrRecords.filter((record) => record.status === "ready").length;
  const missing = Math.max(batches.length - generated, 0);

  function handleGenerate(batch: Batch) {
    setError(null);
    try {
      generateQr(batch.id);
      router.push(`/${locale}/clerk/batches/${batch.id}/qr`);
    } catch {
      setError(t("generateError"));
    }
  }

  return (
    <>
      <PageHeader title={t("centerTitle")} description={t("centerSubtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("statTotal")} value={batches.length} icon={Package} />
        <StatCard label={t("statGenerated")} value={generated} icon={QrCode} />
        <StatCard label={t("statReady")} value={ready} icon={CheckCircle2} />
        <StatCard label={t("statMissing")} value={missing} icon={Clock} />
      </div>

      {error ? (
        <p
          role="alert"
          className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field mt-4 border p-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      <GlassPanel tier="g2" className="mt-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
          <div className="relative">
            <Search
              aria-hidden
              className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tc("searchPlaceholder")}
              aria-label={tc("searchPlaceholder")}
              className="bg-linen/80 rounded-field h-11 pr-3 pl-9"
            />
          </div>

          <Select value={status} onValueChange={(value) => setStatus(value as QrFilter)}>
            <SelectTrigger className="bg-linen/80 rounded-field h-11 w-full" aria-label={t("filterStatus")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              <SelectItem value="missing">{t("statusMissing")}</SelectItem>
              <SelectItem value="created">{ts("qr.created")}</SelectItem>
              <SelectItem value="ready">{ts("qr.ready")}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            disabled={query === "" && status === "all"}
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
            className="bg-linen/60 rounded-field h-11"
          >
            {tc("clearFilters")}
          </Button>
        </div>
        <p className="text-ink-500 mt-3 text-xs">{tc("results", { count: filtered.length })}</p>
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        {filtered.length === 0 ? (
          <EmptyState
            title={batches.length === 0 ? t("empty") : tc("noResults")}
            description={batches.length === 0 ? t("emptyHint") : tc("noResultsHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colBatch")}</TableHead>
                <TableHead>{t("colSupplier")}</TableHead>
                <TableHead>{t("colDate")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("colActions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((batch) => {
                const record = qrByBatch.get(batch.id);
                return (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/clerk/batches/${batch.id}`}
                        className="text-forest-800 font-medium tabular-nums underline-offset-4 hover:underline"
                      >
                        {batch.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-700">
                      {supplierById.get(batch.supplierId)?.name ?? batch.supplierId}
                    </TableCell>
                    <TableCell className="text-ink-700 tabular-nums">
                      {formatDate(batch.registeredOn)}
                    </TableCell>
                    <TableCell>
                      {record ? (
                        <StatusBadge
                          status={record.status === "ready" ? "qr-ready" : "qr-created"}
                          label={ts(`qr.${record.status}`)}
                        />
                      ) : (
                        <span className="text-ink-500 text-xs">{t("statusMissing")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {record ? (
                        <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
                          <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>{t("open")}</Link>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-field font-semibold"
                          onClick={() => {
                            setError(null);
                            setTarget(batch);
                          }}
                        >
                          <QrCode aria-hidden />
                          {t("generate")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassPanel>

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title={t("generateConfirmTitle")}
        description={t("generateConfirmBody", { code: target?.id ?? "" })}
        confirmLabel={t("generateConfirm")}
        cancelLabel={tc("continueEditing")}
        onConfirm={() => {
          if (target) handleGenerate(target);
          setTarget(null);
        }}
      />
    </>
  );
}
