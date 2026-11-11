import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import QualityTestForm from "@/components/domain/quality/quality-test-form";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-08 — manually enter a laboratory result for one batch. */
export default function QualityBatchTestPage({ params }: Props) {
  return (
    <Suspense fallback={<QualityPageSkeleton />}>
      <BatchTestContent params={params} />
    </Suspense>
  );
}

async function BatchTestContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <QualityTestForm batchId={id} />;
}
