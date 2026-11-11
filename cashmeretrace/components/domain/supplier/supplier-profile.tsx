"use client";

import { useTranslations } from "next-intl";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import SupplierStatusBanner from "@/components/domain/supplier/supplier-status-banner";
import { useSession } from "@/components/providers/session-provider";
import { supplierById } from "@/lib/mock/suppliers";
import { formatDate } from "@/lib/format/mn";

/**
 * Нийлүүлэгчийн профайл — read-only own record (task 3, additionally
 * requested view-only screen): registration fields нэр/төрөл/утас/имэйл/
 * аймаг/сум/нэвтрэх нэр + бүртгүүлсэн огноо and the status banner. No edit
 * affordance — supplier edits happen clerk-side (FR-2.6, FR-2.7).
 */
export default function SupplierProfile() {
  const t = useTranslations("supplier.profile");
  const tr = useTranslations("supplier.register");
  const session = useSession();
  const supplier = supplierById(session.supplierId);

  if (!supplier) {
    return (
      <>
        <PageHeader title={t("notFound")} />
        <GlassPanel tier="g2" className="p-6 sm:p-10">
          <EmptyState title={t("notFound")} className="border-transparent bg-transparent" />
        </GlassPanel>
      </>
    );
  }

  const rows: Array<{ label: string; value: string; tabular?: boolean }> = [
    { label: t("field.name"), value: supplier.name },
    { label: t("field.type"), value: tr(`type.${supplier.type}`) },
    { label: t("field.phone"), value: supplier.phone, tabular: true },
    { label: t("field.email"), value: supplier.email },
    { label: t("field.aimag"), value: supplier.aimag },
    { label: t("field.soum"), value: supplier.soum },
    { label: t("field.username"), value: supplier.username },
    { label: t("field.registeredOn"), value: formatDate(supplier.registeredOn), tabular: true },
  ];

  return (
    <>
      <PageHeader title={supplier.name} description={t("subtitle")} />
      <SupplierStatusBanner status={supplier.status} reason={supplier.rejectReason} className="mb-8" />
      <GlassPanel tier="g2" className="p-6 sm:p-10">
        <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <dt className="text-ink-500 text-xs font-medium tracking-[0.08em] uppercase">
                {row.label}
              </dt>
              <dd
                className={
                  "text-ink-900 text-sm leading-relaxed" +
                  (row.tabular ? " tabular-nums" : "")
                }
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <DemoNote className="mt-8">{t("note")}</DemoNote>
      </GlassPanel>
    </>
  );
}
