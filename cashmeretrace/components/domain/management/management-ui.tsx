"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Info, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";

import GlassPanel from "@/components/domain/shared/glass-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Static-shell fallback for management client screens. */
export function ManagementPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="bg-ivory-100 h-9 w-72 rounded-field" />
        <Skeleton className="bg-ivory-100 h-4 w-96 rounded-field" />
      </div>
      <Skeleton className="bg-ivory-100 h-28 w-full rounded-block" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="bg-ivory-100 h-32 w-full rounded-block" />
        ))}
      </div>
      <Skeleton className="bg-ivory-100 h-80 w-full rounded-block" />
    </div>
  );
}

/**
 * Management is read-only over suppliers, batches and quality records.
 * Report generation/download is the only permitted write-like action and
 * never alters the registry.
 */
export function ManagementReadOnlyNote({ className }: { className?: string }) {
  const t = useTranslations("management.common");
  return (
    <div
      className={cn(
        "border-sage-500/30 bg-sage-100/60 text-olive-600 flex gap-2 rounded-field border p-3 text-xs leading-relaxed",
        className,
      )}
    >
      <LockKeyhole aria-hidden className="text-olive-500 mt-0.5 size-4 shrink-0" />
      <p>
        <span className="text-forest-800 font-medium">{t("readOnlyTitle")}</span>{" "}
        {t("readOnlyBody")}
      </p>
    </div>
  );
}

export function ManagementStatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <GlassPanel tier="g2" className={cn("relative overflow-hidden p-5", className)}>
      <span
        aria-hidden
        className="from-sage-400/50 to-forest-700/20 absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-500 text-xs font-medium tracking-[0.08em] uppercase">
          {label}
        </p>
        {Icon ? (
          <span
            aria-hidden
            className="bg-sage-100 text-olive-600 grid size-9 shrink-0 place-items-center rounded-full"
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="text-forest-900 mt-2 font-display text-3xl font-semibold tabular-nums">
        {value}
      </p>
      {hint ? <p className="text-ink-500 mt-1 text-xs leading-relaxed">{hint}</p> : null}
    </GlassPanel>
  );
}

export function ManagementChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel tier="g2" className={cn("min-w-0 p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-forest-900 font-display text-base font-semibold">{title}</h2>
          {description ? (
            <p className="text-ink-500 mt-1 max-w-xl text-xs leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </GlassPanel>
  );
}

export function ManagementMiniMetric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-brown-500/15 bg-linen/60 rounded-field min-w-0 border p-3.5",
        className,
      )}
    >
      <p className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-forest-900 mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-ink-500 mt-0.5 text-[11px]">{hint}</p> : null}
    </div>
  );
}

export function ManagementInfoNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-camel-500/25 bg-camel-500/10 text-brown-600 flex gap-2 rounded-field border p-3 text-xs leading-relaxed",
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
