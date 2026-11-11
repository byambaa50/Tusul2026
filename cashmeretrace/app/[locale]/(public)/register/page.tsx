import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import RegisterForm from "@/components/domain/uc01-register/register-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "supplier.register" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** Нийлүүлэгч бүртгэл — UC-01 self-registration (no backend, BR-12 pending). */
export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RegisterForm />;
}
