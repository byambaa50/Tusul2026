import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import SupplierHome from "@/components/domain/supplier/supplier-home";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const tn = await getTranslations({ locale, namespace: "nav" });
  const t = await getTranslations({ locale, namespace: "supplier.dashboard" });
  return {
    title: `${tn("supplier.home")} — CashmereTrace`,
    description: t("subtitle"),
  };
}

/** Нийлүүлэгчийн бүс landing — dashboard (task 1) + төлөвийн banner (task 10). */
export default async function SupplierDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupplierHome />;
}
