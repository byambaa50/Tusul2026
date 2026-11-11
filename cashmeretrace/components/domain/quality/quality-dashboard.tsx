"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Eye,
  FlaskConical,
  GitCompare,
  Package,
  QrCode,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import { StatCard } from "@/components/domain/clerk/clerk-ui";
import { InsertOnlyNote, QualityPageSkeleton } from "@/components/domain/quality/quality-ui";
import { Button } from "@/components/ui/button";
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
import { useSuppliers } from "@/lib/mock/suppliers";

/** UC-08/UC-09 entry dashboard for the quality officer. */
export default function QualityDashboard() {
  const hydrated = useHydrated();
  if (!hydrated) return <QualityPageSkeleton />;
  return <QualityDashboardContent />;
}

function QualityDashboardContent() {
  const t = useTranslations("quality.dashboard");
  const tc = useTranslations("quality.common");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const suppliers = useSuppliers();
  const tests = useQualityTests();
  const publishConfigs = usePublishConfigs();

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

  const awaiting = useMemo(
    () => batches.filter((batch) => !latestByBatch.has(batch.id)).slice(0, 5),
    [batches, latestByBatch],
  );
  const recent = tests.slice(0, 6);
  const published = publishConfigs.filter((config) => config.status === "published").length;

  const workflow = [
    {
      title: t("stepSearch"),
      hint: t("stepSearchHint"),
      href: `/${locale}/quality/search`,
      icon: Search,
    },
    {
      title: t("stepRead"),
      hint: t("stepReadHint"),
      href: `/${locale}/quality/search`,
      icon: Eye,
    },
    {
      title: t("stepEnter"),
      hint: t("stepEnterHint"),
      href: `/${locale}/quality/search`,
      icon: FlaskConical,
    },
    {
      title: t("stepValidate"),
      hint: t("stepValidateHint"),
      href: `/${locale}/quality/search`,
      icon: ShieldCheck,
    },
    {
      title: t("stepSave"),
      hint: t("stepSaveHint"),
      href: `/${locale}/quality/search`,
      icon: Save,
    },
    {
      title: t("stepCompare"),
      hint: t("stepCompareHint"),
      href: `/${locale}/quality/tests`,
      icon: GitCompare,
    },
    {
      title: t("stepPublish"),
      hint: t("stepPublishHint"),
      href: `/${locale}/quality/publish`,
      icon: QrCode,
    },
    {
      title: t("stepPreview"),
      hint: t("stepPreviewHint"),
      href: `/${locale}/quality/publish`,
      icon: Eye,
    },
  ];

  const quickActions = [
    { label: t("actionSearch"), href: `/${locale}/quality/search`, icon: Search },
    { label: t("actionHistory"), href: `/${locale}/quality/tests`, icon: FlaskConical },
    { label: t("actionPublish"), href: `/${locale}/quality/publish`, icon: QrCode },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("statBatches")}
          value={batches.length}
          hint={t("statBatchesHint")}
          icon={Package}
        />
        <StatCard
          label={t("statTests")}
          value={tests.length}
          hint={t("statTestsHint")}
          icon={FlaskConical}
        />
        <StatCard
          label={t("statAwaiting")}
          value={batches.length - latestByBatch.size}
          hint={t("statAwaitingHint")}
          icon={Search}
        />
        <StatCard
          label={t("statPublished")}
          value={published}
          hint={t("statPublishedHint")}
          icon={QrCode}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassPanel tier="g2" className="p-6">
          <h2 className="text-forest-900 font-display text-base font-semibold">
            {t("workflowTitle")}
          </h2>
          <p className="text-ink-500 mt-1 text-xs">{t("workflowHint")}</p>

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

          <InsertOnlyNote className="mt-5" />
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
            <Link href={`/${locale}/quality/tests`}>
              {t("viewAll")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title={t("recentEmpty")}
            description={t("recentEmptyHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colBatch")}</TableHead>
                <TableHead>{t("colResult")}</TableHead>
                <TableHead>{t("colTestDate")}</TableHead>
                <TableHead>{t("colEntered")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((test) => (
                <TableRow key={test.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/quality/batches/${test.batchId}`}
                      className="text-forest-800 font-medium tabular-nums underline-offset-4 hover:underline"
                    >
                      {test.batchId}
                    </Link>
                    <p className="text-ink-500 text-[11px] tabular-nums">{test.id}</p>
                  </TableCell>
                  <TableCell className="text-ink-700 text-xs tabular-nums">
                    {formatNumber(test.finenessMicron, 1)} {tc("unitMicron")} ·{" "}
                    {formatNumber(test.cleanYieldPct, 1)}
                    {tc("unitPercent")} · {formatNumber(test.impurityPct, 1)}
                    {tc("unitPercent")}
                  </TableCell>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDate(test.testedOn)}
                  </TableCell>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDateTime(test.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassPanel>

      <GlassPanel tier="g2" className="mt-4 p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("awaitingTitle")}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">{t("awaitingHint")}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
            <Link href={`/${locale}/quality/search`}>{t("actionSearch")}</Link>
          </Button>
        </div>

        {awaiting.length === 0 ? (
          <EmptyState
            title={t("awaitingEmpty")}
            description={t("awaitingEmptyHint")}
            className="border-transparent bg-transparent"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colBatch")}</TableHead>
                <TableHead>{tc("supplier")}</TableHead>
                <TableHead>{tc("origin")}</TableHead>
                <TableHead>{tc("registeredOn")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("enterAction")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awaiting.map((batch) => (
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
                  <TableCell className="text-ink-700">
                    {batch.aimag} · {batch.soum}
                  </TableCell>
                  <TableCell className="text-ink-700 tabular-nums">
                    {formatDate(batch.registeredOn)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" className="rounded-field font-semibold">
                      <Link href={`/${locale}/quality/batches/${batch.id}/test`}>
                        <FlaskConical aria-hidden />
                        {t("enterAction")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassPanel>

      <p className="text-ink-500 mt-4 text-xs leading-relaxed">{tc("latestOrderNote")}</p>
    </>
  );
}
