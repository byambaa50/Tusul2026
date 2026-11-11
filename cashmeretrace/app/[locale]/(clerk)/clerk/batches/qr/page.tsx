import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import QrCenter from "@/components/domain/clerk/qr-center";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clerk.qr" });
  return { title: `${t("centerTitle")} — CashmereTrace`, description: t("centerSubtitle") };
}

/** UC-06 — QR code centre. */
export default async function ClerkQrCenterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QrCenter />;
}
