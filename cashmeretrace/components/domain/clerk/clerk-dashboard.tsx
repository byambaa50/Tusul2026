"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckCircle2,
  GitCompare,
  Hash,
  Package,
  PackagePlus,
  QrCode,
  Search,
  Users,
} from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { ClerkPageSkeleton, StatCard } from "@/components/domain/clerk/clerk-ui";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";

/** UC-04/05/06/07 entry dashboard for the registration clerk. */
export default function ClerkDashboard() {
  const hydrated = useHydrated();
  if (!hydrated) return <ClerkPageSkeleton />;
  return <ClerkDashboardContent />;
}

function ClerkDashboardContent() {
  const t = useTranslations("clerk.dashboard");
  const tc = useTranslations("clerk.common");
  const tb = useTranslations("clerk.batch");
  const ts = useTranslations("status");
  const tq = useTranslations("clerk.qr");
  const locale = useCurrentLocale();

  const suppliers = useSuppliers();
  const batches = useBatches();
  const qrRecords = useQrRecords();

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const qrByBatch = useMemo(
    () => new Map(qrRecords.map((record) => [record.batchId, record])),
    [qrRecords],
  );

  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active").length;
  const pendingSuppliers = suppliers.filter((supplier) => supplier.status === "pending").length;
  const tested = batches.filter((batch) => batch.status === "tested").length;
  const totalAmount = batches.reduce((sum, batch) => sum + batch.amountKg, 0);
  const readyQr = qrRecords.filter((record) => record.status === "ready").length;
  const recent = batches.slice(0, 5);

  const workflow = [
    {
      title: t("stepSupplier"),
      hint: t("stepSupplierHint"),
      href: `/${locale}/clerk/suppliers`,
      icon: Users,
    },
    {
      title: t("stepBatch"),
      hint: t("stepBatchHint"),
      href: `/${locale}/clerk/batches/new`,
      icon: PackagePlus,
    },
    {
      title: t("stepNumber"),
      hint: t("stepNumberHint"),
      href: `/${locale}/clerk/batches/new`,
      icon: Hash,
    },
    {
      title: t("stepQr"),
      hint: t("stepQrHint"),
      href: `/${locale}/clerk/batches/qr`,
      icon: QrCode,
    },
    {
      title: t("stepTrace"),
      hint: t("stepTraceHint"),
      href: `/${locale}/clerk/search`,
      icon: GitCompare,
    },
  ];

  const quickActions = [
    { label: t("newSupplier"), href: `/${locale}/clerk/suppliers/new`, icon: Users },
    { label: t("newBatch"), href: `/${locale}/clerk/batches/new`, icon: PackagePlus },
    { label: t("findBatch"), href: `/${locale}/clerk/search`, icon: Search },
    { label: t("qrCenter"), href: `/${locale}/clerk/batches/qr`, icon: QrCode },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("statSuppliers")}
          value={suppliers.length}
          hint={t("statSuppliersHint", { active: activeSuppliers, pending: pendingSuppliers })}
          icon={Users}
        />
        <StatCard
          label={t("statBatches")}
          value={batches.length}
          hint={t("statBatchesHint", { tested })}
          icon={Package}
        />
        <StatCard
          label={t("statAmount")}
          value={`${formatNumber(totalAmount, 1)} ${tb("field.amountUnit")}`}
          hint={t("statAmountHint")}
          icon={CheckCircle2}
        />
        <StatCard
          label={t("statQr")}
          value={qrRecords.length}
          hint={t("statQrHint", { ready: readyQr })}
          icon={QrCode}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassPanel tier="g2" className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-forest-900 font-display text-base font-semibold">
                {t("workflowTitle")}
              </h2>
              <p className="text-ink-500 mt-1 text-xs">{t("workflowHint")}</p>
            </div>
          </div>

          <ol className="mt-5 flex flex-col gap-2">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title}>
                  <Link
                    href={step.href}
                    className="border-brown-500/15 bg-linen/50 hover:bg-sage-100/60 rounded-field group flex items-center gap-3 border p-3 transition-colors"
                  >
                    <span className="bg-sage-100 text-olive-600 grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-forest-900 flex items-center gap-1.5 text-sm font-medium">
                        <Icon aria-hidden className="text-olive-600 size-4" />
                        {step.title}
                      </span>
                      <span className="text-ink-500 mt-0.5 block text-xs leading-relaxed">
                        {step.hint}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="text-ink-400 group-hover:text-olive-600 size-4 shrink-0 transition-colors"
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        </GlassPanel>

        <GlassPanel tier="g2" className="p-6">
          <h2 className="text-forest-900 font-display text-base font-semibold">
            {t("quickActions")}
          </h2>
          <div className="mt-4 grid gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  asChild
                  variant="outline"
                  className="bg-linen/60 rounded-field h-auto justify-start px-3 py-3"
                >
                  <Link href={action.href}>
                    <Icon aria-hidden className="text-olive-600" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="border-brown-500/15 mt-5 border-t pt-4">
            <p className="text-ink-500 text-xs leading-relaxed">{tc("demoNote")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("recentTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("recentHint")}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/clerk/batches`}>
              {t("viewAll")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title={t("empty")}
            description={t("emptyHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colCode")}</TableHead>
                <TableHead>{t("colSupplier")}</TableHead>
                <TableHead>{t("colDate")}</TableHead>
                <TableHead className="text-right">{t("colAmount")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colQr")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((batch) => {
                const qr = qrByBatch.get(batch.id);
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
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(batch.amountKg, 1)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={`batch-${batch.status}`}
                        label={ts(`batch.${batch.status}`)}
                      />
                    </TableCell>
                    <TableCell>
                      {qr ? (
                        <Link href={`/${locale}/clerk/batches/${batch.id}/qr`}>
                          <StatusBadge
                            status={qr.status === "ready" ? "qr-ready" : "qr-created"}
                            label={ts(`qr.${qr.status}`)}
                          />
                        </Link>
                      ) : (
                        <span className="text-ink-500 text-xs">{tq("statusMissing")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassPanel>
    </>
  );
}
