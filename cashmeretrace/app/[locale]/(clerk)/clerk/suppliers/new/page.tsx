import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import SupplierForm from "@/components/domain/clerk/supplier-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clerk.supplier" });
  return { title: `${t("createTitle")} — CashmereTrace`, description: t("createSubtitle") };
}

/** UC-04 — register a supplier. */
export default async function ClerkSupplierNewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupplierForm />;
}
