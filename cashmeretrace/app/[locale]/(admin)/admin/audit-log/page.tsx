import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AdminAuditLog from "@/components/domain/admin/admin-audit";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.audit" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-12 — who changed what, and when. */
export default async function AdminAuditPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminAuditLog />;
}
