import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ManagementReportPreview from "@/components/domain/management/management-report-preview";
import { ManagementPageSkeleton } from "@/components/domain/management/management-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "management.preview" });
  return {
    title: `${t("title")} · ${id} — CashmereTrace`,
    description: t("subtitle"),
  };
}

/** UC-11 — printable preview of a generated report snapshot. */
export default function ManagementReportPreviewPage({ params }: Props) {
  return (
    <Suspense fallback={<ManagementPageSkeleton />}>
      <ReportPreviewContent params={params} />
    </Suspense>
  );
}

async function ReportPreviewContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ManagementReportPreview reportId={id} />;
}
