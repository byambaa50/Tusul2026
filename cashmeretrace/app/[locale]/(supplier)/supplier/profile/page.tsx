import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import SupplierProfile from "@/components/domain/supplier/supplier-profile";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "supplier.profile" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  return { title: `${tn("supplier.profile")} — CashmereTrace`, description: t("subtitle") };
}

/**
 * Нийлүүлэгчийн профайл — зөвхөн харах (view-only; header user-menu link).
 * Session binding байхгүй бол AppShell шүүнэ.
 */
export default async function SupplierProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupplierProfile />;
}
