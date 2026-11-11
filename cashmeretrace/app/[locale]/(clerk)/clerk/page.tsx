import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ClerkDashboard from "@/components/domain/clerk/clerk-dashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clerk.dashboard" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-04…UC-07 — registration clerk dashboard and workflow entry points. */
export default async function ClerkHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ClerkDashboard />;
}
