import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Small KPI surface used by the dashboard and QR centre. */
export function StatCard({
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
    <GlassPanel tier="g2" className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-500 text-xs font-medium tracking-[0.08em] uppercase">
          {label}
        </p>
        {Icon ? (
          <span
            aria-hidden
            className="bg-sage-100 text-olive-600 grid size-9 place-items-center rounded-full"
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

/** Label/value pair in detail panels. */
export function DetailItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-ink-500 text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-ink-900 mt-1 text-sm leading-relaxed break-words">{children}</dd>
    </div>
  );
}

/** UC-07 E2 / UC-06 E1 style missing-record panel. */
export function RecordNotFound({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState title={title} description={description} className="w-full" />
      <Button asChild variant="outline" className="bg-linen/60 rounded-field">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}

/** Static-shell fallback for dynamic clerk routes. */
export function ClerkPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="bg-ivory-100 h-9 w-72 rounded-field" />
        <Skeleton className="bg-ivory-100 h-4 w-96 rounded-field" />
      </div>
      <Skeleton className="bg-ivory-100 h-48 w-full rounded-block" />
      <Skeleton className="bg-ivory-100 h-48 w-full rounded-block" />
    </div>
  );
}
