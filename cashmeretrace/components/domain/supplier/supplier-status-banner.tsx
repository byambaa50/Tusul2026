"use client";

import { useTranslations } from "next-intl";

import StatusBadge, { type TraceStatus } from "@/components/domain/shared/status-badge";
import type { SupplierStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type Tone = { status: TraceStatus; className: string };

const toneByStatus: Record<SupplierStatus, Tone> = {
  active: { status: "supplier-active", className: "border-sage-500/30 bg-sage-100/70" },
  pending: { status: "supplier-pending", className: "border-camel-500/30 bg-camel-500/10" },
  rejected: { status: "supplier-rejected", className: "border-terracotta-500/30 bg-terracotta-500/10" },
  locked: { status: "supplier-locked", className: "border-slate-400/30 bg-slate-300/50" },
};

type Props = {
  status: SupplierStatus;
  /** UC-04 reject reason — extra line for rejected accounts. */
  reason?: string | null;
  className?: string;
};

/**
 * Registration-status disclosure (task 10): one component per
 * «Баталгаажуулалт хүлээгдэж буй / Идэвхтэй / Татгалзсан / Түр түгжигдсэн»
 * with the PDF status wording and the state-specific guidance (banner.*),
 * reused on the dashboard, profile and login E3 block.
 */
export default function SupplierStatusBanner({ status, reason, className }: Props) {
  const t = useTranslations("supplier.banner");
  const ts = useTranslations("status");
  const tone = toneByStatus[status];

  return (
    <section
      className={cn(
        "rounded-block border p-4 sm:p-5",
        tone.className,
        className,
      )}
      aria-label={ts(`supplier.${status}`)}
    >
      <header className="flex items-center gap-2">
        <StatusBadge status={tone.status} label={ts(`supplier.${status}`)} />
      </header>
      <p className="text-ink-700 mt-2.5 text-sm leading-relaxed">{t(status)}</p>
      {status === "rejected" && reason ? (
        <p className="text-ink-900 mt-1.5 text-sm leading-relaxed">
          <span className="font-medium">{t("reasonLabel")}</span> {reason}
        </p>
      ) : null}
    </section>
  );
}
