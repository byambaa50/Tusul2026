"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, FlaskConical, QrCode, Search, Settings, ShieldCheck } from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import DemoNote from "@/components/domain/shared/demo-note";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { StatCard } from "@/components/domain/clerk/clerk-ui";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { usePublishConfigs } from "@/lib/mock/publish";
import { useQualityTests } from "@/lib/mock/quality";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";

/** UC-09 — per-batch QR publish configuration index. */
export default function QualityPublishIndex() {
  const hydrated = useHydrated();
  if (!hydrated) return <QualityPageSkeleton />;
  return <QualityPublishIndexContent />;
}

function QualityPublishIndexContent() {
  const t = useTranslations("quality.publish");
  const tc = useTranslations("quality.common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();
  const publishConfigs = usePublishConfigs();
  const qrRecords = useQrRecords();
  const [query, setQuery] = useState("");

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const latestByBatch = useMemo(() => {
    const map = new Map<string, (typeof tests)[number]>();
    for (const test of tests) {
      if (!map.has(test.batchId)) map.set(test.batchId, test);
    }
    return map;
  }, [tests]);
  const configByBatch = useMemo(
    () => new Map(publishConfigs.map((config) => [config.batchId, config])),
    [publishConfigs],
  );
  const qrByBatch = useMemo(
    () => new Map(qrRecords.map((record) => [record.batchId, record])),
    [qrRecords],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return batches;
    return batches.filter((batch) => {
      const supplierName =
        supplierById.get(batch.supplierId)?.name ?? batch.supplierId;
      const latest = latestByBatch.get(batch.id);
      return [
        batch.id,
        supplierName,
        batch.aimag,
        batch.soum,
        latest?.labResult ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [batches, latestByBatch, query, supplierById]);

  const configured = batches.filter((batch) => configByBatch.has(batch.id)).length;
  const published = publishConfigs.filter(
    (config) => config.status === "published" && batches.some((batch) => batch.id === config.batchId),
  ).length;
  const hidden = publishConfigs.filter(
    (config) => config.status === "hidden" && batches.some((batch) => batch.id === config.batchId),
  ).length;
  const qrMissing = batches.filter((batch) => !qrByBatch.has(batch.id)).length;

  return (
    <>
      <PageHeader
        title={t("indexTitle")}
        description={t("indexSubtitle")}
        actions={
          <Button asChild variant="outline" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/quality/search`}>
              <Search aria-hidden />
              {t("backToSearch")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("statConfigured")} value={configured} icon={Settings} />
        <StatCard label={t("statPublished")} value={published} icon={ShieldCheck} />
        <StatCard label={t("statHidden")} value={hidden} icon={QrCode} />
        <StatCard label={t("statQrMissing")} value={qrMissing} icon={QrCode} />
      </div>

      <GlassPanel tier="g2" className="mt-4 p-5 sm:p-6">
        <label
          htmlFor="quality-publish-search"
          className="text-ink-500 mb-2 block text-xs font-medium tracking-wide uppercase"
        >
          {t("queryLabel")}
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            id="quality-publish-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="bg-linen/80 h-11 rounded-field pr-3 pl-9"
          />
        </div>
        <p className="text-ink-500 mt-3 text-xs tabular-nums">
          {tc("results", { count: filtered.length })}
        </p>
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("indexTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("whitelistNote")}</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={t("noResults")}
            description={t("noResultsHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colBatch")}</TableHead>
                <TableHead>{t("colSupplier")}</TableHead>
                <TableHead>{t("colLatest")}</TableHead>
                <TableHead>{t("colQr")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-center">{t("colFields")}</TableHead>
                <TableHead>{t("colUpdated")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("colActions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((batch) => {
                const latest = latestByBatch.get(batch.id) ?? null;
                const config = configByBatch.get(batch.id) ?? null;
                const qr = qrByBatch.get(batch.id) ?? null;
                return (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/quality/batches/${batch.id}`}
                        className="text-forest-800 font-medium tabular-nums underline-offset-4 hover:underline"
                      >
                        {batch.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-700">
                      {supplierById.get(batch.supplierId)?.name ?? batch.supplierId}
                    </TableCell>
                    <TableCell className="text-ink-700 text-xs">
                      {latest ? (
                        <span className="tabular-nums">
                          <span className="text-ink-900 font-medium">
                            {formatNumber(latest.finenessMicron, 1)} {tc("unitMicron")}
                          </span>
                          <span className="text-ink-500 block">
                            {formatDate(latest.testedOn)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-500">{t("latestMissing")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {qr ? (
                        <StatusBadge
                          status={qr.status === "ready" ? "qr-ready" : "qr-created"}
                          label={ts(`qr.${qr.status}`)}
                        />
                      ) : (
                        <span className="text-ink-500 text-xs">{tc("qrMissing")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {config ? (
                        <StatusBadge
                          status={
                            config.status === "published"
                              ? "publish-published"
                              : "publish-hidden"
                          }
                          label={ts(`publish.${config.status}`)}
                        />
                      ) : (
                        <span className="text-ink-500 text-xs">{t("notConfigured")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-ink-700 text-xs tabular-nums">
                      {config ? t("fieldsCount", { count: config.fields.length }) : "—"}
                    </TableCell>
                    <TableCell className="text-ink-700 text-xs tabular-nums">
                      {config?.updatedAt ? formatDateTime(config.updatedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          title={t("configure")}
                        >
                          <Link
                            href={`/${locale}/quality/batches/${batch.id}/publish`}
                            aria-label={`${t("configure")} ${batch.id}`}
                          >
                            <Settings aria-hidden />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon-sm" title={t("preview")}>
                          <Link
                            href={`/${locale}/quality/batches/${batch.id}/preview`}
                            aria-label={`${t("preview")} ${batch.id}`}
                          >
                            <Eye aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          title={tc("enterTest")}
                        >
                          <Link
                            href={`/${locale}/quality/batches/${batch.id}/test`}
                            aria-label={`${tc("enterTest")} ${batch.id}`}
                          >
                            <FlaskConical aria-hidden />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassPanel>

      <p className="text-ink-500 mt-4 text-xs leading-relaxed">{tc("latestOrderNote")}</p>
      <DemoNote className="mt-3">{tc("demoNote")}</DemoNote>
    </>
  );
}
