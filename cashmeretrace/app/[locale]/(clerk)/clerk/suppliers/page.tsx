import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import SupplierList from "@/components/domain/clerk/supplier-list";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clerk.supplier" });
  return { title: `${t("listTitle")} — CashmereTrace`, description: t("listSubtitle") };
}

/** UC-04/UC-07 — supplier registry list. */
export default async function ClerkSuppliersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupplierList />;
}
