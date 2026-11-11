import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AdminApprovals from "@/components/domain/admin/admin-approvals";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.approvals" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-12 — approve or reject pending supplier registrations. */
export default async function AdminApprovalsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminApprovals />;
}
