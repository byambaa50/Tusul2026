import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AdminDashboard from "@/components/domain/admin/admin-dashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.dashboard" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-12 — administrator dashboard. */
export default async function AdminHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminDashboard />;
}
