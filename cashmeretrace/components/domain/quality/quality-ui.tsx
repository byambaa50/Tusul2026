"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import StatusBadge from "@/components/domain/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/format/mn";
import type { Batch, QualityTest } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

/** Static-shell fallback for hydration-guarded quality screens. */
export function QualityPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="bg-ivory-100 h-9 w-72 rounded-field" />
        <Skeleton className="bg-ivory-100 h-4 w-96 rounded-field" />
      </div>
      <Skeleton className="bg-ivory-100 h-20 w-full rounded-block" />
      <Skeleton className="bg-ivory-100 h-48 w-full rounded-block" />
      <Skeleton className="bg-ivory-100 h-48 w-full rounded-block" />
    </div>
  );
}

/** Persistent reminder that quality rows are INSERT-ONLY. */
export function InsertOnlyNote({ className }: { className?: string }) {
  const t = useTranslations("quality.common");
  return (
    <div
      className={cn(
        "border-camel-500/30 bg-camel-500/10 text-brown-600 flex gap-2 rounded-field border p-3 text-xs leading-relaxed",
        className,
      )}
    >
      <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">{t("insertOnlyTitle")}</p>
        <p className="mt-0.5">{t("insertOnlyBody")}</p>
      </div>
    </div>
  );
}

/** Persistent reminder that registration fields are read-only here. */
export function ReadOnlyRegistrationNote({ className }: { className?: string }) {
  const t = useTranslations("quality.common");
  return (
    <div
      className={cn(
        "border-sage-500/30 bg-sage-100/60 text-forest-800 flex gap-2 rounded-field border p-3 text-xs leading-relaxed",
        className,
      )}
    >
      <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">{t("readOnlyTitle")}</p>
        <p className="mt-0.5">{t("readOnlyBody")}</p>
      </div>
    </div>
  );
}

/**
 * Compact read-only batch context strip shared by the detail, test entry,
 * history, compare, publish and preview screens. It deliberately has no
 * links back into supplier/clerk edit screens.
 */
export function QualityBatchStrip({
  batch,
  supplierName,
  latest,
  className,
}: {
  batch: Batch;
  supplierName: string;
  latest?: QualityTest | null;
  className?: string;
}) {
  const t = useTranslations("quality.common");
  const ts = useTranslations("status");

  return (
    <div
      className={cn(
        "border-brown-500/15 bg-ivory-50/60 rounded-field flex flex-wrap items-center gap-x-5 gap-y-2 border p-3 text-xs",
        className,
      )}
    >
      <span className="text-ink-500">
        {t("batch")}:{" "}
        <span className="text-ink-900 font-semibold tabular-nums">{batch.id}</span>
      </span>
      <span className="text-ink-500">
        {t("supplier")}: <span className="text-ink-900">{supplierName}</span>
      </span>
      <span className="text-ink-500">
        {t("amount")}:{" "}
        <span className="text-ink-900 tabular-nums">
          {formatNumber(batch.amountKg, 1)} {t("unitKg")}
        </span>
      </span>
      <span className="text-ink-500">
        {t("origin")}:{" "}
        <span className="text-ink-900">
          {batch.aimag} · {batch.soum}
        </span>
      </span>
      <span className="text-ink-500">
        {t("registeredOn")}:{" "}
        <span className="text-ink-900 tabular-nums">{formatDate(batch.registeredOn)}</span>
      </span>
      <StatusBadge status={`batch-${batch.status}`} label={ts(`batch.${batch.status}`)} />
      {latest ? (
        <span className="text-ink-500">
          {t("latestResult")}:{" "}
          <span className="text-ink-900 tabular-nums">
            {formatNumber(latest.finenessMicron, 1)} {t("unitMicron")} ·{" "}
            {formatDate(latest.testedOn)}
          </span>
        </span>
      ) : (
        <span className="text-ink-500">{t("noResult")}</span>
      )}
      <span className="text-ink-500 ml-auto">{t("readOnlyTitle")}</span>
    </div>
  );
}
