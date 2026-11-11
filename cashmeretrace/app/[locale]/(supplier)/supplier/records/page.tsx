import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import DemoNote from "@/components/domain/shared/demo-note";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import SupplyRegisterForm from "@/components/domain/uc02-supply/supply-register-form";
import SupplyHistory from "@/components/domain/uc02-supply/supply-history";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "supplier.supply" });
  return { title: `${t("formTitle")} — CashmereTrace`, description: t("formHint") };
}

/**
 * Нийлүүлэлт бүртгэх — UC-02 (tasks 4–7) нь дээд хэсгээс нийлүүлэлтийн
 * бүртгэлийн маягт (хэмжээ, аймаг/сум, малын тоо, огноо), 8 дахь — өөрийн
 * нийлүүлэлтийн түүх (task 8) доод хэсгээс.
 */
export default async function SupplierRecordsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "supplier.supply" });
  const th = await getTranslations({ locale, namespace: "supplier.history" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <>
      <PageHeader title={t("formTitle")} description={t("formHint")} />
      <GlassPanel tier="g2" className="p-6 sm:p-8">
        <SupplyRegisterForm />
      </GlassPanel>

      <div className="mt-8">
        <SupplyHistory />
      </div>

      <DemoNote className="mt-6">{th("onlyOwn") + " · " + tc("labels.demoNote")}</DemoNote>
    </>
  );
}
