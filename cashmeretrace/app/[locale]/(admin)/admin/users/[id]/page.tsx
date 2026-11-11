import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AdminUserDetail from "@/components/domain/admin/admin-user-detail";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "admin.detail" });
  return { title: `${t("title")} · ${id} — CashmereTrace`, description: t("subtitle") };
}

/** UC-12 — account detail, status and role assignment. */
export default async function AdminUserDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminUserDetail userId={id} />;
}
