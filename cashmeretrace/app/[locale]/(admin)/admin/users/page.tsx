import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AdminUserList from "@/components/domain/admin/admin-user-list";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.users" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-12 — user directory. */
export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminUserList />;
}
