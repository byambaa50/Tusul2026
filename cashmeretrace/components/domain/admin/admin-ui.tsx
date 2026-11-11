"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

import GlassPanel from "@/components/domain/shared/glass-panel";
import StatusBadge, { type TraceStatus } from "@/components/domain/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditChange } from "@/lib/mock/admin";
import type { Role } from "@/lib/constants/nav";
import type { SupplierStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const statusTone: Record<SupplierStatus, TraceStatus> = {
  pending: "supplier-pending",
  active: "supplier-active",
  rejected: "supplier-rejected",
  locked: "supplier-locked",
};

export function AdminPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="bg-ivory-100 h-9 w-72 rounded-field" />
        <Skeleton className="bg-ivory-100 h-4 w-96 rounded-field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="bg-ivory-100 h-28 w-full rounded-block" />
        ))}
      </div>
    </div>
  );
}

export function AdminOnlyNote({ className }: { className?: string }) {
  const t = useTranslations("admin.common");
  return (
    <div
      className={cn(
        "border-sage-500/30 bg-sage-100/60 text-olive-600 flex gap-2 rounded-field border p-3 text-xs leading-relaxed",
        className,
      )}
    >
      <Shield aria-hidden className="text-olive-500 mt-0.5 size-4 shrink-0" />
      <p>{t("adminOnly")}</p>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <GlassPanel tier="g2" className="relative overflow-hidden p-5">
      <span
        aria-hidden
        className="from-sage-400/50 to-forest-700/20 absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-500 text-xs font-medium tracking-[0.08em] uppercase">{label}</p>
        {Icon ? (
          <span
            aria-hidden
            className="bg-sage-100 text-olive-600 grid size-9 shrink-0 place-items-center rounded-full"
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="text-forest-900 mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-ink-500 mt-1 text-xs leading-relaxed">{hint}</p> : null}
    </GlassPanel>
  );
}

export function AccountStatusBadge({ status }: { status: SupplierStatus }) {
  const t = useTranslations("status.supplier");
  return <StatusBadge status={statusTone[status]} label={t(status)} />;
}

export function RoleLabel({ role }: { role: Role }) {
  const t = useTranslations("nav.roles");
  return <>{t(role)}</>;
}

function changeValue(field: string, value: string | null, empty: string, roleName: (role: string) => string, statusName: (status: string) => string) {
  if (!value) return empty;
  if (field === "status") return statusName(value);
  if (field === "role" || field === "account") return roleName(value);
  return value;
}

export function AuditChangeList({ changes }: { changes: AuditChange[] }) {
  const t = useTranslations("admin.audit");
  const tc = useTranslations("admin.common");
  const tr = useTranslations("nav.roles");
  const ts = useTranslations("status.supplier");

  return (
    <ul className="flex flex-col gap-1">
      {changes.map((change) => {
        const label = t(`fields.${change.field}`);
        const from = changeValue(change.field, change.from, tc("emptyValue"), (role) => tr(role as Role), (status) => ts(status as SupplierStatus));
        const to = changeValue(change.field, change.to, tc("emptyValue"), (role) => tr(role as Role), (status) => ts(status as SupplierStatus));
        if (change.field === "account" && change.from === null && change.to) {
          return (
            <li key={`${change.field}-${change.to}`} className="text-ink-700 text-xs leading-relaxed">
              {t("createdAs", { role: tr(change.to as Role) })}
            </li>
          );
        }
        return (
          <li key={`${change.field}-${change.from}-${change.to}`} className="text-ink-700 text-xs leading-relaxed">
            <span className="text-forest-800 font-medium">{label}</span>
            {": "}
            <span className="tabular-nums">{from}</span>
            {" → "}
            <span className="text-forest-900 font-medium">{to}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSection({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel tier="g2" className={cn("p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-forest-900 font-display text-base font-semibold">{title}</h2>
          {description ? (
            <p className="text-ink-500 mt-1 max-w-2xl text-xs leading-relaxed">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </GlassPanel>
  );
}
