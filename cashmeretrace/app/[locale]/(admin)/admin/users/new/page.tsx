import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AdminUserForm from "@/components/domain/admin/admin-user-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.form" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-12 — create a staff or supplier account. */
export default async function AdminNewUserPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminUserForm />;
}
