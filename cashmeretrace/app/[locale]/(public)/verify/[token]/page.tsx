import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { VerifyResult, VerifySkeleton } from "@/components/domain/verify/verify-page";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verify" });
  return { title: `${t("metaTitle")} — CashmereTrace`, description: t("metaDescription") };
}

/** Token route for a scanned QR (UC-13). Anonymous; no app shell. */
export default function VerifyTokenPage({ params }: Props) {
  return (
    <Suspense fallback={<VerifySkeleton />}>
      <VerifyTokenContent params={params} />
    </Suspense>
  );
}

async function VerifyTokenContent({ params }: Pick<Props, "params">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <VerifyResult token={token} />;
}
